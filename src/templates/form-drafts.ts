import type { TemplateOrganization } from "./library";
import type { TemplateFormValues } from "./form-schema";

const STORAGE_PREFIX = "tvci.template.form-draft.v1";
const DRAFT_INDEX_KEY = "tvci.template.form-draft.index.v1";

export interface TemplateFormDraft {
  templateId: string;
  organization: TemplateOrganization;
  documentType: string;
  values: TemplateFormValues;
  updatedAt: string;
}

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

function resolveStorage(storage?: StorageLike): StorageLike | null {
  if (storage) return storage;
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {}
  return null;
}

export function templateFormDraftKey(templateId: string, organization: TemplateOrganization, documentType: string): string {
  return [STORAGE_PREFIX, templateId, organization, documentType].map((part) => encodeURIComponent(part.trim())).join(":");
}

function getDraftIndex(storage: StorageLike): string[] {
  try {
    const raw = storage.getItem(DRAFT_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDraftIndex(keys: string[], storage: StorageLike): void {
  try {
    storage.setItem(DRAFT_INDEX_KEY, JSON.stringify(keys));
  } catch {}
}

export function loadTemplateFormDraft(
  templateId: string,
  organization: TemplateOrganization,
  documentType: string,
  storage?: StorageLike
): TemplateFormDraft | null {
  const store = resolveStorage(storage);
  if (!store) return null;
  try {
    const key = templateFormDraftKey(templateId, organization, documentType);
    const raw = store.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as TemplateFormDraft;
    return draft && draft.templateId === templateId && draft.organization === organization ? draft : null;
  } catch {
    return null;
  }
}

export function saveTemplateFormDraft(
  templateId: string,
  organization: TemplateOrganization,
  documentType: string,
  values: TemplateFormValues,
  storage?: StorageLike
): void {
  const store = resolveStorage(storage);
  if (!store) return;
  const key = templateFormDraftKey(templateId, organization, documentType);
  const draft: TemplateFormDraft = { templateId, organization, documentType, values, updatedAt: new Date().toISOString() };
  try {
    store.setItem(key, JSON.stringify(draft));
    const index = getDraftIndex(store);
    if (!index.includes(key)) {
      saveDraftIndex([key, ...index], store);
    }
  } catch {}
}

export function deleteTemplateFormDraft(
  templateId: string,
  organization: TemplateOrganization,
  documentType: string,
  storage?: StorageLike
): void {
  const store = resolveStorage(storage);
  if (!store) return;
  const key = templateFormDraftKey(templateId, organization, documentType);
  try {
    if (typeof store.removeItem === "function") {
      store.removeItem(key);
    } else {
      store.setItem(key, "");
    }
    const index = getDraftIndex(store);
    saveDraftIndex(index.filter((k) => k !== key), store);
  } catch {}
}

export function getLatestActiveDraft(storage?: StorageLike): TemplateFormDraft | null {
  const store = resolveStorage(storage);
  if (!store) return null;
  try {
    const index = getDraftIndex(store);
    let latest: TemplateFormDraft | null = null;
    let latestTime = 0;

    for (const key of index) {
      const raw = store.getItem(key);
      if (!raw) continue;
      try {
        const draft = JSON.parse(raw) as TemplateFormDraft;
        if (!draft || !draft.values) continue;
        const hasData = Object.values(draft.values).some((v) => Boolean(v && String(v).trim().length > 0));
        if (!hasData) continue;

        const time = new Date(draft.updatedAt).getTime();
        if (time > latestTime) {
          latestTime = time;
          latest = draft;
        }
      } catch {}
    }
    return latest;
  } catch {
    return null;
  }
}
