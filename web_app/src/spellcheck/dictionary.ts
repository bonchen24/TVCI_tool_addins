import NSpell from 'nspell';
import { normalizeDictionaryTerm } from './ignore-rules';
import { parseVietnameseDictionary } from './dictionary-format.mjs';
import type { DictionaryProvider } from './types';

type DictionaryBytes = string | Uint8Array;

let dictionaryPromise: Promise<DictionaryProvider> | undefined;

export function createHunspellDictionary(aff: DictionaryBytes, dic: DictionaryBytes): DictionaryProvider {
  return createVietnameseDictionary(aff, dic, []);
}

export function createVietnameseDictionary(
  aff: DictionaryBytes,
  dic: DictionaryBytes,
  baseWords: Iterable<string>
): DictionaryProvider {
  const checker = NSpell(aff, dic);
  const base = new Set([...baseWords].map(normalizeDictionaryTerm).filter(Boolean));
  return {
    has: (word) => {
      const normalized = normalizeDictionaryTerm(word);
      return base.has(normalized) || checker.correct(normalized);
    },
    suggest: (word) => checker.suggest(normalizeDictionaryTerm(word)),
  };
}

async function fetchDictionaryText(fileName: 'vi.aff' | 'vi.dic' | 'vi-base.txt', fetcher: typeof fetch): Promise<string> {
  const response = await fetcher(`/spellcheck/${fileName}`, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Không tải được từ điển chính tả (${fileName}).`);
  return new TextDecoder('utf-8').decode(await response.arrayBuffer());
}

export async function loadVietnameseDictionary(fetcher: typeof fetch = fetch): Promise<DictionaryProvider> {
  const [aff, dic, baseText] = await Promise.all([
    fetchDictionaryText('vi.aff', fetcher),
    fetchDictionaryText('vi.dic', fetcher),
    fetchDictionaryText('vi-base.txt', fetcher),
  ]);
  return createVietnameseDictionary(aff, dic, parseVietnameseDictionary(baseText));
}

export function getVietnameseDictionary(): Promise<DictionaryProvider> {
  if (!dictionaryPromise) {
    dictionaryPromise = loadVietnameseDictionary().catch((error: unknown) => {
      dictionaryPromise = undefined;
      throw error;
    });
  }
  return dictionaryPromise;
}
