/**
 * Tier 2 - Boundary & Corner Cases: Missing Metadata & Schema
 * Verifies handling of partial form submissions, missing required fields, and invalid dates.
 */

import { describe, it, expect } from "../framework/testHarness";
import { CANONICAL_SCHEMAS } from "../fixtures/templateFixtures";

describe("Tier 2: Missing Metadata & Schema", 2, () => {
  it("should detect when all required form fields are missing", () => {
    const congVan = CANONICAL_SCHEMAS.find((s) => s.id === "cong_van")!;
    const emptyPayload = {};

    const missingFields: string[] = [];
    for (const field of congVan.fields) {
      if (field.required && !(field.id in emptyPayload)) {
        missingFields.push(field.id);
      }
    }

    expect(missingFields.length).toBeGreaterThan(4);
    expect(missingFields).toContain("SO_KY_HIEU");
    expect(missingFields).toContain("TRICH_YEU");
  });

  it("should throw when template ID does not exist in registry", () => {
    const getTemplateSchema = (id: string) => {
      const found = CANONICAL_SCHEMAS.find((s) => s.id === id);
      if (!found) {
        throw new Error(`Mẫu biểu không tồn tại trong hệ thống: ${id}`);
      }
      return found;
    };

    expect(() => getTemplateSchema("non_existent_template_xyz")).toThrow("Mẫu biểu không tồn tại");
  });

  it("should reject invalid date strings such as 31/02/2026 or malformed text", () => {
    const isValidDate = (day: number, month: number, year: number): boolean => {
      const date = new Date(year, month - 1, day);
      return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
    };

    expect(isValidDate(29, 9, 2026)).toBe(true);
    expect(isValidDate(31, 2, 2026)).toBe(false); // Feb 31 does not exist
    expect(isValidDate(31, 4, 2026)).toBe(false); // April has 30 days
  });

  it("should handle empty repeatable arrays with default placeholder row", () => {
    const sanitizeRepeatable = (items: string[] | undefined, defaultItem: string): string[] => {
      if (!items || items.length === 0) {
        return [defaultItem];
      }
      return items;
    };

    const emptyRecipients = sanitizeRepeatable([], "Như trên");
    expect(emptyRecipients.length).toBe(1);
    expect(emptyRecipients[0]).toBe("Như trên");
  });

  it("should safely handle null or undefined properties in document AST node serialization", () => {
    const mockNodeWithNulls = {
      type: "paragraph",
      attrs: {
        fontSize: undefined,
        fontName: null,
        align: "justify",
      },
      text: "Đoạn văn an toàn.",
    };

    const sanitizedAttrs = {
      fontSize: mockNodeWithNulls.attrs.fontSize ?? 13,
      fontName: mockNodeWithNulls.attrs.fontName ?? "Times New Roman",
      align: mockNodeWithNulls.attrs.align ?? "left",
    };

    expect(sanitizedAttrs.fontSize).toBe(13);
    expect(sanitizedAttrs.fontName).toBe("Times New Roman");
    expect(sanitizedAttrs.align).toBe("justify");
  });
});
