const WORD_ENTRY = /^[\p{Script=Latin}\p{M}]+(?:[-'’][\p{Script=Latin}\p{M}]+)*$/u;

/** @typedef {{ line: number; entry: string; reason: string }} RejectedDictionaryEntry */
/** @typedef {{ words: string[]; rejected: RejectedDictionaryEntry[] }} PreparedDictionary */

function normalizeEntry(entry) {
  return entry.normalize('NFC').trim().toLocaleLowerCase('vi');
}

function readEntries(text) {
  const lines = text.replace(/^\uFEFF/u, '').split(/\r\n|\n|\r/u);
  const firstLine = lines[0]?.trim() ?? '';
  const startAt = /^\d+$/u.test(firstLine) ? 1 : 0;
  const words = [];
  const rejected = [];
  const seen = new Set();

  for (let index = startAt; index < lines.length; index += 1) {
    const entry = lines[index].trim();
    if (!entry) continue;

    let reason;
    if (/[\u0000-\u001f\u007f]/u.test(entry)) reason = 'contains-control-character';
    else if (/\s/u.test(entry)) reason = 'contains-whitespace';
    else if ([...entry].length > 80) reason = 'entry-too-long';
    else if (!WORD_ENTRY.test(entry)) reason = /\p{L}/u.test(entry) ? 'invalid-word-shape' : 'contains-no-letters';

    const normalized = normalizeEntry(entry);
    if (!reason && seen.has(normalized)) reason = 'duplicate-after-normalization';

    if (reason) {
      rejected.push({ line: index + 1, entry, reason });
      continue;
    }

    seen.add(normalized);
    words.push(normalized);
  }

  return { words, rejected };
}

/** @param {Uint8Array} bytes */
export function prepareVietnameseDictionary(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength % 2 !== 0) {
    throw new Error('Vietnamese.dic phải có byte UTF-16LE hợp lệ.');
  }

  let text;
  try {
    text = new TextDecoder('utf-16le', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('Không giải mã được Vietnamese.dic dưới dạng UTF-16LE.');
  }

  return readEntries(text);
}

/** @param {string} text */
export function parseVietnameseDictionary(text) {
  return new Set(readEntries(text).words);
}
