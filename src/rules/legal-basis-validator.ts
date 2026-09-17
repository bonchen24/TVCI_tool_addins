import type { ParagraphSnapshot, ValidationIssue } from "./models";
import type { RuleProfileId } from "./profiles";

function punctuation(text: string): string {
  return text.trim().replace(/[;,.]+\s*$/, "");
}

function issue(snapshot: ParagraphSnapshot, expected: string, final: boolean): ValidationIssue {
  const fixValue = `${punctuation(snapshot.text)}${expected}`;
  return {
    id: `${snapshot.id}-legal-basis-${final ? "final" : "line"}`,
    ruleId: `text.legalBasis.${final ? "finalPunctuation" : "punctuation"}`,
    targetId: snapshot.id,
    message: final ? "Căn cứ cuối cùng chưa kết thúc đúng dấu câu" : "Dòng căn cứ chưa kết thúc bằng dấu chấm phẩy",
    severity: "error",
    autoFixable: true,
    actual: snapshot.text,
    expected,
    fixValue,
  };
}

export function validateLegalBasisBlock(paragraphs: ParagraphSnapshot[], startIndex: number, profileId: RuleProfileId): ValidationIssue[] {
  const lines: ParagraphSnapshot[] = [];
  for (let index = startIndex; index < paragraphs.length; index += 1) {
    const snapshot = paragraphs[index];
    if (!snapshot?.text.trim()) continue;
    if (!/^CĂN CỨ(?:\s|$)/i.test(snapshot.text.trim())) break;
    lines.push(snapshot);
  }
  if (!lines.length) return [];
  const finalPunctuation = profileId === "DANG_05_HD_VPTW_2026" ? "," : ".";
  return lines.flatMap((snapshot, index) => {
    const expected = index === lines.length - 1 ? finalPunctuation : ";";
    return /[;,.]\s*$/.test(snapshot.text.trim()) && snapshot.text.trim().endsWith(expected) ? [] : [issue(snapshot, expected, index === lines.length - 1)];
  });
}
