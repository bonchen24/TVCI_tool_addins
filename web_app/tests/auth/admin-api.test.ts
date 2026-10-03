// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';
import { acceptCurrentTerms, bootstrapSuperadmin, changeAccountPassword, createSession, hashPassword, registerAccount, sessionCookie } from '@/auth/service';
import { adminIssueRecovery, adminListUsers, adminSetStatus } from '@/auth/admin-api';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');
const secret = () => randomBytes(32).toString('base64url');
const requestWithCookie = (url: string, token: string, method = 'GET', body?: unknown) => new Request(url, {
  method,
  headers: { Cookie: sessionCookie(token), ...(body ? { 'Content-Type': 'application/json' } : {}) },
  body: body ? JSON.stringify(body) : undefined,
});

describe('superadmin account API', () => {
  let database: (DatabaseLike & { close(): void }) | undefined;

  beforeEach(() => { database = new DatabaseSync(':memory:'); initializeDatabase(database!); });
  afterEach(() => { database?.close(); database = undefined; });

  it('rejects a normal user from listing or changing accounts', async () => {
    const user = await registerAccount({ username: 'ordinary_user', password: secret(), acceptedTerms: true }, database!);
    const session = createSession(user.user.id, database!);
    expect((await adminListUsers(requestWithCookie('http://local/api/admin/users', session.token), database!)).status).toBe(403);
    expect((await adminSetStatus(requestWithCookie('http://local/api/admin/users/u1', session.token, 'PATCH', { status: 'disabled' }), 'u1', database!)).status).toBe(403);
  });

  it('keeps a bootstrap superadmin out of admin APIs until terms and password setup are complete', async () => {
    const admin = await bootstrapSuperadmin(database!, { SUPERADMIN_USERNAME: 'setup_admin', SUPERADMIN_INITIAL_PASSWORD: secret() });
    let session = createSession(admin!.id, database!);
    expect((await adminListUsers(requestWithCookie('http://local/api/admin/users', session.token), database!)).status).toBe(403);

    acceptCurrentTerms(admin!.id, database!);
    expect((await adminListUsers(requestWithCookie('http://local/api/admin/users', session.token), database!)).status).toBe(403);
    changeAccountPassword(admin!.id, await hashPassword(secret()), database!);
    session = createSession(admin!.id, database!);
    expect((await adminListUsers(requestWithCookie('http://local/api/admin/users', session.token), database!)).status).toBe(200);
  });

  it('lets a superadmin list minimal status and issue a hashed one-time recovery code', async () => {
    const adminPassword = secret();
    const admin = await bootstrapSuperadmin(database!, { SUPERADMIN_USERNAME: 'root_operator', SUPERADMIN_INITIAL_PASSWORD: adminPassword });
    acceptCurrentTerms(admin!.id, database!);
    changeAccountPassword(admin!.id, await hashPassword(secret()), database!);
    const target = await registerAccount({ username: 'target_user', password: secret(), acceptedTerms: true }, database!);
    const session = createSession(admin!.id, database!);
    const response = await adminListUsers(requestWithCookie('http://local/api/admin/users', session.token), database!);
    const listing = await response.json();
    expect(response.status).toBe(200);
    expect(listing.users.find((row: any) => row.username === 'target_user')).toMatchObject({ status: 'enabled', driveConnected: false });
    expect(JSON.stringify(listing)).not.toMatch(/credentials_ciphertext|content|knowledge|reference/i);

    const reset = await adminIssueRecovery(requestWithCookie('http://local/api/admin/users/u1/recovery', session.token, 'POST'), target.user.id, database!);
    const result = await reset.json();
    expect(reset.status).toBe(200);
    expect(result.recoveryCode).toBeTruthy();
    const stored = database!.prepare('SELECT code_hash FROM recovery_credentials WHERE user_id = ?').get(target.user.id) as any;
    expect(stored.code_hash).not.toBe(result.recoveryCode);
  });

  it('allows the superadmin to disable and re-enable an account', async () => {
    const admin = await bootstrapSuperadmin(database!, { SUPERADMIN_USERNAME: 'root_operator', SUPERADMIN_INITIAL_PASSWORD: secret() });
    acceptCurrentTerms(admin!.id, database!);
    changeAccountPassword(admin!.id, await hashPassword(secret()), database!);
    const target = await registerAccount({ username: 'switch_user', password: secret(), acceptedTerms: true }, database!);
    const session = createSession(admin!.id, database!);
    const disable = await adminSetStatus(requestWithCookie('http://local/api/admin/users/u1', session.token, 'PATCH', { status: 'disabled' }), target.user.id, database!);
    expect(disable.status).toBe(200);
    const enable = await adminSetStatus(requestWithCookie('http://local/api/admin/users/u1', session.token, 'PATCH', { status: 'enabled' }), target.user.id, database!);
    expect(enable.status).toBe(200);
  });

  it('does not let admin endpoints create or change another user’s consent', async () => {
    const admin = await bootstrapSuperadmin(database!, { SUPERADMIN_USERNAME: 'consent_admin', SUPERADMIN_INITIAL_PASSWORD: secret() });
    acceptCurrentTerms(admin!.id, database!);
    changeAccountPassword(admin!.id, await hashPassword(secret()), database!);
    const target = await registerAccount({ username: 'consent_target', password: secret(), acceptedTerms: true }, database!);
    const session = createSession(admin!.id, database!);

    database!.prepare('DELETE FROM terms_acceptances WHERE user_id = ?').run(target.user.id);
    const forgedAcceptance = {
      status: 'disabled',
      acceptedTermsVersion: 'forged-current-version',
      acceptedTermsAt: '2099-01-01T00:00:00.000Z',
      termsAccepted: true,
    };
    expect((await adminSetStatus(requestWithCookie('http://local/api/admin/users/u1', session.token, 'PATCH', forgedAcceptance), target.user.id, database!)).status).toBe(200);
    expect(database!.prepare('SELECT id, version, accepted_at FROM terms_acceptances WHERE user_id = ?').all(target.user.id)).toEqual([]);

    database!.prepare('INSERT INTO terms_acceptances (id, user_id, version, accepted_at) VALUES (?, ?, ?, ?)')
      .run('target-old-consent', target.user.id, '2025-01-v1', '2025-01-01T00:00:00.000Z');
    const beforeRecoveryRequest = database!.prepare('SELECT id, version, accepted_at FROM terms_acceptances WHERE user_id = ?').all(target.user.id);
    const recoveryRequest = requestWithCookie('http://local/api/admin/users/u1/recovery', session.token, 'POST', forgedAcceptance);
    expect((await adminIssueRecovery(recoveryRequest, target.user.id, database!)).status).toBe(200);
    expect(database!.prepare('SELECT id, version, accepted_at FROM terms_acceptances WHERE user_id = ?').all(target.user.id))
      .toEqual(beforeRecoveryRequest);
  });
});
