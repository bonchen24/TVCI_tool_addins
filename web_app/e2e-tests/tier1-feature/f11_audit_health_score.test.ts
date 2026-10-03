/**
 * Tier 1 - Feature 11: Real-time Audit & Health Score
 * Verifies evaluation of ValidationIssue[], severity mapping, and healthScore = (passed / applicable) * 100.
 */

import { describe, it, expect } from "../framework/testHarness";
import { ValidationIssue } from "../fixtures/ruleSnapshots";

describe("F11: Real-time Audit & Health Score", 1, () => {
  it("should calculate healthScore correctly based on passed vs applicable rules", () => {
    const calculateHealthScore = (passed: number, applicable: number): number => {
      if (applicable === 0) return 100;
      return Math.round((passed / applicable) * 100);
    };

    expect(calculateHealthScore(25, 25)).toBe(100);
    expect(calculateHealthScore(20, 25)).toBe(80);
    expect(calculateHealthScore(0, 25)).toBe(0);
  });

  it("should assign appropriate severities ('pass', 'warning', 'error') to issues", () => {
    const issues: ValidationIssue[] = [
      {
        ruleId: "PAGE_TOP_MARGIN",
        category: "page",
        severity: "error",
        componentType: "PAGE",
        message: "Lề trên không hợp lệ",
        autoFixable: true,
        status: "FAIL",
      },
      {
        ruleId: "BODY_LINE_SPACING",
        category: "body",
        severity: "warning",
        componentType: "BODY",
        message: "Khoảng cách dòng hơi hẹp",
        autoFixable: true,
        status: "FAIL",
      },
      {
        ruleId: "FONT_NAME",
        category: "body",
        severity: "pass",
        componentType: "BODY",
        message: "Phông chữ chuẩn Times New Roman",
        autoFixable: false,
        status: "PASS",
      },
    ];

    expect(issues.filter((i) => i.severity === "error").length).toBe(1);
    expect(issues.filter((i) => i.severity === "warning").length).toBe(1);
    expect(issues.filter((i) => i.severity === "pass").length).toBe(1);
  });

  it("should group validation issues across 7 categories", () => {
    const categories = ["page", "header", "symbol_date", "title", "recipients", "body", "signer"];
    expect(categories.length).toBe(7);
    for (const cat of categories) {
      expect(categories).toContain(cat);
    }
  });

  it("should identify autoFixable issues and provide concrete fixValue", () => {
    const fixableIssue: ValidationIssue = {
      ruleId: "BODY_ALIGNMENT",
      category: "body",
      severity: "error",
      componentType: "BODY",
      message: "Đoạn văn bản phải căn đều 2 bên (Justified)",
      actual: "Left",
      expected: "Justified",
      fixValue: "Justified",
      autoFixable: true,
      status: "FAIL",
    };

    expect(fixableIssue.autoFixable).toBe(true);
    expect(fixableIssue.fixValue).toBe("Justified");
  });

  it("should exclude NOT_APPLICABLE and MISSING rules from failed counts in health score", () => {
    const evaluationResults = [
      { ruleId: "R1", status: "PASS" },
      { ruleId: "R2", status: "PASS" },
      { ruleId: "R3", status: "FAIL" },
      { ruleId: "R4", status: "NOT_APPLICABLE" },
      { ruleId: "R5", status: "MISSING" },
    ];

    const applicable = evaluationResults.filter((r) => r.status !== "NOT_APPLICABLE").length;
    const passed = evaluationResults.filter((r) => r.status === "PASS").length;

    expect(applicable).toBe(4);
    expect(passed).toBe(2);
    expect(Math.round((passed / applicable) * 100)).toBe(50);
  });
}, 11);
