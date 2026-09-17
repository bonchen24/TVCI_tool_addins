import type { ParagraphRules, ParagraphSnapshot, ValidationIssue } from "./models";

function issue(targetId: string, field: keyof ParagraphRules, actual: string | number, expected: string | number): ValidationIssue {
  const labels: Record<string, string> = {
    fontName: "phông chữ",
    fontSize: "cỡ chữ",
    alignment: "căn đoạn",
    spaceBefore: "khoảng cách trước đoạn",
    spaceAfter: "khoảng cách sau đoạn",
    firstLineIndentMm: "thụt đầu dòng",
    lineSpacingPt: "giãn dòng",
    lineSpacingRule: "kiểu giãn dòng",
    lineSpacingMultiple: "hệ số giãn dòng",
  };
  return {
    id: `${targetId}-${String(field)}`,
    ruleId: `body.${String(field)}`,
    targetId,
    message: `Sai ${labels[String(field)]}`,
    severity: "error",
    autoFixable: true,
    actual,
    expected,
  };
}

export function validateParagraph(snapshot: ParagraphSnapshot, rules: ParagraphRules): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fields = [
    "fontName", "fontSize", "alignment", "spaceBefore", "spaceAfter",
    "firstLineIndentMm", "lineSpacingPt", "lineSpacingRule", "lineSpacingMultiple",
  ] as const;
  for (const field of fields) {
    const expected = rules[field];
    if (expected === undefined) continue;
    const actual = snapshot[field];
    if (actual === undefined) continue;
    if (field === "lineSpacingRule" && snapshot.lineSpacingRule === undefined) continue;
    if (field === "lineSpacingMultiple" && snapshot.lineSpacingMultiple === undefined) continue;
    if (actual !== expected) issues.push(issue(snapshot.id, field, actual, expected));
  }
  return issues;
}
