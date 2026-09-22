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

async function readError(response: Response, provider: string): Promise<Error> {
  const data = await response.json().catch(() => ({})) as {
    error?: { message?: string } | string;
    message?: string;
  };
  const nested = typeof data.error === "object" ? data.error?.message : data.error;
  if (response.status === 429) {
    return new Error(`${provider} đang giới hạn tần suất yêu cầu (HTTP 429). Hãy thử lại sau ít giây.`);
  }
  if (response.status === 503) {
    return new Error(`${provider} đang quá tải tạm thời (HTTP 503). Hãy thử lại sau vài giây hoặc chọn model khác trong Cài đặt AI.`);
  }
  const detail = nested || data.message || `${provider} HTTP ${response.status}`;
  return new Error(detail);
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

const TRANSIENT_AI_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const TRANSIENT_RETRY_DELAYS_MS = [600, 1500];

async function fetchWithTransientRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<Response> {
  let response = await fetchWithTimeout(input, init, fetchImpl);
  for (const delay of TRANSIENT_RETRY_DELAYS_MS) {
    if (!TRANSIENT_AI_STATUSES.has(response.status)) break;
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
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
