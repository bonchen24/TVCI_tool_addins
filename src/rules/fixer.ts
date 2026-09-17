import type { FormattingPatch, ValidationIssue } from "./models";

function value(issue: ValidationIssue): string | number | boolean {
  return issue.fixValue ?? issue.expected;
}

export function issueToPatch(issue: ValidationIssue): FormattingPatch {
  const componentParts = issue.ruleId.split(".");
  const field = issue.ruleId.startsWith("component.")
    ? componentParts[componentParts.length - 1]
    : issue.ruleId.replace("body.", "");
  const expected = value(issue);

  switch (field) {
    case "fontName": return { fontName: String(expected) };
    case "fontSize": return { fontSize: Number(expected) };
    case "alignment": return { alignment: String(expected) as FormattingPatch["alignment"] };
    case "spaceBefore": return { spaceBefore: Number(expected) };
    case "spaceAfter": return { spaceAfter: Number(expected) };
    case "firstLineIndentMm": return { firstLineIndentMm: Number(expected) };
    case "lineSpacingPt": return { lineSpacingPt: Number(expected) };
    case "lineSpacingRule": return { lineSpacingRule: String(expected) as FormattingPatch["lineSpacingRule"] };
    case "lineSpacingMultiple": return { lineSpacingMultiple: Number(expected) };
    case "bold": return { bold: Boolean(expected) };
    case "italic": return { italic: Boolean(expected) };
    case "underline": return { underline: Boolean(expected) };
    default: throw new Error(`Quy tắc chưa hỗ trợ sửa tự động: ${issue.ruleId}`);
  }
}
