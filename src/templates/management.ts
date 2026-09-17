import type { TemplateRecord } from "./library";

export interface TemplatePreference {
  hidden?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}

export type TemplatePreferences = Record<string, TemplatePreference>;

export function applyTemplatePreferences(records: TemplateRecord[], preferences: TemplatePreferences): TemplateRecord[] {
  return records.map((record) => ({ ...record, hidden: false, isDefault: false, ...preferences[record.id] }));
}

export function setTemplateHidden(preferences: TemplatePreferences, id: string, hidden: boolean): TemplatePreferences {
  return { ...preferences, [id]: { ...(preferences[id] ?? {}), hidden } };
}

export function setTemplateDefault(records: TemplateRecord[], preferences: TemplatePreferences, id: string): TemplatePreferences {
  const target = records.find((record) => record.id === id);
  if (!target) return preferences;
  const next: TemplatePreferences = { ...preferences };
  for (const record of records) {
    if (
      record.organization === target.organization &&
      record.department === target.department &&
      record.documentType === target.documentType
    ) {
      next[record.id] = { ...(next[record.id] ?? {}), isDefault: record.id === id };
    }
  }
  return next;
}

export function moveTemplate(
  records: TemplateRecord[],
  preferences: TemplatePreferences,
  id: string,
  direction: "up" | "down",
): TemplatePreferences {
  const target = records.find((record) => record.id === id);
  if (!target) return preferences;
  const group = records
    .filter((record) => record.organization === target.organization && record.department === target.department)
    .map((record, index) => ({ ...record, sortOrder: preferences[record.id]?.sortOrder ?? record.sortOrder ?? index }))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "vi"));
  const index = group.findIndex((record) => record.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapIndex < 0 || swapIndex >= group.length) return preferences;
  [group[index], group[swapIndex]] = [group[swapIndex], group[index]];
  const next: TemplatePreferences = { ...preferences };
  group.forEach((record, order) => {
    next[record.id] = { ...(next[record.id] ?? {}), sortOrder: order };
  });
  return next;
}
