import { insertTemplate } from "../../src/word/template.service";
import type { TemplateRecord } from "../../src/templates/library";

describe("official template insertion gate", () => {
  const template: TemplateRecord = {
    id: "unverified-direct-insert",
    name: "Unverified template",
    organization: "TVCI",
    department: "Văn thư",
    documentType: "Công văn",
    keywords: [],
    source: { kind: "bundled", path: "/templates/unverified.docx" },
    version: "unknown",
    status: "active",
    verification: {
      status: "unverified",
      reason: "Canonical source absent.",
      canonicalSource: null,
      runtime: { path: "/templates/unverified.docx", sha256: "a".repeat(64) },
    },
  };

  it("rejects an unverified bundled template before downloading its DOCX", async () => {
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    } as Response);
    const previousDocument = (globalThis as typeof globalThis & { document?: Document }).document;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { baseURI: "https://example.test/taskpane.html" },
    });
    const previousWord = (globalThis as typeof globalThis & { Word?: unknown }).Word;
    Object.defineProperty(globalThis, "Word", { configurable: true, value: {} });

    try {
      await expect(insertTemplate(template)).rejects.toThrow(/chưa xác minh|chưa được xác minh/i);
      expect(fetchSpy.mock.calls.some(([input]) => String(input).includes("/templates/unverified.docx"))).toBe(false);
    } finally {
      fetchSpy.mockRestore();
      if (previousDocument === undefined) Reflect.deleteProperty(globalThis, "document");
      else Object.defineProperty(globalThis, "document", { configurable: true, value: previousDocument });
      if (previousWord === undefined) Reflect.deleteProperty(globalThis, "Word");
      else Object.defineProperty(globalThis, "Word", { configurable: true, value: previousWord });
    }
  });
});
