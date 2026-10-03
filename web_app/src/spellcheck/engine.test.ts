import { describe, expect, it } from 'vitest';
import { checkText } from './engine';
import type { DictionaryProvider } from './types';

function createDictionary(words: string[], suggestions: Record<string, string[]> = {}): DictionaryProvider {
  const normalized = new Set(words.map((word) => word.normalize('NFC').toLocaleLowerCase('vi')));
  return {
    has: (word) => normalized.has(word.normalize('NFC').toLocaleLowerCase('vi')),
    suggest: (word) => suggestions[word.normalize('NFC').toLocaleLowerCase('vi')] || [],
  };
}

describe('Vietnamese spell-check engine', () => {
  it('reports a misspelled Vietnamese syllable with a ranked local suggestion and text offsets', () => {
    const issues = checkText('Văn bảnn', createDictionary(['văn', 'bản'], { bảnn: ['bản', 'bàn'] }));

    expect(issues).toEqual([
      expect.objectContaining({
        category: 'spelling',
        text: 'bảnn',
        from: 4,
        to: 8,
        suggestions: ['bản', 'bàn'],
      }),
    ]);
  });

  it('ignores URLs, email, dates, numbers, document codes, acronyms, and TVCI terms', () => {
    const text = 'https://tvci.vn mail@tvci.vn 12/10/2026 123 86/2020/QH14 QĐ-01 ABC-01 ISO 9001 TVCI IEMM Vinacomin';

    expect(checkText(text, createDictionary([]))).toEqual([]);
  });

  it('ignores standard identifiers and common administrative abbreviations', () => {
    const text = 'TCVN 1234:2020 QCVN 05:2020/BCT iso 9001 CV 12/TVCI v.v. quy định';
    const findings = checkText(text, createDictionary(['quy', 'định']));

    expect(findings.filter((issue) => issue.category === 'spelling')).toEqual([]);
    expect(findings).toEqual([]);
  });

  it('reports the common phrase confusions with the intended correction and exact offsets', () => {
    const text = 'Sử lý hồ sơ, xát nhận kết quả';
    const issues = checkText(text, createDictionary(['sử', 'lý', 'hồ', 'sơ', 'xát', 'nhận', 'kết', 'quả']));

    expect(issues.filter((issue) => issue.ruleId === 'contextual-phrase')).toEqual([
      expect.objectContaining({ category: 'spelling', text: 'Sử lý', from: 0, to: 5, suggestions: ['Xử lý'] }),
      expect.objectContaining({ category: 'spelling', text: 'xát nhận', from: 13, to: 21, suggestions: ['xác nhận'] }),
    ]);
    expect(issues.filter((issue) => issue.ruleId === 'unknown-syllable')).toEqual([]);
  });

  it('layers base words, TVCI/domain terms, and user-added phrases independently', () => {
    expect(checkText('Văn bản TVCI Xí nghiệp', createDictionary(['văn', 'bản']), ['Xí nghiệp'])).toEqual([]);
  });

  it('groups spacing, repeated-word, and capitalization findings as presentation issues', () => {
    const issues = checkText('Hai  từ , tiếp theo. hai hai dòng. văn,bản', createDictionary([
      'hai', 'từ', 'tiếp', 'theo', 'dòng', 'văn', 'bản',
    ]));

    expect(issues.filter((issue) => issue.category === 'presentation').map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining(['double-space', 'space-before-punctuation', 'missing-space-after-punctuation', 'repeated-word', 'sentence-capitalization'])
    );
    expect(issues.find((issue) => issue.ruleId === 'double-space')?.suggestions).toEqual([' ']);
    expect(issues.find((issue) => issue.ruleId === 'missing-space-after-punctuation')?.suggestions).toEqual([', b']);
    expect(issues.find((issue) => issue.ruleId === 'repeated-word')?.suggestions).toEqual(['hai']);
    expect(issues.filter((issue) => issue.category === 'spelling')).toEqual([]);
  });

  it('does not alter source text while checking', () => {
    const text = 'Văn bảnn';
    checkText(text, createDictionary(['văn', 'bản'], { bảnn: ['bản'] }));
    expect(text).toBe('Văn bảnn');
  });
});
