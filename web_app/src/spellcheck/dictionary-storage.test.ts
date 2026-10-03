// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';
import { addUserWord, listUserWords, removeUserWord } from './dictionary-storage';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');

describe('account spell-check dictionary storage', () => {
  let database: (DatabaseLike & { close(): void }) | undefined;

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    initializeDatabase(database!);
    database!.prepare(`INSERT INTO users (id, username, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)`).run('user-1', 'one', 'hash', '2026-01-01', '2026-01-01');
    database!.prepare(`INSERT INTO users (id, username, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)`).run('user-2', 'two', 'hash', '2026-01-01', '2026-01-01');
  });

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  it('normalizes duplicates and keeps words isolated to their account', () => {
    addUserWord('user-1', '  Xí nghiệp  ', database!);
    addUserWord('user-1', 'xí nghiệp', database!);

    expect(listUserWords('user-1', database!)).toEqual(['Xí nghiệp']);
    expect(listUserWords('user-2', database!)).toEqual([]);
  });

  it('removes only the selected account term', () => {
    addUserWord('user-1', 'Vinacomin', database!);
    addUserWord('user-2', 'Vinacomin', database!);

    removeUserWord('user-1', 'Vinacomin', database!);

    expect(listUserWords('user-1', database!)).toEqual([]);
    expect(listUserWords('user-2', database!)).toEqual(['Vinacomin']);
  });

  it('rejects empty, overly long, and control-character terms', () => {
    expect(() => addUserWord('user-1', '   ', database!)).toThrow(/term/i);
    expect(() => addUserWord('user-1', 'x'.repeat(81), database!)).toThrow(/term/i);
    expect(() => addUserWord('user-1', 'từ\nẩn', database!)).toThrow(/term/i);
  });
});
