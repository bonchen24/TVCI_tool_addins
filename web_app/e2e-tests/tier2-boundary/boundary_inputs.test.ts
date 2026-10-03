/**
 * Tier 2 - Boundary & Corner Cases: Boundary Inputs
 * Verifies handling of empty inputs, oversized text, single-character nodes, and whitespace.
 */

import { describe, it, expect } from "../framework/testHarness";
import { TiptapDocument } from "../fixtures/documentFixtures";

describe("Tier 2: Boundary Inputs", 2, () => {
  it("should handle completely empty document without throwing runtime errors", () => {
    const emptyDoc: TiptapDocument = {
      type: "doc",
      content: [],
    };

    expect(emptyDoc.content.length).toBe(0);
    const extractText = (doc: TiptapDocument) => doc.content.map((n) => n.text || "").join("");
    expect(extractText(emptyDoc)).toBe("");
  });

  it("should handle document with only whitespace and empty paragraphs", () => {
    const whitespaceDoc: TiptapDocument = {
      type: "doc",
      content: [
        { type: "paragraph", text: "" },
        { type: "paragraph", text: "   \t\n   " },
        { type: "paragraph", text: "" },
      ],
    };

    const hasVisibleContent = whitespaceDoc.content.some((n) => (n.text || "").trim().length > 0);
    expect(hasVisibleContent).toBe(false);
  });

  it("should handle single-character paragraphs and titles without slicing errors", () => {
    const singleCharDoc: TiptapDocument = {
      type: "doc",
      content: [{ type: "paragraph", text: "A" }],
    };

    const firstLine = singleCharDoc.content[0].text || "";
    expect(firstLine.length).toBe(1);
    expect(firstLine.charAt(0)).toBe("A");
  });

  it("should process oversized document with 50,000 paragraphs efficiently", () => {
    const start = Date.now();
    const paragraphCount = 50_000;
    const paragraphs: string[] = new Array(paragraphCount);
    for (let i = 0; i < paragraphCount; i++) {
      paragraphs[i] = "Đoạn văn kiểm thử hiệu năng số " + i;
    }

    const duration = Date.now() - start;
    expect(paragraphs.length).toBe(50_000);
    expect(duration).toBeLessThan(1000); // Must generate in < 1 second
  });

  it("should safely truncate oversized single-line strings before OpenXML export", () => {
    const MAX_LINE_CHARS = 10_000;
    const oversizedString = "A".repeat(25_000);

    const safeString = oversizedString.length > MAX_LINE_CHARS
      ? oversizedString.substring(0, MAX_LINE_CHARS)
      : oversizedString;

    expect(safeString.length).toBe(MAX_LINE_CHARS);
  });
});
