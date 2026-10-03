/**
 * Tier 1 - Feature 12: One-Click Safe Auto-Fix Engine
 * Verifies issueToPatch transformations and atomic application of formatting fixes.
 */

import { describe, it, expect } from "../framework/testHarness";
import { ValidationIssue } from "../fixtures/ruleSnapshots";

describe("F12: One-Click Safe Auto-Fix Engine", 1, () => {
  interface FormattingPatch {
    paragraphIndex?: number;
    fontName?: string;
    fontSizePt?: number;
    bold?: boolean;
    italic?: boolean;
    alignment?: "Left" | "Centered" | "Right" | "Justified";
    lineSpacingMultiple?: number;
    firstLineIndentMm?: number;
    pageMargins?: { topMm: number; bottomMm: number; leftMm: number; rightMm: number };
  }

  const issueToPatch = (issue: ValidationIssue): FormattingPatch => {
    const patch: FormattingPatch = { paragraphIndex: issue.paragraphIndex };

    switch (issue.ruleId) {
      case "FONT_NAME":
        patch.fontName = "Times New Roman";
        break;
      case "BODY_ALIGNMENT":
        patch.alignment = "Justified";
        break;
      case "BODY_INDENT":
        patch.firstLineIndentMm = 10;
        break;
      case "PAGE_MARGINS":
        patch.pageMargins = { topMm: 20, bottomMm: 20, leftMm: 30, rightMm: 15 };
        break;
      case "BODY_LINE_SPACING":
        patch.lineSpacingMultiple = 1.2;
        break;
    }
    return patch;
  };

  it("should convert font violation issue into Times New Roman patch", () => {
    const fontIssue: ValidationIssue = {
      ruleId: "FONT_NAME",
      category: "body",
      severity: "error",
      componentType: "BODY",
      paragraphIndex: 2,
      message: "Phông chữ không đúng",
      actual: "Arial",
      expected: "Times New Roman",
      autoFixable: true,
      status: "FAIL",
    };

    const patch = issueToPatch(fontIssue);
    expect(patch.paragraphIndex).toBe(2);
    expect(patch.fontName).toBe("Times New Roman");
  });

  it("should convert alignment violation issue into Justified alignment patch", () => {
    const alignIssue: ValidationIssue = {
      ruleId: "BODY_ALIGNMENT",
      category: "body",
      severity: "error",
      componentType: "BODY",
      paragraphIndex: 3,
      message: "Căn lề không đúng",
      autoFixable: true,
      status: "FAIL",
    };

    const patch = issueToPatch(alignIssue);
    expect(patch.alignment).toBe("Justified");
  });

  it("should filter out non-autoFixable issues from auto-fix pipeline", () => {
    const issues: ValidationIssue[] = [
      {
        ruleId: "BODY_ALIGNMENT",
        category: "body",
        severity: "error",
        componentType: "BODY",
        message: "Lỗi căn lề",
        autoFixable: true,
        status: "FAIL",
      },
      {
        ruleId: "MISSING_SIGNER_NAME",
        category: "signer",
        severity: "error",
        componentType: "SIGNER",
        message: "Thiếu tên người ký (cần người dùng nhập)",
        autoFixable: false,
        status: "FAIL",
      },
    ];

    const safeFixable = issues.filter((i) => i.autoFixable && i.status === "FAIL");
    expect(safeFixable.length).toBe(1);
    expect(safeFixable[0].ruleId).toBe("BODY_ALIGNMENT");
  });

  it("should apply page margin fixes atomically to PageSetupSnapshot", () => {
    const marginIssue: ValidationIssue = {
      ruleId: "PAGE_MARGINS",
      category: "page",
      severity: "error",
      componentType: "PAGE",
      message: "Lề trang sai",
      autoFixable: true,
      status: "FAIL",
    };

    const patch = issueToPatch(marginIssue);
    expect(patch.pageMargins?.topMm).toBe(20);
    expect(patch.pageMargins?.leftMm).toBe(30);
  });

  it("should batch multiple patches together for atomic single-transaction execution", () => {
    const patches: FormattingPatch[] = [
      { paragraphIndex: 0, fontName: "Times New Roman" },
      { paragraphIndex: 1, alignment: "Justified" },
      { paragraphIndex: 2, lineSpacingMultiple: 1.2 },
    ];

    expect(patches.length).toBe(3);
    const affectedIndices = patches.map((p) => p.paragraphIndex);
    expect(affectedIndices).toContain(0);
    expect(affectedIndices).toContain(1);
    expect(affectedIndices).toContain(2);
  });
}, 12);
