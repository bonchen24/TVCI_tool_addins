// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';
import * as authApi from '@/auth/api';
import {
  bootstrapSuperadmin,
  createSession,
  getSession,
  registerAccount,
  sessionCookie,
  verifyPassword,
} from '@/auth/service';
import { saveEncryptedCredentials } from '@/drive/crypto';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');
const CURRENT_PASSWORD = 'current-password-fixture-71';
const NEW_PASSWORD = 'new-password-fixture-84';
const encryptionKey = () => randomBytes(32).toString('base64');
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const api = authApi as unknown as { deleteAccount?: (request: Request, db: DatabaseLike, env?: { DRIVE_TOKEN_ENCRYPTION_KEY?: string }, fetcher?: typeof fetch) => Promise<Response> };

describe('account lifecycle APIs', () => {
  let database: (DatabaseLike & { close(): void }) | undefined;
  let userId = '';
  let cookie = '';

  beforeEach(async () => {
    database = new DatabaseSync(':memory:');
    initializeDatabase(database!);
    const account = await registerAccount({ username: 'lifecycle_user', password: CURRENT_PASSWORD, acceptedTerms: true }, database!);
    userId = account.user.id;
    cookie = sessionCookie(createSession(userId, database!).token).split(';')[0];
  });

  afterEach(() => {
    database?.close();
    database = undefined;
    delete process.env.SUPERADMIN_USERNAME;
    delete process.env.SUPERADMIN_INITIAL_PASSWORD;
  });

  it('rejects a wrong current password without changing the hash or disclosing account secrets', async () => {
    const oldHash = (database!.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any).password_hash;
    const oldToken = decodeURIComponent(cookie.split('=')[1]);
    const response = await authApi.changePassword(new Request('http://localhost/api/auth/change-password', {
      method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'incorrect-current-password', newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }),
    }), database!);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ success: false, error: 'Thông tin xác thực không hợp lệ.' });
    expect(JSON.stringify(body)).not.toContain(oldHash);
    expect(database!.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId)).toMatchObject({ password_hash: oldHash });
    expect(getSession(oldToken, database!)).toMatchObject({ id: userId });
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('changes the password only for the logged-in account and replaces every session', async () => {
    database!.prepare('UPDATE users SET must_change_password = 1 WHERE id = ?').run(userId);
    const secondSession = createSession(userId, database!);
    const oldToken = decodeURIComponent(cookie.split('=')[1]);
    const victim = await registerAccount({ username: 'other_account', password: 'other-password-fixture-94', acceptedTerms: true }, database!);
    const victimHash = (database!.prepare('SELECT password_hash FROM users WHERE id = ?').get(victim.user.id) as any).password_hash;

    const response = await authApi.changePassword(new Request('http://localhost/api/auth/change-password', {
      method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'other_account', currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }),
    }), database!);
    const body = await response.json();
    const newCookie = response.headers.get('set-cookie') || '';
    const newToken = decodeURIComponent(newCookie.split(';')[0].split('=')[1] || '');
    const currentHash = (database!.prepare('SELECT password_hash, must_change_password FROM users WHERE id = ?').get(userId) as any);

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(newCookie).toMatch(/^tvci_session=.+; HttpOnly; SameSite=Lax; Path=\//);
    expect(newToken).toBeTruthy();
    expect(await verifyPassword(NEW_PASSWORD, currentHash.password_hash)).toBe(true);
    expect(currentHash.must_change_password).toBe(0);
    expect(getSession(oldToken, database!)).toBeNull();
    expect(getSession(secondSession.token, database!)).toBeNull();
    expect(getSession(newToken, database!)).toMatchObject({ id: userId, username: 'lifecycle_user', mustChangePassword: false });
    expect((database!.prepare('SELECT password_hash FROM users WHERE id = ?').get(victim.user.id) as any).password_hash).toBe(victimHash);
    expect(JSON.stringify(body)).not.toMatch(/password|hash|fixture/i);
  });

  it('rejects a password confirmation mismatch without changing the account', async () => {
    const oldHash = (database!.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any).password_hash;
    const response = await authApi.changePassword(new Request('http://localhost/api/auth/change-password', {
      method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: 'different-password-fixture-94' }),
    }), database!);

    expect(response.status).toBe(400);
    expect(database!.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId)).toMatchObject({ password_hash: oldHash });
  });

  it('rejects unauthenticated account deletion', async () => {
    expect(api.deleteAccount).toBeTypeOf('function');
    const response = await api.deleteAccount!(new Request('http://localhost/api/account', { method: 'DELETE' }), database!);
    expect(response.status).toBe(401);
    expect(database!.prepare('SELECT id FROM users WHERE id = ?').get(userId)).toBeTruthy();
  });

  it('rejects account deletion with a wrong current password', async () => {
    expect(api.deleteAccount).toBeTypeOf('function');
    const response = await api.deleteAccount!(new Request('http://localhost/api/account', {
      method: 'DELETE', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'incorrect-current-password', confirmedDataDeletion: true, usernameConfirmation: 'lifecycle_user' }),
    }), database!);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Thông tin xác thực không hợp lệ.');
    expect(database!.prepare('SELECT id FROM users WHERE id = ?').get(userId)).toBeTruthy();
  });

  it.each([
    { label: 'the explicit checkbox is missing', confirmedDataDeletion: false, usernameConfirmation: 'lifecycle_user' },
    { label: 'the typed username does not match', confirmedDataDeletion: true, usernameConfirmation: 'another_user' },
  ])('rejects deletion when $label', async ({ confirmedDataDeletion, usernameConfirmation }) => {
    expect(api.deleteAccount).toBeTypeOf('function');
    const response = await api.deleteAccount!(new Request('http://localhost/api/account', {
      method: 'DELETE', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: CURRENT_PASSWORD, confirmedDataDeletion, usernameConfirmation }),
    }), database!);

    expect(response.status).toBe(400);
    expect(database!.prepare('SELECT id FROM users WHERE id = ?').get(userId)).toBeTruthy();
  });

  it('deletes the normal account and cascaded metadata after best-effort credential revocation only', async () => {
    const key = encryptionKey();
    const currentToken = decodeURIComponent(cookie.split('=')[1]);
    const currentSessionHash = sha256(currentToken);
    createSession(userId, database!);
    database!.prepare('INSERT INTO oauth_states (state_hash, session_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(sha256('oauth-state-fixture'), currentSessionHash, userId, '2099-01-01T00:00:00.000Z', '2026-10-02T00:00:00.000Z');
    database!.prepare('INSERT INTO spellcheck_user_dictionary (user_id, normalized_term, term, added_at) VALUES (?, ?, ?, ?)')
      .run(userId, 'fixture-term', 'fixture-term', '2026-10-02T00:00:00.000Z');
    saveEncryptedCredentials(userId, { accessToken: 'access-token-fixture', refreshToken: 'refresh-token-fixture', expiresAt: Date.now() + 3_600_000 }, key, database!);
    const requests: Array<{ url: string; method: string }> = [];
    const fetcher: typeof fetch = async (input, init) => {
      requests.push({ url: String(input), method: String(init?.method || 'GET') });
      return new Response(null, { status: 200 });
    };

    expect(api.deleteAccount).toBeTypeOf('function');
    const response = await api.deleteAccount!(new Request('http://localhost/api/account', {
      method: 'DELETE', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: CURRENT_PASSWORD, confirmedDataDeletion: true, usernameConfirmation: ' LIFECYCLE_USER ' }),
    }), database!, { DRIVE_TOKEN_ENCRYPTION_KEY: key }, fetcher);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(requests).toEqual([{ url: 'https://oauth2.googleapis.com/revoke', method: 'POST' }]);
    expect(requests.some(({ url }) => /\/drive\/v3\/files|trash/i.test(url))).toBe(false);
    expect(response.headers.get('set-cookie')).toMatch(/^tvci_session=; HttpOnly; SameSite=Lax; Path=\/; Max-Age=0$/);
    for (const table of ['users', 'sessions', 'recovery_credentials', 'terms_acceptances', 'drive_connections', 'spellcheck_user_dictionary', 'oauth_states']) {
      expect(database!.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()).toMatchObject({ count: 0 });
    }
    expect(JSON.stringify(body)).not.toMatch(/password|hash|token|credential|fixture/i);
  });

  it('deletes the local account even when Google credential revocation fails', async () => {
    const key = encryptionKey();
    saveEncryptedCredentials(userId, { accessToken: 'access-token-fixture', refreshToken: 'refresh-token-fixture', expiresAt: Date.now() + 3_600_000 }, key, database!);
    const revoke = vi.fn(async () => { throw new Error('revocation failed'); }) as unknown as typeof fetch;

    expect(api.deleteAccount).toBeTypeOf('function');
    const response = await api.deleteAccount!(new Request('http://localhost/api/account', {
      method: 'DELETE', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: CURRENT_PASSWORD, confirmedDataDeletion: true, usernameConfirmation: 'lifecycle_user' }),
    }), database!, { DRIVE_TOKEN_ENCRYPTION_KEY: key }, revoke);

    expect(response.status).toBe(200);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(database!.prepare('SELECT id FROM users WHERE id = ?').get(userId)).toBeUndefined();
    expect(database!.prepare('SELECT user_id FROM drive_connections WHERE user_id = ?').get(userId)).toBeUndefined();
  });

  it('blocks superadmin self-deletion', async () => {
    const admin = await bootstrapSuperadmin(database!, { SUPERADMIN_USERNAME: 'lifecycle_admin', SUPERADMIN_INITIAL_PASSWORD: CURRENT_PASSWORD });
    const adminCookie = sessionCookie(createSession(admin!.id, database!).token).split(';')[0];
    expect(api.deleteAccount).toBeTypeOf('function');
    const response = await api.deleteAccount!(new Request('http://localhost/api/account', {
      method: 'DELETE', headers: { Cookie: adminCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: CURRENT_PASSWORD, confirmedDataDeletion: true, usernameConfirmation: 'lifecycle_admin' }),
    }), database!);

    expect(response.status).toBe(403);
    expect((await response.json()).error).toContain('superadmin');
    expect(database!.prepare('SELECT id FROM users WHERE id = ?').get(admin!.id)).toBeTruthy();
  });
});
