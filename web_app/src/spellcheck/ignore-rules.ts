const IGNORED_TEXT_PATTERNS = [
  /(?:https?:\/\/|www\.)[^\s<>()]+/giu,
  /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/giu,
  /(?:^|[^\p{L}\p{N}])(?:iso|iec|tcvn|qcvn|astm)\s*[-:]?\s*\d+(?:[.:/-][\p{L}\p{M}\p{N}-]+)*(?=$|[^\p{L}\p{N}])/giu,
  /(?:^|[^\p{L}\p{N}])(?:cv|qđ|nđ)\s*[-.:]?\s*\d+(?:[/-][\p{L}\p{M}\p{N}-]+)*(?=$|[^\p{L}\p{N}])/giu,
  /(?:^|[^\p{L}\p{N}])(?:v\.v\.|v\.d\.|t\.p\.|tp\.|q\.|p\.)(?=$|[^\p{L}\p{N}])/giu,
  /(?:^|[^\p{L}\p{N}])\d+(?:[.,]\d+)*(?=$|[^\p{L}\p{N}])/gu,
  /(?:^|[^\p{L}\p{N}])(?:\d{1,4}[/-]\d{2,4}(?:[/-][\p{L}\d]+)+|[\p{Lu}\d]{1,10}(?:[-/.][\p{Lu}\d]{1,12}){1,4})(?=$|[^\p{L}\p{N}])/gu,
];

export function normalizeDictionaryTerm(term: string): string {
  return term.normalize('NFC').trim().toLocaleLowerCase('vi');
}

export function getIgnoredTextSpans(text: string): Array<{ from: number; to: number }> {
  const spans: Array<{ from: number; to: number }> = [];

  for (const pattern of IGNORED_TEXT_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const matchedText = match[0];
      const leadingDelimiter = /^(?:[^\p{L}\p{N}])/u.test(matchedText) ? 1 : 0;
      spans.push({ from: match.index + leadingDelimiter, to: match.index + matchedText.length });
      if (!matchedText.length) pattern.lastIndex++;
    }
  }

  return spans;
}

export function isInsideIgnoredSpan(from: number, to: number, spans: Array<{ from: number; to: number }>): boolean {
  return spans.some((span) => from < span.to && to > span.from);
}

export function buildAllowedTermSpans(text: string, terms: Iterable<string>): Array<{ from: number; to: number }> {
  const spans: Array<{ from: number; to: number }> = [];
  const normalizedText = text.normalize('NFC').toLocaleLowerCase('vi');

  for (const term of terms) {
    const normalizedTerm = normalizeDictionaryTerm(term);
    if (!normalizedTerm) continue;
    let searchFrom = 0;
    while (searchFrom < normalizedText.length) {
      const from = normalizedText.indexOf(normalizedTerm, searchFrom);
      if (from < 0) break;
      const to = from + normalizedTerm.length;
      const leftBoundary = from === 0 || !/[\p{L}\p{M}\p{N}]/u.test(normalizedText[from - 1]);
      const rightBoundary = to === normalizedText.length || !/[\p{L}\p{M}\p{N}]/u.test(normalizedText[to]);
      if (leftBoundary && rightBoundary) spans.push({ from, to });
      searchFrom = Math.max(to, from + 1);
    }
  }

  return spans;
}

export function isDistinctiveUppercase(token: string): boolean {
  return token.length > 1 && /\p{Lu}/u.test(token) && token === token.toLocaleUpperCase('vi');
}
