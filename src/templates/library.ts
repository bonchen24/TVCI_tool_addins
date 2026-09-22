export type TemplateOrganization = "TKV" | "IEMM" | "TVCI" | "DANG";
export type TemplateStatus = "active" | "draft" | "archived";

export type TemplateSource =
  | { kind: "bundled"; path: string }
  | { kind: "user"; storageId: string };

export interface TemplateRecord {
  id: string;
  name: string;
  organization: TemplateOrganization;
  department: string;
  documentType: string;
  keywords: string[];
  source: TemplateSource;
  version: string;
  status: TemplateStatus;
  description?: string;
  referenceSources?: string[];
  symbolHint?: string;
  usageNotes?: string[];
  updatedAt?: string;
  hidden?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface TemplateSearchOptions {
  organization?: TemplateOrganization;
  department?: string;
  documentType?: string;
  query?: string;
  includeHidden?: boolean;
}

export function normalizeVietnamese(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const saved = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + cost);
      diagonal = saved;
    }
  }
  return prev[b.length];
}

function fuzzyTokenMatch(queryToken: string, targetToken: string): boolean {
  if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) return true;
  const maxDistance = queryToken.length >= 8 ? 2 : queryToken.length >= 3 ? 1 : 0;
  return levenshtein(queryToken, targetToken) <= maxDistance;
}

function searchScore(record: TemplateRecord, query: string): number | null {
  const normalizedQuery = normalizeVietnamese(query);
  if (!normalizedQuery) return 0;
  // Department remains legacy metadata, but is not a searchable user-facing dimension.
  const fields = [record.name, record.documentType, record.description ?? "", ...record.keywords]
    .map(normalizeVietnamese)
    .filter(Boolean);
  const combined = fields.join(" ");
  if (combined.includes(normalizedQuery)) return 100;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const targetTokens = combined.split(" ").filter(Boolean);
  let matched = 0;
  for (const queryToken of queryTokens) {
    if (targetTokens.some((targetToken) => fuzzyTokenMatch(queryToken, targetToken))) matched++;
  }
  if (matched !== queryTokens.length) return null;
  return 60 + matched;
}

export function searchTemplates(records: TemplateRecord[], options: TemplateSearchOptions): TemplateRecord[] {
  return records
    .filter((record) => record.status !== "archived")
    .filter((record) => options.includeHidden || !record.hidden)
    .filter((record) => !options.organization || record.organization === options.organization)
    .filter((record) => !options.department || record.department === options.department)
    .filter((record) => !options.documentType || record.documentType === options.documentType)
    .map((record) => ({ record, score: searchScore(record, options.query ?? "") }))
    .filter((item): item is { record: TemplateRecord; score: number } => item.score !== null)
    .sort((a, b) => Number(Boolean(b.record.isDefault)) - Number(Boolean(a.record.isDefault)) || (a.record.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.record.sortOrder ?? Number.MAX_SAFE_INTEGER) || b.score - a.score || a.record.name.localeCompare(b.record.name, "vi"))
    .map((item) => item.record);
}

export function distinctTemplateValues(records: TemplateRecord[], field: "department" | "documentType", organization?: TemplateOrganization): string[] {
  return [...new Set(records.filter((item) => !organization || item.organization === organization).map((item) => item[field]).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "vi"));
}
