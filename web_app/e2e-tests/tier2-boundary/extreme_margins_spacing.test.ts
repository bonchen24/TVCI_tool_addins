/**
 * Tier 2 - Boundary & Corner Cases: Extreme Margins & Spacing
 * Verifies behavior with 0mm margins, 100mm extreme margins, extreme line spacing, and giant fonts.
 */

import { describe, it, expect } from "../framework/testHarness";
import { PageSetupSnapshot } from "../fixtures/ruleSnapshots";

describe("Tier 2: Extreme Margins & Spacing", 2, () => {
  it("should clamp 0mm margins to minimum safe printable margin boundary", () => {
    const sanitizeMargins = (setup: PageSetupSnapshot) => {
      const MIN_PRINTABLE_MM = 5; // Minimum printable physical limit
      return {
        ...setup,
        topMarginMm: Math.max(MIN_PRINTABLE_MM, setup.topMarginMm),
        bottomMarginMm: Math.max(MIN_PRINTABLE_MM, setup.bottomMarginMm),
        leftMarginMm: Math.max(MIN_PRINTABLE_MM, setup.leftMarginMm),
        rightMarginMm: Math.max(MIN_PRINTABLE_MM, setup.rightMarginMm),
      };
    };

    const zeroMargins: PageSetupSnapshot = {
      orientation: "portrait",
      paperSize: "A4",
      topMarginMm: 0,
      bottomMarginMm: 0,
      leftMarginMm: 0,
      rightMarginMm: 0,
    };

    const sanitized = sanitizeMargins(zeroMargins);
    expect(sanitized.topMarginMm).toBe(5);
    expect(sanitized.leftMarginMm).toBe(5);
  });

  it("should reject margins where left + right margins exceed total page width (210mm for A4)", () => {
    const validatePageWidth = (pageWidthMm: number, leftMm: number, rightMm: number) => {
      const contentWidthMm = pageWidthMm - (leftMm + rightMm);
      if (contentWidthMm <= 20) {
        throw new Error("Lề trang quá lớn, vùng văn bản còn lại không hợp lệ (< 20mm)");
      }
      return contentWidthMm;
    };

    expect(() => validatePageWidth(210, 110, 110)).toThrow("Lề trang quá lớn");
    expect(validatePageWidth(210, 30, 15)).toBe(165);
  });

  it("should clamp extreme line spacing values (0.1x or 10.0x) to administrative range (1.0x to 2.0x)", () => {
    const clampLineSpacing = (multiple: number): number => {
      return Math.min(2.0, Math.max(1.0, multiple));
    };

    expect(clampLineSpacing(0.2)).toBe(1.0);
    expect(clampLineSpacing(5.0)).toBe(2.0);
    expect(clampLineSpacing(1.2)).toBe(1.2);
  });

  it("should detect and correct absurd font sizes (< 6pt or > 72pt)", () => {
    const sanitizeFontSize = (sizePt: number): number => {
      if (sizePt < 6) return 13; // default back to body standard
      if (sizePt > 72) return 14;
      return sizePt;
    };

    expect(sanitizeFontSize(1)).toBe(13);
    expect(sanitizeFontSize(500)).toBe(14);
    expect(sanitizeFontSize(13)).toBe(13);
  });

  it("should normalize negative indentation values to zero", () => {
    const sanitizeIndent = (indentMm: number): number => {
      return Math.max(0, indentMm);
    };

    expect(sanitizeIndent(-15)).toBe(0);
    expect(sanitizeIndent(10)).toBe(10);
  });
});
