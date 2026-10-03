import { describe, expect, it } from 'vitest';
import vi from 'dictionary-vi';
import { createHunspellDictionary, createVietnameseDictionary, loadVietnameseDictionary } from './dictionary';

describe('packaged Vietnamese dictionary', () => {
  it('recognizes accented Vietnamese syllables and suggests a correction locally', () => {
    const dictionary = createHunspellDictionary(vi.aff, vi.dic);

    expect(dictionary.has('văn')).toBe(true);
    expect(dictionary.has('bản')).toBe(true);
    expect(dictionary.has('bảnn')).toBe(false);
    expect(dictionary.suggest('bảnn')).toContain('bản');
  });

  it('uses supplied base entries for lookup while retaining Hunspell suggestions', () => {
    const dictionary = createVietnameseDictionary(vi.aff, vi.dic, ['tvcibaseword']);

    expect(dictionary.has('TVCIBaseWord')).toBe(true);
    expect(dictionary.has('bảnn')).toBe(false);
    expect(dictionary.suggest('bảnn')).toContain('bản');
  });

  it('loads the normalized UTF-8 base dictionary alongside the existing Hunspell data', async () => {
    let requestCount = 0;
    const fetcher = async (input: RequestInfo | URL) => {
      requestCount += 1;
      const url = String(input);
      if (url.endsWith('/vi.aff')) return new Response(new TextDecoder().decode(vi.aff));
      if (url.endsWith('/vi.dic')) return new Response(new TextDecoder().decode(vi.dic));
      if (url.endsWith('/vi-base.txt')) return new Response('TVCIBaseWord\r\n');
      return new Response(null, { status: 404 });
    };

    const dictionary = await loadVietnameseDictionary(fetcher as typeof fetch);

    expect(dictionary.has('tvcibaseword')).toBe(true);
    expect(requestCount).toBe(3);
  });
});
