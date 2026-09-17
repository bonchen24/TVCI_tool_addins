import type { KnowledgeCategory, KnowledgeRecord, KnowledgeScope } from "./models";

export interface KnowledgeSearchOptions {
  query?: string;
  category?: KnowledgeCategory | "all";
  scope?: KnowledgeScope | "ALL";
  department?: string;
}

const CATEGORY_PRIORITY: Record<KnowledgeCategory, number> = {
  mandatory: 0,
  guideline: 1,
  experience: 2,
  phrase: 3,
};

export function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function searchKnowledge(
  records: KnowledgeRecord[],
  options: KnowledgeSearchOptions = {}
): KnowledgeRecord[] {
  const { query, category, scope, department } = options;
  const normalizedQuery = query ? removeVietnameseTones(query) : "";
  const queryTokens = normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : [];

  return records
    .filter((record) => {
      // 1. Category filter
      if (category && category !== "all" && record.category !== category) {
        return false;
      }

      // 2. Scope filter (if specified, matches record scope or COMMON)
      if (scope && scope !== "ALL") {
        if (record.scope !== scope && record.scope !== "COMMON") {
          return false;
        }
      }

      // 3. Department filter
      if (department && record.department && record.department !== department) {
        return false;
      }

      // 4. Query matching across title, content, tags, exampleSnippet
      if (queryTokens.length > 0) {
        const searchableText = removeVietnameseTones(
          `${record.title} ${record.content} ${record.tags.join(" ")} ${record.exampleSnippet || ""} ${record.referenceSource || ""}`
        );

        const allTokensMatch = queryTokens.every((token) => searchableText.includes(token));
        if (!allTokensMatch) return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Primary sort: Category priority
      const priorityDiff = (CATEGORY_PRIORITY[a.category] ?? 99) - (CATEGORY_PRIORITY[b.category] ?? 99);
      if (priorityDiff !== 0) return priorityDiff;

      // Secondary sort: Title alphabetical
      return a.title.localeCompare(b.title, "vi");
    });
}
