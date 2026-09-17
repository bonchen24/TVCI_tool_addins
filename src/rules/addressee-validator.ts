import type { ParagraphSnapshot, ValidationIssue } from './models';
import type { RuleProfileId } from './profiles';

function textIssue(snapshot: ParagraphSnapshot, ruleId: string, message: string, expected: string, fixValue: string): ValidationIssue {
  return {
    id: `${snapshot.id}-${ruleId}`,
    ruleId,
    targetId: snapshot.id,
    message,
    severity: 'error',
    autoFixable: true,
    actual: snapshot.text,
    expected,
    fixValue,
  };
}

function isParty(profileId: RuleProfileId): boolean {
  return profileId === 'DANG_05_HD_VPTW_2026';
}

export function validateAddresseeBlock(
  paragraphs: ParagraphSnapshot[],
  startIndex: number,
  profileId: RuleProfileId,
  validateRecipientLine?: (snapshot: ParagraphSnapshot) => ValidationIssue[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const first = paragraphs[startIndex];
  const firstText = first?.text.trim() ?? "";
  if (!first || !/^Kính gửi\b/i.test(firstText)) return issues;

  const hasColon = /^Kính gửi\s*:/i.test(firstText);
  if (!hasColon) {
    const recipient = firstText.replace(/^Kính gửi\s*:?[\s]*/i, '').trim();
    const expected = recipient ? `Kính gửi: ${recipient}` : 'Kính gửi:';
    issues.push(textIssue(first, 'text.addressee.colon', '[Kính gửi] Phải có dấu hai chấm sau cụm từ Kính gửi', expected, expected));
  }

  const inlineRecipient = firstText.replace(/^Kính gửi\s*:?[\s]*/i, '').trim();
  if (inlineRecipient) {
    if (/[;,.]+$/.test(inlineRecipient)) {
      const clean = inlineRecipient.replace(/[;,.]+$/, '').trim();
      const expected = `Kính gửi: ${clean}`;
      issues.push(textIssue(first, 'text.addressee.noTrailingPunctuation', '[Kính gửi] Trường hợp 1 nơi nhận không để dấu câu ở cuối', expected, expected));
    }
    return issues;
  }

  const recipientLines: ParagraphSnapshot[] = [];
  for (let index = startIndex + 1; index < paragraphs.length; index++) {
    const current = paragraphs[index];
    const text = current.text.trim();
    if (!text) break;
    if (/^(Nơi nhận|Nội dung|Căn cứ|Điều\s+\d+|Phần\s+\d+|Chương\s+)/i.test(text)) break;
    recipientLines.push(current);
  }

  if (isParty(profileId)) {
    for (const line of recipientLines) {
      if (validateRecipientLine) issues.push(...validateRecipientLine(line));
      if (!line.text.trim().endsWith(';')) {
        const fixed = `${line.text.trim().replace(/[;,.]+$/g, '')};`;
        issues.push(textIssue(line, 'text.addressee.partyPunctuation', '[Kính gửi] Văn bản Đảng dùng dấu chấm phẩy sau mỗi nơi nhận', 'Kết thúc bằng ;', fixed));
      }
    }
    return issues;
  }

  recipientLines.forEach((line, index) => {
    if (validateRecipientLine) issues.push(...validateRecipientLine(line));
    const isLast = index === recipientLines.length - 1;
    const trimmed = line.text.trim();
    const withoutEnd = trimmed.replace(/[;,.]+$/g, '');
    const withHyphen = /^-\s*/.test(withoutEnd) ? withoutEnd : `- ${withoutEnd}`;
    const expectedEnd = isLast ? '.' : ';';
    const expected = `${withHyphen}${expectedEnd}`;
    if (trimmed !== expected) {
      const ruleId = isLast ? 'text.addressee.finalPunctuation' : 'text.addressee.punctuation';
      issues.push(textIssue(line, ruleId, isLast ? '[Kính gửi] Dòng cuối phải kết thúc bằng dấu chấm' : '[Kính gửi] Mỗi nơi nhận trung gian phải kết thúc bằng dấu chấm phẩy', expected, expected));
    }
  });

  return issues;
}
