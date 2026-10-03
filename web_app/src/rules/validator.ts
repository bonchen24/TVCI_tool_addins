import type { ParagraphRules, ParagraphSnapshot, ValidationIssue } from './models';

function issue(
  snapshot: ParagraphSnapshot,
  field: keyof ParagraphRules,
  actual: string | number,
  expected: string | number
): ValidationIssue {
  const labels: Record<string, string> = {
    fontName: 'phông chữ',
    fontSize: 'cỡ chữ',
    alignment: 'căn đoạn',
    spaceBefore: 'khoảng cách trước đoạn',
    spaceAfter: 'khoảng cách sau đoạn',
    firstLineIndentMm: 'thụt đầu dòng',
    lineSpacingPt: 'giãn dòng',
    lineSpacingRule: 'kiểu giãn dòng',
    lineSpacingMultiple: 'hệ số giãn dòng',
  };
  return {
    id: `${snapshot.id}-${String(field)}`,
    ruleId: `body.${String(field)}`,
    targetId: snapshot.id,
    paragraphIndex: snapshot.index,
    category: 'body',
    componentType: 'BODY',
    message: `Sai ${labels[String(field)] || String(field)}`,
    severity: 'error',
    status: 'FAIL',
    autoFixable: true,
    actual,
    expected,
    fixValue: expected,
  };
}

export function validateParagraph(
  snapshot: ParagraphSnapshot,
  rules: ParagraphRules
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const fields = [
    'fontName',
    'fontSize',
    'alignment',
    'spaceBefore',
    'spaceAfter',
    'firstLineIndentMm',
    'lineSpacingPt',
    'lineSpacingRule',
    'lineSpacingMultiple',
  ] as const;

  for (const field of fields) {
    const expected = rules[field];
    if (expected === undefined) continue;

    let actual = snapshot[field];
    if (field === 'fontSize') {
      actual = snapshot.fontSize ?? snapshot.fontSizePt;
    } else if (field === 'spaceBefore') {
      actual = snapshot.spaceBefore ?? snapshot.spaceBeforePt;
    } else if (field === 'spaceAfter') {
      actual = snapshot.spaceAfter ?? snapshot.spaceAfterPt;
    }

    if (actual === undefined) continue;
    if (field === 'lineSpacingRule' && snapshot.lineSpacingRule === undefined) continue;
    if (field === 'lineSpacingMultiple' && snapshot.lineSpacingMultiple === undefined) continue;

    if (actual !== expected) {
      issues.push(issue(snapshot, field, actual, expected));
    }
  }

  return issues;
}
