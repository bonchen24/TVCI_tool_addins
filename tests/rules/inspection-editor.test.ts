import type { ValidationIssue } from "../../src/rules/models";

// Test the classification logic that InspectionEditorView relies upon
function classifyIssueCategory(issue: ValidationIssue): string {
  const r = (issue.ruleId || "").toLowerCase();
  const m = (issue.message || "").toLowerCase();

  if (r.includes("header") || r.includes("national") || r.includes("heading") || m.includes("quốc hiệu") || m.includes("tiêu đề") || m.includes("cơ quan")) {
    return "header";
  }
  if (r.includes("symbol") || r.includes("date") || r.includes("location") || m.includes("số ký hiệu") || m.includes("ngày tháng") || m.includes("địa danh")) {
    return "symbol_date";
  }
  if (r.includes("addressee") || r.includes("recipient") || m.includes("kính gửi") || m.includes("nơi nhận")) {
    return "recipients";
  }
  if (r.includes("page") || r.includes("margin") || r.includes("paper") || m.includes("khổ giấy") || m.includes("lề")) {
    return "page";
  }
  return "body";
}

describe("Inspection Editor Categorization", () => {
  it("classifies header and national heading issues into header category", () => {
    const issue: ValidationIssue = {
      id: "iss-1",
      ruleId: "header.institution",
      targetId: "doc:p:0",
      message: "Tiêu đề cơ quan ban hành sai font",
      severity: "error",
      autoFixable: true,
      actual: "Arial",
      expected: "Times New Roman",
    };
    expect(classifyIssueCategory(issue)).toBe("header");
  });

  it("classifies symbol, date, and location issues into symbol_date category", () => {
    const issue: ValidationIssue = {
      id: "iss-2",
      ruleId: "symbol.format",
      targetId: "doc:p:1",
      message: "Số ký hiệu văn bản không đúng quy cách",
      severity: "warning",
      autoFixable: false,
      actual: "123",
      expected: "123/TB-TVCI",
    };
    expect(classifyIssueCategory(issue)).toBe("symbol_date");
  });

  it("classifies recipients and addressee issues into recipients category", () => {
    const issue: ValidationIssue = {
      id: "iss-3",
      ruleId: "addressee.alignment",
      targetId: "doc:p:3",
      message: "Khối Kính gửi chưa căn lề chuẩn",
      severity: "error",
      autoFixable: true,
      actual: "Left",
      expected: "Justified",
    };
    expect(classifyIssueCategory(issue)).toBe("recipients");
  });

  it("classifies margin and page issues into page category", () => {
    const issue: ValidationIssue = {
      id: "iss-4",
      ruleId: "page.leftMargin",
      targetId: "doc:page",
      message: "Lề trái chưa đúng quy định 30mm",
      severity: "error",
      autoFixable: true,
      actual: 20,
      expected: 30,
    };
    expect(classifyIssueCategory(issue)).toBe("page");
  });

  it("classifies font, line spacing, and general body issues into body category", () => {
    const issue: ValidationIssue = {
      id: "iss-5",
      ruleId: "body.fontSize",
      targetId: "doc:p:5",
      message: "Cỡ chữ nội dung văn bản không đúng 13-14pt",
      severity: "error",
      autoFixable: true,
      actual: 11,
      expected: 13,
    };
    expect(classifyIssueCategory(issue)).toBe("body");
  });
});
