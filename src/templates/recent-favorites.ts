const RECENT_KEY = "tvci_recent_templates";
const FAVORITES_KEY = "tvci_favorite_templates";
const MAX_RECENT_TEMPLATES = 10;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {}
  return null;
}

export function getRecentTemplateIds(storage?: StorageLike): string[] {
  const store = resolveStorage(storage);
  if (!store) return [];
  try {
    const raw = store.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function addRecentTemplate(templateId: string, storage?: StorageLike): void {
  if (!templateId) return;
  const store = resolveStorage(storage);
  if (!store) return;
  try {
    const current = getRecentTemplateIds(store);
    const updated = [templateId, ...current.filter((id) => id !== templateId)].slice(0, MAX_RECENT_TEMPLATES);
    store.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {}
}

export function getFavoriteTemplateIds(storage?: StorageLike): string[] {
  const store = resolveStorage(storage);
  if (!store) return [];
  try {
    const raw = store.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function isFavoriteTemplate(templateId: string, storage?: StorageLike): boolean {
  if (!templateId) return false;
  const favorites = getFavoriteTemplateIds(storage);
  return favorites.includes(templateId);
}

export function toggleFavoriteTemplate(templateId: string, storage?: StorageLike): boolean {
  if (!templateId) return false;
  const store = resolveStorage(storage);
  if (!store) return false;
  try {
    const current = getFavoriteTemplateIds(store);
    const exists = current.includes(templateId);
    const updated = exists ? current.filter((id) => id !== templateId) : [...current, templateId];
    store.setItem(FAVORITES_KEY, JSON.stringify(updated));
    return !exists;
  } catch {
    return false;
  }
}
