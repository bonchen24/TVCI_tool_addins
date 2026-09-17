import type { AiProviderName } from "./direct-client";

export interface ModelDiscoveryResult {
  models: string[];
  recommended: string;
}

export const KNOWN_MODELS: Record<AiProviderName, string[]> = {
  gemini: [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-8b",
  ],
  openai: [
    "gpt-4o-mini",
    "gpt-4o",
    "o3-mini",
    "o1-mini",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
  ],
};

const OPENAI_PREFERRED = [
  "gpt-4o-mini",
  "gpt-4o",
  "o3-mini",
  "o1-mini",
  "o1",
  "gpt-4-turbo",
  "gpt-4",
  "gpt-3.5-turbo",
];

const GEMINI_PREFERRED = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-8b",
];

function isOpenAiTextModel(id: string): boolean {
  const lowered = id.toLowerCase();
  if (!lowered.startsWith("gpt-") && !/^o\d/.test(lowered)) return false;
  return ![
    "image", "realtime", "audio", "transcribe", "tts", "embedding",
    "moderation", "search", "codex", "computer-use", "chatgpt",
  ].some((token) => lowered.includes(token));
}

function isGeminiTextGenerationModel(model: { name?: string; supportedGenerationMethods?: string[]; supportedActions?: string[] }): boolean {
  const name = (model.name || "").replace(/^models\//, "").toLowerCase();
  const actions = [...(model.supportedGenerationMethods || []), ...(model.supportedActions || [])];
  if (!actions.includes("generateContent")) return false;
  return !["image", "embedding", "embed", "live", "tts", "transcribe", "audio", "lyria"].some((token) => name.includes(token));
}

function orderByPreference(models: string[], preferred: string[]): string[] {
  return [...models].sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.localeCompare(b);
  });
}

export function pickPreferredModel(provider: AiProviderName, models: string[]): string {
  if (!models.length) return "";
  const preferred = provider === "openai" ? OPENAI_PREFERRED : GEMINI_PREFERRED;
  return preferred.find((model) => models.includes(model)) || models[0];
}

export function chooseConfiguredModel(requested: string, available: string[], recommended: string): string {
  const selected = requested.trim();
  return selected && available.includes(selected) ? selected : recommended;
}

async function readApiError(response: Response, provider: string): Promise<Error> {
  const data = await response.json().catch(() => ({})) as { error?: { message?: string } | string; message?: string };
  const nested = typeof data.error === "object" ? data.error?.message : data.error;
  return new Error(nested || data.message || `${provider} HTTP ${response.status}`);
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  fetchImpl: typeof fetch,
): Promise<Response> {
  const controller = typeof AbortController === "undefined" ? undefined : new AbortController();
  const timeoutId = controller ? setTimeout(() => controller.abort(), 45_000) : undefined;
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

export async function discoverAvailableModels(
  provider: AiProviderName,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ModelDiscoveryResult> {
  const key = apiKey.trim();
  if (!key) throw new Error("Chưa nhập API key.");

  if (provider === "openai") {
    const response = await fetchWithTimeout("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    }, fetchImpl);
    if (!response.ok) throw await readApiError(response, "OpenAI");
    const data = await response.json() as { data?: Array<{ id?: string }> };
    const models = orderByPreference(
      (data.data || []).map((item) => item.id || "").filter((id) => id && isOpenAiTextModel(id)),
      OPENAI_PREFERRED,
    );
    if (!models.length) throw new Error("API key OpenAI hợp lệ nhưng không tìm thấy model text phù hợp.");
    return { models, recommended: pickPreferredModel(provider, models) };
  }

  const response = await fetchWithTimeout("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
    headers: { "x-goog-api-key": key },
  }, fetchImpl);
  if (!response.ok) throw await readApiError(response, "Gemini");
  const data = await response.json() as {
    models?: Array<{ name?: string; supportedGenerationMethods?: string[]; supportedActions?: string[] }>;
  };
  const models = orderByPreference(
    (data.models || [])
      .filter(isGeminiTextGenerationModel)
      .map((item) => (item.name || "").replace(/^models\//, ""))
      .filter(Boolean),
    GEMINI_PREFERRED,
  );
  if (!models.length) throw new Error("API key Gemini hợp lệ nhưng không tìm thấy model generateContent phù hợp.");
  return { models, recommended: pickPreferredModel(provider, models) };
}
