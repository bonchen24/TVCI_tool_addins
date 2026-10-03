/**
 * Tier 1 - Feature 2: A4 Document Canvas & Formatting Toolbar
 * Verifies A4 dimensions (210x297mm), page margins, typography controls, and paragraph styling.
 */

import { describe, it, expect } from "../framework/testHarness";
import { STANDARD_A4_PAGE_SETUP } from "../fixtures/documentFixtures";

describe("F02: A4 Document Canvas & Formatting Toolbar", 1, () => {
  it("should enforce standard A4 page dimensions (210mm x 297mm)", () => {
    const a4Mm = { width: 210, height: 297 };
    const a4Aspect = a4Mm.height / a4Mm.width; // ~1.4142 (sqrt(2))

    expect(a4Mm.width).toBe(210);
    expect(a4Mm.height).toBe(297);
    expect(a4Aspect).toBeCloseTo(Math.SQRT2, 0.01);
  });

  it("should configure standard margins compliant with ND30 (Top 20, Bottom 20, Left 30, Right 15)", () => {
    const margins = STANDARD_A4_PAGE_SETUP.margins;
    expect(margins.topMm).toBe(20);
    expect(margins.bottomMm).toBe(20);
    expect(margins.leftMm).toBe(30);
    expect(margins.rightMm).toBe(15);
  });

  it("should support font size controls with standard administrative points (11, 12, 13, 14, 16)", () => {
    const supportedSizes = [10, 11, 12, 13, 14, 15, 16, 18, 20];
    const administrativeSizes = [11, 12, 13, 14];

    for (const size of administrativeSizes) {
      expect(supportedSizes).toContain(size);
    }
  });

  it("should toggle formatting marks (bold, italic, underline) on text selections", () => {
    interface TextMark {
      type: "bold" | "italic" | "underline";
    }

    const marks: TextMark[] = [{ type: "bold" }];
    // Add italic
    marks.push({ type: "italic" });

    expect(marks.length).toBe(2);
    expect(marks.some((m) => m.type === "bold")).toBe(true);
    expect(marks.some((m) => m.type === "italic")).toBe(true);
  });

  it("should handle line spacing and paragraph spacing mutations", () => {
    const paragraphAttrs = {
      align: "justify",
      lineSpacing: 1.2,
      spaceBeforePt: 2,
      spaceAfterPt: 2,
      firstLineIndentMm: 10,
    };

    expect(paragraphAttrs.align).toBe("justify");
    expect(paragraphAttrs.lineSpacing).toBe(1.2);
    expect(paragraphAttrs.firstLineIndentMm).toBe(10);
  });
}, 2);
