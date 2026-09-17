import type { TemplatePreferences } from "./management";

const STORAGE_KEY = "tvci.template.preferences.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function loadTemplatePreferences(storage: StorageLike = localStorage): TemplatePreferences {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as TemplatePreferences : {};
  } catch {
    return {};
  }
}

export function saveTemplatePreferences(preferences: TemplatePreferences, storage: StorageLike = localStorage): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}
