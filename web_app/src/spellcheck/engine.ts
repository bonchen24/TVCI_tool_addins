import { buildAllowedTermSpans, getIgnoredTextSpans, isDistinctiveUppercase, isInsideIgnoredSpan, normalizeDictionaryTerm } from './ignore-rules';
import { isTvciTerm } from './tvci-dictionary';
import type { DictionaryProvider, SpellcheckIssue, SpellcheckRuleId } from './types';

const WORD_PATTERN = /[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*/gu;
const CONTEXTUAL_PHRASE_RULES = new Map([
  ['sử lý', { correction: 'xử lý', message: 'Cụm từ này thường dùng “xử lý”.' }],
  ['xát nhận', { correction: 'xác nhận', message: 'Cụm từ này thường dùng “xác nhận”.' }],
]);

function createIssue(
  category: SpellcheckIssue['category'],
  ruleId: SpellcheckRuleId,
  message: string,
  text: string,
  from: number,
  to: number,
  suggestions: string[] = []
): SpellcheckIssue {
  return { id: `${category}:${ruleId}:${from}:${to}:${text}`, category, ruleId, message, text, from, to, suggestions };
}

function addPresentationIssues(text: string, issues: SpellcheckIssue[], ignoredSpans: Array<{ from: number; to: number }>): void {
  const doubleSpaces = /[ \t]{2,}/gu;
  let match: RegExpExecArray | null;
  while ((match = doubleSpaces.exec(text)) !== null) {
    issues.push(createIssue('presentation', 'double-space', 'Có khoảng trắng kép.', match[0], match.index, match.index + match[0].length, [' ']));
  }

  const spaceBeforePunctuation = /[ \t]+([,.;:!?])/gu;
  while ((match = spaceBeforePunctuation.exec(text)) !== null) {
    const punctuationAt = match.index + match[0].length - 1;
    issues.push(createIssue('presentation', 'space-before-punctuation', 'Không đặt khoảng trắng trước dấu câu.', match[0], match.index, punctuationAt + 1, [match[1]]));
  }

  const missingSpace = /(?<=[\p{L}\p{N}])([,;:!?])([\p{L}][\p{M}]*)/gu;
  while ((match = missingSpace.exec(text)) !== null) {
    issues.push(createIssue('presentation', 'missing-space-after-punctuation', 'Thiếu khoảng trắng sau dấu câu.', match[0], match.index, match.index + match[0].length, [`${match[1]} ${match[2]}`]));
  }

  const repeatedWord = /([\p{L}\p{M}]+)[ \t]+\1(?![\p{L}\p{M}])/giu;
  while ((match = repeatedWord.exec(text)) !== null) {
    issues.push(createIssue('presentation', 'repeated-word', 'Có từ bị lặp liên tiếp.', match[0], match.index, match.index + match[0].length, [match[1]]));
  }

  const sentenceStart = /(^|[.!?][ \t]+)(\p{Ll})/gu;
  while ((match = sentenceStart.exec(text)) !== null) {
    const from = match.index + match[1].length;
    if (isInsideIgnoredSpan(from, from + match[2].length, ignoredSpans)) continue;
    const periodAt = match.index + match[1].lastIndexOf('.');
    if (periodAt >= 0 && isInsideIgnoredSpan(periodAt, periodAt + 1, ignoredSpans)) continue;
    issues.push(createIssue('presentation', 'sentence-capitalization', 'Nên viết hoa đầu câu.', match[2], from, from + match[2].length, [match[2].toLocaleUpperCase('vi')]));
  }
}

function preserveLeadingCapital(source: string, correction: string): string {
  if (source === source.toLocaleUpperCase('vi')) return correction.toLocaleUpperCase('vi');
  const first = [...source][0] ?? '';
  if (first !== first.toLocaleUpperCase('vi') || first === first.toLocaleLowerCase('vi')) return correction;
  const correctedFirst = [...correction][0] ?? '';
  return correctedFirst.toLocaleUpperCase('vi') + correction.slice(correctedFirst.length);
}

function findContextualPhraseIssues(
  text: string,
  ignoredSpans: Array<{ from: number; to: number }>,
  ignoredIssueIds: ReadonlySet<string>
): SpellcheckIssue[] {
  const tokens = [...text.matchAll(new RegExp(WORD_PATTERN.source, WORD_PATTERN.flags))];
  const issues: SpellcheckIssue[] = [];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    const first = tokens[index];
    const second = tokens[index + 1];
    const firstFrom = first.index ?? 0;
    const secondFrom = second.index ?? 0;
    if (!/^[ \t]+$/u.test(text.slice(firstFrom + first[0].length, secondFrom))) continue;

    const normalizedPhrase = `${normalizeDictionaryTerm(first[0])} ${normalizeDictionaryTerm(second[0])}`;
    const rule = CONTEXTUAL_PHRASE_RULES.get(normalizedPhrase);
    if (!rule) continue;

    const from = firstFrom;
    const to = secondFrom + second[0].length;
    if (isInsideIgnoredSpan(from, to, ignoredSpans)) continue;
    const phrase = text.slice(from, to);
    const issue = createIssue(
      'spelling',
      'contextual-phrase',
      rule.message,
      phrase,
      from,
      to,
      [preserveLeadingCapital(phrase, rule.correction)]
    );
    if (!ignoredIssueIds.has(issue.id)) issues.push(issue);
  }

  return issues;
}

export function checkText(
  text: string,
  dictionary: DictionaryProvider,
  userWords: Iterable<string> = [],
  ignoredIssueIds: ReadonlySet<string> = new Set()
): SpellcheckIssue[] {
  const issues: SpellcheckIssue[] = [];
  const ignoredSpans = [...getIgnoredTextSpans(text), ...buildAllowedTermSpans(text, userWords)];
  const contextualIssues = findContextualPhraseIssues(text, ignoredSpans, ignoredIssueIds);
  issues.push(...contextualIssues);
  const wordPattern = new RegExp(WORD_PATTERN.source, WORD_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = wordPattern.exec(text)) !== null) {
    const token = match[0];
    const from = match.index;
    const to = from + token.length;
    const normalized = normalizeDictionaryTerm(token);

    if (
      isInsideIgnoredSpan(from, to, ignoredSpans)
      || isDistinctiveUppercase(token)
      || isTvciTerm(token)
      || contextualIssues.some((issue) => from < issue.to && to > issue.from)
      || dictionary.has(normalized)
    ) continue;

    const suggestions = [...new Set(dictionary.suggest(normalized).map((suggestion) => suggestion.normalize('NFC')))]
      .filter((suggestion) => normalizeDictionaryTerm(suggestion) !== normalized)
      .slice(0, 5);
    const issue = createIssue('spelling', 'unknown-syllable', `Nghi ngờ sai chính tả: “${token}”.`, token, from, to, suggestions);
    if (!ignoredIssueIds.has(issue.id)) issues.push(issue);
  }

  addPresentationIssues(text, issues, ignoredSpans);
  return issues.sort((left, right) => left.from - right.from || left.to - right.to);
}
