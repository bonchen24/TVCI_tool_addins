import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseVietnameseDictionary, prepareVietnameseDictionary } from './dictionary-format.mjs';

function utf16le(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'utf16le'));
}

describe('Vietnamese dictionary source preprocessing', () => {
  it('decodes UTF-16LE with a BOM and treats any leading integer as a header without validating its count', () => {
    const prepared = prepareVietnameseDictionary(utf16le('\uFEFF999\r\nxử\r\nlý\r\n'));

    expect(prepared.words).toEqual(['xử', 'lý']);
    expect(prepared.rejected).toEqual([]);
  });

  it('normalizes dictionary entries to NFC and removes duplicate spellings', () => {
    const prepared = prepareVietnameseDictionary(utf16le('2\nhoà\nhoa\u0300\n'));

    expect(prepared.words).toEqual(['hoà']);
    expect(prepared.rejected).toEqual([
      { line: 3, entry: 'hoà', reason: 'duplicate-after-normalization' },
    ]);
    expect([...parseVietnameseDictionary('HOA\u0300\r\nhoà\n')]).toEqual(['hoà']);
  });

  it('reports malformed, non-word, and suspicious entries instead of adding them to the base word set', () => {
    const prepared = prepareVietnameseDictionary(utf16le('7\nxử\nbad entry\n123\nword/flag\nfoo\u0001\n'));

    expect(prepared.words).toEqual(['xử']);
    expect(prepared.rejected.map(({ line, reason }) => ({ line, reason }))).toEqual([
      { line: 3, reason: 'contains-whitespace' },
      { line: 4, reason: 'contains-no-letters' },
      { line: 5, reason: 'invalid-word-shape' },
      { line: 6, reason: 'contains-control-character' },
    ]);
  });

  it('preserves the exact user-supplied source bytes', () => {
    const source = readFileSync(resolve(process.cwd(), 'data/spellcheck/Vietnamese.dic'));
    const hash = createHash('sha256').update(source).digest('hex');

    expect(hash).toBe('1417975f8479f3a4009cf6af120e16ccea190f89b392fb16889d67ed66b6e769');
  });
});
