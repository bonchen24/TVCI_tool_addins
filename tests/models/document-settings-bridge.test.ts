import {
  applyDocumentSettingsDefaultMessage,
  DOCUMENT_SETTINGS_UPDATED_EVENT,
  type DocumentSettingsEventTarget,
} from "../../src/models/document-settings-bridge";
import { getDefaultSettings, type DocumentSettings } from "../../src/models/document-settings";

class FakeEventTarget implements DocumentSettingsEventTarget {
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

describe("document settings parent bridge", () => {
  it("persists save_settings_default and publishes the saved settings without applying Word formatting", () => {
    const target = new FakeEventTarget();
    const settings = getDefaultSettings("IEMM");
    const saved: DocumentSettings[] = [];
    const received: unknown[] = [];
    target.addEventListener(DOCUMENT_SETTINGS_UPDATED_EVENT, (event) => {
      received.push((event as CustomEvent).detail);
    });

    const result = applyDocumentSettingsDefaultMessage(
      { type: "save_settings_default", settings },
      (value) => saved.push(value),
      target,
    );

    expect(result).toEqual(settings);
    expect(saved).toEqual([settings]);
    expect(received).toEqual([settings]);
  });
});
