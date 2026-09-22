import {
  loadSavedSettings,
  saveDefaultSettings,
  type DocumentSettings,
} from "./document-settings";

export const DOCUMENT_SETTINGS_UPDATED_EVENT = "tvci-document-settings-updated";

export interface DocumentSettingsEventTarget {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  dispatchEvent(event: Event): boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function makeCustomEvent(type: string, detail: unknown): Event {
  if (typeof CustomEvent === "function") return new CustomEvent(type, { detail });
  const event = new Event(type);
  Object.defineProperty(event, "detail", { value: detail });
  return event;
}

export function applyDocumentSettingsDefaultMessage(
  message: unknown,
  persist: (settings: DocumentSettings) => void = saveDefaultSettings,
  eventTarget: DocumentSettingsEventTarget = window,
): DocumentSettings {
  if (!isRecord(message) || message.type !== "save_settings_default" || !isRecord(message.settings)) {
    throw new Error("Thông điệp lưu thiết lập văn bản không hợp lệ.");
  }
  const settings = message.settings as unknown as DocumentSettings;
  persist(settings);
  eventTarget.dispatchEvent(makeCustomEvent(DOCUMENT_SETTINGS_UPDATED_EVENT, settings));
  return settings;
}

export function subscribeToDocumentSettings(
  onSettings: (settings: DocumentSettings) => void,
  eventTarget: DocumentSettingsEventTarget = window,
): () => void {
  const refresh = () => onSettings(loadSavedSettings());
  const onUpdated = () => refresh();
  eventTarget.addEventListener(DOCUMENT_SETTINGS_UPDATED_EVENT, onUpdated);
  return () => eventTarget.removeEventListener(DOCUMENT_SETTINGS_UPDATED_EVENT, onUpdated);
}
