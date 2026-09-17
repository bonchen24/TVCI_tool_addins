import type { ParagraphSnapshot, ValidationIssue } from "./models";

function textIssue(snapshot: ParagraphSnapshot, ruleId: string, message: string, expected: string, fixValue: string): ValidationIssue {
  return {
    id: `${snapshot.id}-${ruleId}`,
    ruleId,
    targetId: snapshot.id,
    message,
    severity: "error",
    autoFixable: true,
    actual: snapshot.text,
    expected,
    fixValue,
  };
}

function isRecipientsEnd(text: string): boolean {
  return /^(Kính gửi|Nội dung|Căn cứ|Điều\s+\d+|Phần\s+\d+|Chương\s+|Mục\s+|Khoản\s+|Điểm\s+|Ý\s+|TM\.|KT\.|TL\.|TUQ\.|Q\.|PHÓ\s+|GIÁM ĐỐC|PHÓ GIÁM ĐỐC|CHỦ TỊCH|PHÓ CHỦ TỊCH|BÍ THƯ|PHÓ BÍ THƯ|CHÁNH VĂN PHÒNG|TRƯỞNG\s+|PHÓ TRƯỞNG\s+|ĐẠI DIỆN\b)/i.test(text);
}

export function validateRecipientsBlock(
  paragraphs: ParagraphSnapshot[],
  startIndex: number,
  validateRecipientLine?: (snapshot: ParagraphSnapshot) => ValidationIssue[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const first = paragraphs[startIndex];
  const firstText = first?.text.trim() ?? "";
  if (!first || !/^Nơi nhận\b/i.test(firstText)) return issues;

  const hasColon = /^Nơi nhận\s*:/i.test(firstText);
  const inlineRecipient = firstText.replace(/^Nơi nhận\s*:?\s*/i, "").trim();
  if (!hasColon) {
    const expected = inlineRecipient ? `Nơi nhận: ${inlineRecipient}` : "Nơi nhận:";
    issues.push(textIssue(first, "text.recipients.colon", "[Nơi nhận] Phải có dấu hai chấm sau nhãn", expected, expected));
  }
  if (inlineRecipient) return issues;

  for (let index = startIndex + 1; index < paragraphs.length; index += 1) {
    const current = paragraphs[index];
    const text = current.text.trim();
    if (!text || isRecipientsEnd(text)) break;
    if (validateRecipientLine) issues.push(...validateRecipientLine(current));
    if (/^Lưu\s*:/i.test(text)) {
      const expected = `${text.replace(/,\s*\d+\s*bản/gi, '').replace(/[;,.]+\s*$/, '')}.`;
      if (text !== expected) issues.push(textIssue(current, "text.recipients.archivePunctuation", "Dòng Lưu không ghi số bản lưu (01 bản) và kết thúc bằng dấu chấm", expected, expected));
      break;
    }
    const base = text.replace(/^[-•]\s*/, "").replace(/[;,.]+\s*$/, "").trim();
    const expected = `- ${base};`;
    if (text !== expected) issues.push(textIssue(current, "text.recipients.itemPunctuation", "Mỗi nơi nhận phải có gạch đầu dòng và kết thúc bằng dấu chấm phẩy", expected, expected));
  }
  return issues;
}
