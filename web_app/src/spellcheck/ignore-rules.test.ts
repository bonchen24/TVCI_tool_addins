import { describe, expect, it } from 'vitest';
import {
  buildAllowedTermSpans,
  getIgnoredTextSpans,
  isDistinctiveUppercase,
  normalizeDictionaryTerm,
} from './ignore-rules';

describe('Vietnamese spell-check ignore rules', () => {
  it('finds URLs, email addresses, dates, numeric values, and document codes as ignored spans', () => {
    const text = 'https://tvci.vn a@tvci.vn 12/10/2026 123 86/2020/QH14 ABC-01';
    const ignoredValues = getIgnoredTextSpans(text).map(({ from, to }) => text.slice(from, to));

    expect(ignoredValues).toEqual(expect.arrayContaining([
      'https://tvci.vn',
      'a@tvci.vn',
      '12/10/2026',
      '123',
      '86/2020/QH14',
      'ABC-01',
    ]));
  });

  it('ignores standard citations and common dotted Vietnamese abbreviations', () => {
    const text = 'iso 9001, QCVN 05:2020/BCT, CV 12/TVCI, v.v., v.d., tp.';
    const ignoredValues = getIgnoredTextSpans(text).map(({ from, to }) => text.slice(from, to));

    expect(ignoredValues).toEqual(expect.arrayContaining([
      'iso 9001',
      'QCVN 05:2020/BCT',
      'CV 12/TVCI',
      'v.v.',
      'v.d.',
      'tp.',
    ]));
  });

  it('normalizes Vietnamese dictionary terms to NFC and ignores case', () => {
    expect(normalizeDictionaryTerm('  XÍ NGHIỆP  ')).toBe('xí nghiệp');
  });

  it('matches account terms as whole phrases with word boundaries', () => {
    const text = 'Tên Công ty ABC, mã ABCD';

    expect(buildAllowedTermSpans(text, ['Công ty ABC', 'ABC']).map(({ from, to }) => text.slice(from, to)))
      .toEqual(['Công ty ABC', 'ABC']);
  });

  it('recognizes distinctive uppercase tokens without treating mixed-case names as acronyms', () => {
    expect(isDistinctiveUppercase('QCVN')).toBe(true);
    expect(isDistinctiveUppercase('Vinacomin')).toBe(false);
    expect(isDistinctiveUppercase('AbC')).toBe(false);
  });
});
