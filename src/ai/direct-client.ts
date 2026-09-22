import type { AiAttachment } from "./attachment.service";

export type AiAction = "rewrite" | "shorten" | "expand" | "formal" | "check";
export type AiProviderName = "openai" | "gemini";

export interface AiRequest {
  action: AiAction;
  text: string;
  instruction?: string;
}

export interface AiSettings {
  provider: AiProviderName;
  model: string;
  apiKey: string;
}

const ACTION_INSTRUCTION: Record<AiAction, string> = {
  rewrite: "Viết lại đoạn văn rõ ràng, giữ nguyên ý và dữ kiện.",
  shorten: "Rút gọn đoạn văn, không làm mất thông tin quan trọng.",
  expand: "Mở rộng đoạn văn hợp lý, không bịa thêm dữ kiện.",
  formal: "Viết lại theo văn phong hành chính, trang trọng và chính xác.",
  check: "Rà soát lỗi diễn đạt, chính tả và tính nhất quán; trả về bản đã hiệu chỉnh.",
};

export function buildAiPrompt(request: AiRequest): string {
  return [
    "Bạn là trợ lý soạn thảo văn bản của TRUNG TÂM THỬ NGHIỆM - KIỂM ĐỊNH CÔNG NGHIỆP. Không tự bịa số hiệu, ngày tháng, tên tổ chức, tiêu chuẩn hoặc dữ kiện.",
    ACTION_INSTRUCTION[request.action],
    request.instruction?.trim() ? `Yêu cầu thêm: ${request.instruction.trim()}` : "",
    "Văn bản:",
    request.text.trim(),
  ].filter(Boolean).join("\n\n");
}

interface ProviderErrorInfo {
  message: string;
  status?: string;
  reason?: string;
  quotaMetric?: string;
  retryDelayMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseDurationMs(value: unknown): number | undefined {
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d+(?:\.\d+)?)s$/i);
    return match ? Math.max(0, Math.round(Number(match[1]) * 1000)) : undefined;
  }
  if (!isRecord(value)) return undefined;
  const seconds = Number(value.seconds ?? 0);
  const nanos = Number(value.nanos ?? 0);
  if (!Number.isFinite(seconds) || !Number.isFinite(nanos)) return undefined;
  return Math.max(0, Math.round(seconds * 1000 + nanos / 1_000_000));
}

function parseRetryAfterHeader(response: Response): number | undefined {
  const value = response.headers?.get("retry-after")?.trim();
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds * 1000));
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : undefined;
}

async function readProviderErrorInfo(response: Response): Promise<ProviderErrorInfo> {
  let data: unknown = {};
  try {
    // Peeking through clone() keeps the original response body available to the
    // caller. Tests may provide a minimal Response-like object, so fall back to
    // reading it directly when clone() is not available.
    const source = typeof response.clone === "function" ? response.clone() : response;
    data = await source.json();
  } catch {
    data = {};
  }

  const root = isRecord(data) ? data : {};
  const error = isRecord(root.error) ? root.error : {};
  const details = Array.isArray(error.details) ? error.details.filter(isRecord) : [];
  const errorInfo = details.find((item) => String(item["@type"] || "").endsWith("ErrorInfo"));
  const quotaFailure = details.find((item) => String(item["@type"] || "").endsWith("QuotaFailure"));
  const retryInfo = details.find((item) => String(item["@type"] || "").endsWith("RetryInfo"));
  const metadata = isRecord(errorInfo?.metadata) ? errorInfo.metadata : {};
  const violations = Array.isArray(quotaFailure?.violations) ? quotaFailure.violations.filter(isRecord) : [];
  const firstViolation = violations[0];
  const nestedMessage = typeof error.message === "string" ? error.message : undefined;
  const topMessage = typeof root.message === "string" ? root.message : undefined;
  const retryDelayMs = parseRetryAfterHeader(response)
    ?? parseDurationMs(retryInfo?.retryDelay);

  return {
    message: nestedMessage || topMessage || `${response.status}`,
    status: typeof error.status === "string" ? error.status : undefined,
    reason: typeof metadata.reason === "string" ? metadata.reason : undefined,
    quotaMetric: typeof firstViolation?.quotaMetric === "string" ? firstViolation.quotaMetric : undefined,
    retryDelayMs,
  };
}

function isQuotaError(info: ProviderErrorInfo): boolean {
  const text = [info.status, info.reason, info.message, info.quotaMetric].filter(Boolean).join(" ").toLowerCase();
  return /resource_exhausted|quota|rate[_ -]?limit|too many requests/.test(text);
}

function formatRetryDelay(delayMs: number): string {
  const seconds = Math.max(1, Math.ceil(delayMs / 1000));
  return ` Hệ thống yêu cầu chờ khoảng ${seconds} giây trước khi thử lại.`;
}

async function readError(response: Response, provider: string): Promise<Error> {
  const info = await readProviderErrorInfo(response);
  try {
    console.warn("[TVCI AI] provider request failed", {
      provider,
      httpStatus: response.status,
      apiStatus: info.status,
      reason: info.reason,
      quotaMetric: info.quotaMetric,
      retryDelayMs: info.retryDelayMs,
    });
  } catch {
    // Console diagnostics must never mask the provider error.
  }

  if (response.status === 429) {
    if (isQuotaError(info)) {
      const metric = info.quotaMetric ? ` (quota: ${info.quotaMetric})` : "";
      return new Error(`${provider} đã chạm hạn mức quota của project/model${metric} (HTTP 429). Retry thêm ngay lúc này sẽ không giải quyết được; hãy chờ quota reset, giảm tần suất/kích thước yêu cầu, đổi model hoặc kiểm tra AI Studio > Usage & billing.${info.retryDelayMs !== undefined ? formatRetryDelay(info.retryDelayMs) : ""}`);
    }
    return new Error(`${provider} đang giới hạn tần suất yêu cầu (HTTP 429).${info.retryDelayMs !== undefined ? formatRetryDelay(info.retryDelayMs) : " Hãy chờ rồi thử lại."}`);
  }
  if (response.status === 503) {
    return new Error(`${provider} đang quá tải tạm thời (HTTP 503). Đã thử lại với backoff; hãy chờ vài giây hoặc chọn model khác trong Cài đặt AI.`);
  }
  return new Error(info.message || `${provider} HTTP ${response.status}`);
}

export const AI_REQUEST_TIMEOUT_MS = 45_000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<Response> {
  const controller = typeof AbortController === "undefined" ? undefined : new AbortController();
  const timeoutId = controller ? setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS) : undefined;
  try {
    return await fetchImpl(input, controller ? { ...init, signal: controller.signal } : init);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Dịch vụ AI phản hồi quá lâu (timeout). Hãy thử lại.");
    }
    throw error;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

const TRANSIENT_AI_STATUSES = new Set([408, 500, 502, 503, 504]);
const TRANSIENT_RETRY_DELAYS_MS = [2_000, 5_000, 10_000];
const MAX_SERVER_RETRY_DELAY_MS = 60_000;

async function fetchWithTransientRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<Response> {
  let response = await fetchWithTimeout(input, init, fetchImpl);
  let retryCount = 0;
  while (true) {
    const info = response.status === 429 || TRANSIENT_AI_STATUSES.has(response.status)
      ? await readProviderErrorInfo(response)
      : undefined;
    const retryable429 = response.status === 429
      && info?.retryDelayMs !== undefined
      && info.retryDelayMs <= MAX_SERVER_RETRY_DELAY_MS;
    const retryable5xx = TRANSIENT_AI_STATUSES.has(response.status);
    if ((!retryable429 && !retryable5xx) || retryCount >= (retryable429 ? 1 : TRANSIENT_RETRY_DELAYS_MS.length)) break;
    const delay = Math.min(
      info?.retryDelayMs ?? TRANSIENT_RETRY_DELAYS_MS[Math.min(retryCount, TRANSIENT_RETRY_DELAYS_MS.length - 1)],
      MAX_SERVER_RETRY_DELAY_MS,
    );
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
    retryCount += 1;
    response = await fetchWithTimeout(input, init, fetchImpl);
  }
  return response;
}

function extractOpenAiText(data: unknown): string {
  const response = data as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    choices?: Array<{ message?: { content?: string } }>;
  };
  const direct = response.output_text?.trim();
  if (direct) return direct;
  const choice = response.choices?.[0]?.message?.content?.trim();
  if (choice) return choice;
  return response.output?.flatMap((item) => item.content || [])
    .filter((part) => !part.type || part.type === "output_text")
    .map((part) => part.text || "")
    .join("")
    .trim() || "";
}

function extractGeminiText(data: unknown): string {
  const response = data as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };
  const text = response.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
  if (text) return text;
  if (response.candidates?.[0]?.finishReason && response.candidates[0].finishReason !== "STOP") {
    throw new Error(`Gemini dừng phản hồi vì lý do: ${response.candidates[0].finishReason}`);
  }
  if (response.promptFeedback?.blockReason) {
    throw new Error(`Nội dung bị chặn bởi bộ lọc an toàn Gemini (${response.promptFeedback.blockReason}).`);
  }
  return "";
}

export async function requestAiPromptDirect(
  settings: AiSettings,
  prompt: string,
  fetchImpl: typeof fetch = fetch,
  attachments?: AiAttachment[],
): Promise<string> {
  const apiKey = settings.apiKey.trim();
  const rawModel = settings.model.trim();
  if (!apiKey) throw new Error("Chưa nhập API key.");
  if (!rawModel) throw new Error("Chưa nhập model AI.");
  if (!prompt.trim()) throw new Error("Prompt AI không được để trống.");

  let finalPrompt = prompt;
  if (attachments && attachments.length > 0) {
    const textAttachments = attachments.filter((a) => a.extractedText?.trim());
    if (textAttachments.length > 0) {
      const extraTexts = textAttachments
        .map((a) => `[TÀI LIỆU NGUỒN TỪ TỆP: ${a.name}]\n${a.extractedText}\n[HẾT TỆP: ${a.name}]`)
        .join("\n\n");
      finalPrompt = `${prompt}\n\n---\nCÁC TÀI LIỆU NGUỒN ĐÍNH KÈM:\n${extraTexts}\n---`;
    }
  }

  let response: Response;
  try {
    if (settings.provider === "openai") {
      const imageAttachments = (attachments || []).filter((a) => a.type === "image" && a.dataUrl);
      const userContent = imageAttachments.length > 0
        ? [
            { type: "text", text: finalPrompt },
            ...imageAttachments.map((a) => ({
              type: "image_url",
              image_url: { url: a.dataUrl! },
            })),
          ]
        : finalPrompt;

      response = await fetchWithTransientRetry("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: rawModel,
          messages: [
            {
              role: "user",
              content: userContent,
            },
          ],
        }),
      }, fetchImpl);
      if (!response.ok) throw await readError(response, "OpenAI");
      const output = extractOpenAiText(await response.json());
      if (!output) throw new Error("OpenAI không trả về nội dung văn bản.");
      return output;
    }

    const model = rawModel.replace(/^models\//, "");

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      { text: finalPrompt },
    ];
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        if (att.base64 && (att.type === "image" || att.type === "pdf")) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.base64,
            },
          });
        }
      }
    }

    response = await fetchWithTransientRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({ contents: [{ parts }] }),
      },
      fetchImpl,
    );
    if (!response.ok) throw await readError(response, "Gemini");
    const output = extractGeminiText(await response.json());
    if (!output) throw new Error("Gemini không trả về nội dung văn bản.");
    return output;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Không thể kết nối dịch vụ AI.");
  }
}

export async function requestAiDirect(
  settings: AiSettings,
  request: AiRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  if (!request.text.trim()) throw new Error("Chưa có văn bản được chọn.");
  return requestAiPromptDirect(settings, buildAiPrompt(request), fetchImpl);
}
