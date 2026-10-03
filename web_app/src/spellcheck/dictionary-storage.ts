import { getDatabase } from '@/db/client';
import type { DatabaseLike } from '@/db/schema';
import { normalizeDictionaryTerm } from './ignore-rules';

const MAX_TERM_LENGTH = 80;

function validateTerm(term: string): { display: string; normalized: string } {
  if (typeof term !== 'string') throw new Error('Dictionary term must be text.');
  const display = term.normalize('NFC').trim();
  if (!display || display.length > MAX_TERM_LENGTH || /[\u0000-\u001f\u007f]/u.test(display)) {
    throw new Error('Dictionary term must contain 1–80 characters and no control characters.');
  }
  return { display, normalized: normalizeDictionaryTerm(display) };
}

export function listUserWords(userId: string, db: DatabaseLike = getDatabase()): string[] {
  return db.prepare(`SELECT term FROM spellcheck_user_dictionary
    WHERE user_id = ? ORDER BY normalized_term`).all(userId).map((row) => (row as { term: string }).term);
}

export function addUserWord(userId: string, term: string, db: DatabaseLike = getDatabase(), now = new Date()): void {
  const value = validateTerm(term);
  db.prepare(`INSERT INTO spellcheck_user_dictionary (user_id, normalized_term, term, added_at)
    VALUES (?, ?, ?, ?) ON CONFLICT(user_id, normalized_term) DO NOTHING`)
    .run(userId, value.normalized, value.display, now.toISOString());
}

export function removeUserWord(userId: string, term: string, db: DatabaseLike = getDatabase()): void {
  const value = validateTerm(term);
  db.prepare('DELETE FROM spellcheck_user_dictionary WHERE user_id = ? AND normalized_term = ?')
    .run(userId, value.normalized);
}
