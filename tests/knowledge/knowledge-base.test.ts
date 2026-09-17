import { searchKnowledge } from "../../src/knowledge/search";
import { SEED_KNOWLEDGE_RECORDS } from "../../src/knowledge/seed-data";
import type { KnowledgeRecord } from "../../src/knowledge/models";

describe("knowledge-base search and filter service", () => {
  test("searches knowledge records with unaccented Vietnamese query", () => {
    // "tieu de 2 cap" should match "Tiêu đề header 2 cấp..."
    const results = searchKnowledge(SEED_KNOWLEDGE_RECORDS, { query: "tieu de 2 cap" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.id).toBe("kb-header-tvci");
  });

  test("filters by category", () => {
    const mandatory = searchKnowledge(SEED_KNOWLEDGE_RECORDS, { category: "mandatory" });
    expect(mandatory.length).toBeGreaterThan(0);
    expect(mandatory.every((r) => r.category === "mandatory")).toBe(true);

    const phrases = searchKnowledge(SEED_KNOWLEDGE_RECORDS, { category: "phrase" });
    expect(phrases.length).toBeGreaterThan(0);
    expect(phrases.every((r) => r.category === "phrase")).toBe(true);
  });

  test("filters by scope", () => {
    const tvciResults = searchKnowledge(SEED_KNOWLEDGE_RECORDS, { scope: "TVCI" });
    // Should include TVCI specific records and COMMON records
    expect(tvciResults.some((r) => r.scope === "TVCI")).toBe(true);
    expect(tvciResults.some((r) => r.scope === "COMMON")).toBe(true);
    expect(tvciResults.every((r) => r.scope === "TVCI" || r.scope === "COMMON")).toBe(true);
  });

  test("sorts by priority category: mandatory first, then guideline, experience, phrase", () => {
    const all = searchKnowledge(SEED_KNOWLEDGE_RECORDS, {});
    const mandatoryIndices = all.map((r, idx) => (r.category === "mandatory" ? idx : -1)).filter((i) => i >= 0);
    const phraseIndices = all.map((r, idx) => (r.category === "phrase" ? idx : -1)).filter((i) => i >= 0);

    const maxMandatory = Math.max(...mandatoryIndices);
    const minPhrase = Math.min(...phraseIndices);
    expect(maxMandatory).toBeLessThan(minPhrase);
  });

  test("finds records matching specific tags", () => {
    const results = searchKnowledge(SEED_KNOWLEDGE_RECORDS, { query: "T2" });
    expect(results.some((r) => r.id === "kb-recipients-t2")).toBe(true);
  });
});
