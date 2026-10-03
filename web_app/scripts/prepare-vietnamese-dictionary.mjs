import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareVietnameseDictionary } from '../src/spellcheck/dictionary-format.mjs';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_PATH = path.join(APP_ROOT, 'data', 'spellcheck', 'Vietnamese.dic');
const PUBLIC_DICTIONARY_PATH = path.join(APP_ROOT, 'public', 'spellcheck', 'vi-base.txt');
const REVIEW_PATH = path.join(APP_ROOT, 'public', 'spellcheck', 'vi-base.review.json');
const EXPECTED_SOURCE_SHA256 = '1417975f8479f3a4009cf6af120e16ccea190f89b392fb16889d67ed66b6e769';

const sourceBytes = await readFile(SOURCE_PATH);
const sourceSha256 = createHash('sha256').update(sourceBytes).digest('hex');
if (sourceSha256 !== EXPECTED_SOURCE_SHA256) {
  throw new Error(`Vietnamese.dic source SHA-256 mismatch: ${sourceSha256}`);
}

const { words, rejected } = prepareVietnameseDictionary(sourceBytes);
await mkdir(path.dirname(PUBLIC_DICTIONARY_PATH), { recursive: true });
await writeFile(PUBLIC_DICTIONARY_PATH, `${words.join('\n')}\n`, 'utf8');
await writeFile(REVIEW_PATH, `${JSON.stringify({
  source: 'data/spellcheck/Vietnamese.dic',
  sourceSha256,
  acceptedEntries: words.length,
  rejectedEntries: rejected.length,
  rejected,
}, null, 2)}\n`, 'utf8');

console.log(`Vietnamese dictionary: ${words.length} accepted; ${rejected.length} flagged; SHA-256 ${sourceSha256}`);
