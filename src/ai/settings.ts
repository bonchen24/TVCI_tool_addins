export type AiProviderName = "openai" | "gemini";

export interface StoredAiSettings {
  provider: AiProviderName;
  model: string;
  apiKey: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY = "tvci.wordtools.ai.settings.v1";

export function defaultModelFor(provider: AiProviderName): string {
  return provider === "openai" ? "gpt-4o-mini" : "gemini-2.0-flash";
}

export function loadAiSettings(storage: StorageLike = localStorage): StoredAiSettings {
  const fallback: StoredAiSettings = { provider: "openai", model: defaultModelFor("openai"), apiKey: "" };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<StoredAiSettings>;
    const provider: AiProviderName = parsed.provider === "gemini" ? "gemini" : "openai";
    let model = typeof parsed.model === "string" && parsed.model.trim() ? parsed.model.trim() : defaultModelFor(provider);
    if (provider === "gemini" && model.includes("2.5")) {
      model = defaultModelFor("gemini");
    }
    return {
      provider,
      model,
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
    };
  } catch {
    return fallback;
  }
}

export function saveAiSettings(settings: StoredAiSettings, storage: StorageLike = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({
    provider: settings.provider,
    model: settings.model.trim(),
    apiKey: settings.apiKey.trim(),
  }));
}

export function clearAiSettings(storage: StorageLike = localStorage): void {
  storage.removeItem(STORAGE_KEY);
}
