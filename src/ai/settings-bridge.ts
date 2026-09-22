import {
  AI_SETTINGS_STORAGE_KEY,
  clearAiSettings,
  loadAiSettings,
  saveAiSettings,
  type StorageLike,
  type StoredAiSettings,
} from "./settings";

export { AI_SETTINGS_STORAGE_KEY } from "./settings";

export const AI_SETTINGS_UPDATED_EVENT = "tvci-ai-settings-updated";

export interface AiSettingsSavedMessage {
  type: "ai_settings_saved";
  settings: unknown;
}

export interface AiSettingsClearedMessage {
  type: "ai_settings_cleared";
}

export interface AiSettingsEventTarget {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  dispatchEvent(event: Event): boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function validateAiSettings(value: unknown): StoredAiSettings {
  if (!isRecord(value)) throw new Error("Cấu hình AI không hợp lệ.");
  const provider = value.provider === "gemini" || value.provider === "openai" ? value.provider : null;
  const model = typeof value.model === "string" ? value.model.trim() : "";
  const apiKey = typeof value.apiKey === "string" ? value.apiKey.trim() : "";
  if (!provider || !model || !apiKey) throw new Error("Cấu hình AI phải có nhà cung cấp, model và API key.");
  return { provider, model, apiKey };
}

export function parseAiSettingsSavedMessage(value: unknown): StoredAiSettings {
  if (!isRecord(value) || value.type !== "ai_settings_saved") {
    throw new Error("Thông điệp lưu cài đặt AI không hợp lệ.");
  }
  return validateAiSettings(value.settings);
}

function makeCustomEvent(type: string, detail: unknown): Event {
  if (typeof CustomEvent === "function") return new CustomEvent(type, { detail });
  const event = new Event(type);
  Object.defineProperty(event, "detail", { value: detail });
  return event;
}

/** Parent-side persistence for a dialog message. This function intentionally has no logging. */
export function applyAiSettingsSavedMessage(
  message: unknown,
  storage: StorageLike = localStorage,
  eventTarget?: AiSettingsEventTarget,
): StoredAiSettings {
  const settings = parseAiSettingsSavedMessage(message);
  saveAiSettings(settings, storage);
  if (eventTarget) {
    eventTarget.dispatchEvent(makeCustomEvent(AI_SETTINGS_UPDATED_EVENT, settings));
  }
  return settings;
}

/** Parent-side clear handling. It emits the same event used for live AI saves. */
export function applyAiSettingsClearedMessage(
  message: unknown,
  storage: StorageLike = localStorage,
  eventTarget?: AiSettingsEventTarget,
): StoredAiSettings {
  if (!isRecord(message) || message.type !== "ai_settings_cleared") {
    throw new Error("Thông điệp xóa cài đặt AI không hợp lệ.");
  }
  clearAiSettings(storage);
  const settings = loadAiSettings(storage);
  if (eventTarget) {
    eventTarget.dispatchEvent(makeCustomEvent(AI_SETTINGS_UPDATED_EVENT, settings));
  }
  return settings;
}

export function subscribeToAiSettings(
  onSettings: (settings: StoredAiSettings) => void,
  eventTarget: AiSettingsEventTarget = window,
  storage: StorageLike = localStorage,
): () => void {
  const refresh = () => onSettings(loadAiSettings(storage));
  const onStorage = (event: Event) => {
    const storageEvent = event as StorageEvent;
    if (storageEvent.key === AI_SETTINGS_STORAGE_KEY || storageEvent.key === null) refresh();
  };
  const onCustom = () => refresh();
  refresh();
  eventTarget.addEventListener("storage", onStorage);
  eventTarget.addEventListener(AI_SETTINGS_UPDATED_EVENT, onCustom);
  return () => {
    eventTarget.removeEventListener("storage", onStorage);
    eventTarget.removeEventListener(AI_SETTINGS_UPDATED_EVENT, onCustom);
  };
}
