import {
  AI_SETTINGS_STORAGE_KEY,
  applyAiSettingsClearedMessage,
  applyAiSettingsSavedMessage,
  subscribeToAiSettings,
  type AiSettingsEventTarget,
} from "../../src/ai/settings-bridge";
import { loadAiSettings, type StorageLike, type StoredAiSettings } from "../../src/ai/settings";

function makeStorage(initial: Record<string, string> = {}): StorageLike {
  const values = { ...initial };
  return {
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => { values[key] = value; },
    removeItem: (key) => { delete values[key]; },
  };
}

class FakeEventTarget implements AiSettingsEventTarget {
  private listeners = new Map<string, Set<(event: Event) => void>>();

  addEventListener(type: string, listener: (event: Event) => void): void {
    const handlers = this.listeners.get(type) ?? new Set<(event: Event) => void>();
    handlers.add(listener);
    this.listeners.set(type, handlers);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) listener(event);
    return true;
  }
}

function event(type: string, detail?: unknown): Event {
  const result = new Event(type);
  if (detail !== undefined) Object.defineProperty(result, "detail", { value: detail });
  return result;
}

describe("AI settings bridge", () => {
  it("saves and loads provider, model, and API key", () => {
    const storage = makeStorage();
    const settings: StoredAiSettings = { provider: "gemini", model: "gemini-2.5-flash", apiKey: "secret-key" };

    applyAiSettingsSavedMessage({ type: "ai_settings_saved", settings }, storage);

    expect(loadAiSettings(storage)).toEqual(settings);
    expect(storage.getItem(AI_SETTINGS_STORAGE_KEY)).toContain("gemini-2.5-flash");
  });

  it("persists a valid parent message without creating a log payload containing the API key", () => {
    const storage = makeStorage();
    const target = new FakeEventTarget();
    const settings = { provider: "gemini", model: "gemini-3.1-flash", apiKey: "secret-key" } as const;
    const received: unknown[] = [];
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    target.addEventListener("tvci-ai-settings-updated", (receivedEvent) => {
      received.push((receivedEvent as CustomEvent).detail);
    });

    const persisted = applyAiSettingsSavedMessage({ type: "ai_settings_saved", settings }, storage, target);

    expect(persisted).toEqual(settings);
    expect(loadAiSettings(storage)).toEqual(settings);
    expect(received).toEqual([settings]);
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining("secret-key"));
    logSpy.mockRestore();
  });

  it("rejects an invalid parent message without erasing the previous valid settings", () => {
    const storage = makeStorage();
    const previous = { provider: "gemini", model: "gemini-2.5-flash", apiKey: "previous-key" } as const;
    applyAiSettingsSavedMessage({ type: "ai_settings_saved", settings: previous }, storage);

    expect(() => applyAiSettingsSavedMessage({
      type: "ai_settings_saved",
      settings: { provider: "gemini", model: "", apiKey: "" },
    }, storage)).toThrow();
    expect(loadAiSettings(storage)).toEqual(previous);
  });

  it("refreshes Task Pane settings from the bridge event without a reload", () => {
    const storage = makeStorage();
    const target = new FakeEventTarget();
    const refreshed: StoredAiSettings[] = [];
    const unsubscribe = subscribeToAiSettings((settings) => refreshed.push(settings), target, storage);

    applyAiSettingsSavedMessage({
      type: "ai_settings_saved",
      settings: { provider: "openai", model: "gpt-4o-mini", apiKey: "sk-secret" },
    }, storage);
    target.dispatchEvent(event("tvci-ai-settings-updated"));

    expect(refreshed.at(-1)).toEqual({ provider: "openai", model: "gpt-4o-mini", apiKey: "sk-secret" });
    unsubscribe();
  });

  it("clears parent settings and refreshes subscribers to fresh defaults", () => {
    const storage = makeStorage();
    const target = new FakeEventTarget();
    const previous = { provider: "openai", model: "gpt-4o-mini", apiKey: "old-secret" } as const;
    applyAiSettingsSavedMessage({ type: "ai_settings_saved", settings: previous }, storage);

    const refreshed: StoredAiSettings[] = [];
    const unsubscribe = subscribeToAiSettings((settings) => refreshed.push(settings), target, storage);
    const cleared = applyAiSettingsClearedMessage({ type: "ai_settings_cleared" }, storage, target);

    expect(cleared).toEqual({ provider: "gemini", model: "gemini-2.0-flash", apiKey: "" });
    expect(loadAiSettings(storage)).toEqual(cleared);
    expect(refreshed.at(-1)).toEqual(cleared);
    unsubscribe();
  });
});
