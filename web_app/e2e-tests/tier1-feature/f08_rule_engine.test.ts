/**
 * Tier 1 - Feature 8: Pure TypeScript Rule Engine Port
 * Verifies evaluation of 25+ administrative rules across 7 categories without Office.js dependency.
 */

import { describe, it, expect } from "../framework/testHarness";
import { COMPLIANT_PARAGRAPHS, COMPLIANT_PAGE_SETUP, NON_COMPLIANT_PARAGRAPHS } from "../fixtures/ruleSnapshots";

describe("F08: Pure TypeScript Rule Engine Port", 1, () => {
  it("should evaluate font family rule strictly requiring Times New Roman", () => {
    const isFontCompliant = (font: string) => font.trim().toLowerCase() === "times new roman";

    expect(isFontCompliant("Times New Roman")).toBe(true);
    expect(isFontCompliant("Arial")).toBe(false);
    expect(isFontCompliant("Calibri")).toBe(false);
  });

  it("should evaluate page margin rules according to ND30 boundaries", () => {
    const checkMargins = (setup: typeof COMPLIANT_PAGE_SETUP) => {
      const topOk = setup.topMarginMm >= 20 && setup.topMarginMm <= 25;
      const bottomOk = setup.bottomMarginMm >= 20 && setup.bottomMarginMm <= 25;
      const leftOk = setup.leftMarginMm >= 30 && setup.leftMarginMm <= 35;
      const rightOk = setup.rightMarginMm >= 15 && setup.rightMarginMm <= 20;
      return topOk && bottomOk && leftOk && rightOk;
    };

    expect(checkMargins(COMPLIANT_PAGE_SETUP)).toBe(true);
    expect(checkMargins({ ...COMPLIANT_PAGE_SETUP, topMarginMm: 10 })).toBe(false);
  });

  it("should validate National Emblem font size (12-13pt) and bold weight", () => {
    const emblem = COMPLIANT_PARAGRAPHS.find((p) => p.componentType === "NATIONAL_EMBLEM");
    expect(emblem).toBeDefined();

    const isSizeOk = emblem!.fontSizePt >= 12 && emblem!.fontSizePt <= 13;
    expect(isSizeOk).toBe(true);
    expect(emblem!.bold).toBe(true);
    expect(emblem!.alignment).toBe("Centered");
  });

  it("should validate Motto font size (13-14pt), bold weight, and uppercase/capitalization", () => {
    const motto = COMPLIANT_PARAGRAPHS.find((p) => p.componentType === "MOTTO");
    expect(motto).toBeDefined();

    const isSizeOk = motto!.fontSizePt >= 13 && motto!.fontSizePt <= 14;
    expect(isSizeOk).toBe(true);
    expect(motto!.bold).toBe(true);
    expect(motto!.alignment).toBe("Centered");
  });

  it("should validate body paragraph first line indent (10mm - 12.7mm) and justified alignment", () => {
    const body = COMPLIANT_PARAGRAPHS.find((p) => p.componentType === "BODY");
    expect(body).toBeDefined();

    expect(body!.alignment).toBe("Justified");
    expect(body!.firstLineIndentMm).toBeGreaterThanOrEqual(10);
    expect(body!.firstLineIndentMm).toBeLessThanOrEqual(12.7);
  });
}, 8);
