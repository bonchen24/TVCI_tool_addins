// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';
import { SESSION_COOKIE_NAME, createSession } from '@/auth/service';
import { TERMS_VERSION } from '@/privacy/terms';
import { addUserDictionaryTerm, deleteUserDictionaryTerm, getUserDictionary } from './api';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');

describe('account dictionary API', () => {
  let database: (DatabaseLike & { close(): void }) | undefined;
  let userOneToken = '';
  let userTwoToken = '';

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    initializeDatabase(database!);
    for (const [id, username] of [['user-1', 'one'], ['user-2', 'two']]) {
      database!.prepare(`INSERT INTO users (id, username, password_hash, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)`).run(id, username, 'hash', '2026-01-01', '2026-01-01');
      database!.prepare(`INSERT INTO terms_acceptances (id, user_id, version, accepted_at)
        VALUES (?, ?, ?, ?)`).run(`terms-${id}`, id, TERMS_VERSION, '2026-01-01');
    }
    userOneToken = createSession('user-1', database!).token;
    userTwoToken = createSession('user-2', database!).token;
  });

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  function request(token: string, method = 'GET', body?: unknown): Request {
    return new Request('http://localhost/api/spellcheck/dictionary', {
      method,
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  it('requires an authenticated accepted account for dictionary reads', async () => {
    const response = await getUserDictionary(new Request('http://localhost/api/spellcheck/dictionary'), database!);
    expect(response.status).toBe(401);
  });

  it('stores only the submitted term and keeps each account dictionary separate', async () => {
    const added = await addUserDictionaryTerm(request(userOneToken, 'POST', { term: '  Xí nghiệp  ' }), database!);
    const ownList = await getUserDictionary(request(userOneToken), database!);
    const otherList = await getUserDictionary(request(userTwoToken), database!);

    expect(added.status).toBe(201);
    expect(await ownList.json()).toMatchObject({ words: ['Xí nghiệp'] });
    expect(await otherList.json()).toMatchObject({ words: [] });
  });

  it('rejects document-shaped, malformed, and overlong dictionary values', async () => {
    const documentText = 'Toàn văn văn bản gửi lên';
    const oversized = await addUserDictionaryTerm(request(userOneToken, 'POST', { term: 't'.repeat(81) }), database!);
    const malformed = await addUserDictionaryTerm(request(userOneToken, 'POST', { documentText }), database!);

    expect(oversized.status).toBe(400);
    expect(malformed.status).toBe(400);
    expect(await getUserDictionary(request(userOneToken), database!).then((response) => response.json()))
      .toMatchObject({ words: [] });
  });

  it('deletes only the requested term from the active account', async () => {
    await addUserDictionaryTerm(request(userOneToken, 'POST', { term: 'Vinacomin' }), database!);
    await addUserDictionaryTerm(request(userTwoToken, 'POST', { term: 'Vinacomin' }), database!);

    const removed = await deleteUserDictionaryTerm(request(userOneToken, 'DELETE', { term: 'Vinacomin' }), database!);

    expect(removed.status).toBe(200);
    expect(await getUserDictionary(request(userOneToken), database!).then((response) => response.json()))
      .toMatchObject({ words: [] });
    expect(await getUserDictionary(request(userTwoToken), database!).then((response) => response.json()))
      .toMatchObject({ words: ['Vinacomin'] });
  });
});
