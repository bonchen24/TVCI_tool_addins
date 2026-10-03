/**
 * Output Sanitization & Security Masking
 * Strips markdown formatting, code fences, and emojis while preserving Vietnamese text.
 */

/**
 * Sanitizes raw AI text to adhere strictly to Vietnamese administrative standards (NĐ 30/2020/NĐ-CP).
 * - Strips markdown code blocks, headers, bold, italics.
 * - Strips emojis and decorative symbols.
 * - Strips common AI introductory and closing preambles.
 * - Preserves standard Vietnamese diacritics, numbers, and punctuation.
 */
export function sanitizeAiOutput(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.replace(/\r\n?/g, '\n');

  // 1. Strip markdown code fences while preserving enclosed content
  cleaned = cleaned.replace(/```[ \t]*[a-zA-Z0-9_-]*[ \t]*\r?\n([\s\S]*?)```/g, '$1');
  cleaned = cleaned.replace(/```([\s\S]*?)```/g, '$1');
  cleaned = cleaned.replace(/```[a-zA-Z0-9_-]*/g, '');
  cleaned = cleaned.replace(/`+/g, '');

  // 2. Remove markdown headers
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');

  // 3. Remove markdown bold, italic, and strikethrough
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/(^|[\s([{<])_([^_]+)_(?=[)\]}>.,;:!?\s]|$)/g, '$1$2');
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');

  // 4. Remove markdown unordered bullet lists (- item, * item, + item)
  cleaned = cleaned.replace(/^[\t ]*[-*+][ \t]+/gm, '');

  // 5. Remove emojis and miscellaneous non-text symbols across all Unicode planes
  cleaned = cleaned.replace(
    /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu,
    ''
  );

  // 6. Strip conversational preambles (both with and without colon)
  const lines = cleaned.split('\n');
  const filteredLines: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      filteredLines.push('');
      continue;
    }
    if (
      /^(?:dưới đây là|sau đây là|tôi xin|tôi đã|chúng tôi xin|hy vọng|lưu ý rằng|đây là bản|phiên bản đề xuất|nội dung soạn thảo)(?:\s|:|$)/iu.test(
        line
      ) &&
      line.length < 120
    ) {
      continue;
    }
    filteredLines.push(rawLine);
  }

  cleaned = filteredLines.join('\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

/**
 * Alias for Word Add-in compatibility
 */
export const sanitizeAiTextOutput = sanitizeAiOutput;

/**
 * Masks sensitive API keys from log or error strings
 */
export function maskApiKey(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-***')
    .replace(/AIza[a-zA-Z0-9_-]+/g, 'AIzaSy***');
}
