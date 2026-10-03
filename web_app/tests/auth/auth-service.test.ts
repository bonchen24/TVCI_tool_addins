// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { randomBytes, createHash } from 'node:crypto';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';
import {
  acceptCurrentTerms,
  authenticateUser,
  bootstrapSuperadmin,
  createSession,
  getSession,
  listAdminUsers,
  logoutSession,
  recoverAccount,
  registerAccount,
  rotateRecoveryCode,
  SESSION_COOKIE_NAME,
  sessionCookie,
} from '@/auth/service';
import { TERMS_VERSION } from '@/privacy/terms';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');
const secret = () => randomBytes(32).toString('base64url');
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

describe('account authentication service', () => {
  let database: (DatabaseLike & { close(): void }) | undefined;

  beforeEach(() => {
    database = new DatabaseSync(':memory:');
    initializeDatabase(database!);
  });

  afterEach(() => {
    database?.close();
    database = undefined;
    delete process.env.SUPERADMIN_USERNAME;
    delete process.env.SUPERADMIN_INITIAL_PASSWORD;
  });

  it('requires current terms acceptance and stores a password hash only', async () => {
    const password = secret();
    await expect(registerAccount({ username: 'writer_01', password, acceptedTerms: false }, database!))
      .rejects.toThrow(/terms/i);
    expect(database!.prepare('SELECT COUNT(*) AS count FROM users').get()).toMatchObject({ count: 0 });

    const result = await registerAccount({ username: 'writer_01', password, acceptedTerms: true }, database!);
    const stored = database!.prepare('SELECT username, password_hash FROM users WHERE id = ?').get(result.user.id) as any;
    expect(stored.username).toBe('writer_01');
    expect(stored.password_hash).not.toBe(password);
    expect(stored.password_hash).toMatch(/^scrypt\$/);
    expect(database!.prepare('SELECT version FROM terms_acceptances WHERE user_id = ?').get(result.user.id))
      .toMatchObject({ version: TERMS_VERSION });
    expect(result.recoveryCode).toBeTruthy();
  });

  it('stores recovery code hashes and consumes a recovery code once', async () => {
    const password = secret();
    const replacementPassword = secret();
    const account = await registerAccount({ username: 'recover_user', password, acceptedTerms: true }, database!);
    const activeSession = createSession(account.user.id, database!);
    const saved = database!.prepare('SELECT code_hash, consumed_at FROM recovery_credentials WHERE user_id = ?')
      .get(account.user.id) as any;
    expect(saved.code_hash).toBe(sha256(account.recoveryCode));
    expect(saved.code_hash).not.toBe(account.recoveryCode);
    expect(await recoverAccount({ username: 'recover_user', recoveryCode: account.recoveryCode, newPassword: replacementPassword }, database!)).toBe(true);
    expect(getSession(activeSession.token, database!)).toBeNull();
    expect(await recoverAccount({ username: 'recover_user', recoveryCode: account.recoveryCode, newPassword: secret() }, database!)).toBe(false);
    expect(await authenticateUser('recover_user', replacementPassword, database!)).not.toBeNull();
  });

  it('allows exactly one concurrent recovery claimant to consume a code and set the password', async () => {
    const account = await registerAccount({ username: 'race_user', password: secret(), acceptedTerms: true }, database!);
    const passwords = [secret(), secret()];

    const results = await Promise.all(passwords.map((newPassword) => recoverAccount({
      username: 'race_user',
      recoveryCode: account.recoveryCode,
      newPassword,
    }, database!)));

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(database!.prepare('SELECT consumed_at FROM recovery_credentials WHERE user_id = ?').get(account.user.id))
      .toMatchObject({ consumed_at: expect.any(String) });
    const authentications = await Promise.all(passwords.map((password) => authenticateUser('race_user', password, database!)));
    expect(authentications.map(Boolean)).toEqual(results);
  });

  it('rotates the one-time recovery code and invalidates the previous code', async () => {
    const account = await registerAccount({ username: 'rotate_user', password: secret(), acceptedTerms: true }, database!);
    const nextCode = rotateRecoveryCode(account.user.id, database!);
    expect(nextCode).not.toBe(account.recoveryCode);
    expect(await recoverAccount({ username: 'rotate_user', recoveryCode: account.recoveryCode, newPassword: secret() }, database!)).toBe(false);
    expect(await recoverAccount({ username: 'rotate_user', recoveryCode: nextCode, newPassword: secret() }, database!)).toBe(true);
  });

  it('stores only a hash of the random session token and sets secure cookie properties', async () => {
    const account = await registerAccount({ username: 'session_user', password: secret(), acceptedTerms: true }, database!);
    const issued = createSession(account.user.id, database!);
    const persisted = database!.prepare('SELECT token_hash FROM sessions WHERE token_hash = ?').get(sha256(issued.token));
    expect(persisted).toBeTruthy();
    expect(issued.token).not.toBe(sha256(issued.token));
    expect(getSession(issued.token, database!)).toMatchObject({ id: account.user.id, role: 'user' });
    expect(sessionCookie(issued.token, true)).toContain(`${SESSION_COOKIE_NAME}=${issued.token}`);
    expect(sessionCookie(issued.token, true)).toMatch(/HttpOnly; Secure; SameSite=Lax; Path=\//);
    expect(sessionCookie(issued.token, false)).not.toContain('Secure');
    logoutSession(issued.token, database!);
    expect(getSession(issued.token, database!)).toBeNull();
  });

  it('rejects disabled and expired sessions', async () => {
    const account = await registerAccount({ username: 'disabled_user', password: secret(), acceptedTerms: true }, database!);
    const issued = createSession(account.user.id, database!);
    database!.prepare("UPDATE users SET status = 'disabled' WHERE id = ?").run(account.user.id);
    expect(getSession(issued.token, database!)).toBeNull();

    database!.prepare("UPDATE users SET status = 'enabled' WHERE id = ?").run(account.user.id);
    database!.prepare("UPDATE sessions SET expires_at = '2000-01-01T00:00:00.000Z' WHERE token_hash = ?")
      .run(sha256(issued.token));
    expect(getSession(issued.token, database!)).toBeNull();
  });

  it('bootstraps a superadmin only from environment and requires first-login password change', async () => {
    const password = secret();
    const account = await bootstrapSuperadmin(database!, {
      SUPERADMIN_USERNAME: 'configured_admin',
      SUPERADMIN_INITIAL_PASSWORD: password,
    });
    expect(account).toMatchObject({ username: 'configured_admin', role: 'superadmin', mustChangePassword: true });
    expect(await authenticateUser('configured_admin', password, database!)).toMatchObject({ user: { role: 'superadmin', mustChangePassword: true } });
    expect(await bootstrapSuperadmin(database!, {})).toBeNull();
  });

  it('reports current consent from the latest acceptance and returns only the safe admin fields', async () => {
    const account = await registerAccount({ username: 'listed_user', password: secret(), acceptedTerms: true }, database!);
    database!.prepare('DELETE FROM terms_acceptances WHERE user_id = ?').run(account.user.id);
    database!.prepare('INSERT INTO terms_acceptances (id, user_id, version, accepted_at) VALUES (?, ?, ?, ?)')
      .run('old-consent', account.user.id, '2025-01-v1', '2025-01-01T00:00:00.000Z');
    database!.prepare('INSERT INTO terms_acceptances (id, user_id, version, accepted_at) VALUES (?, ?, ?, ?)')
      .run('current-consent', account.user.id, TERMS_VERSION, '2026-10-02T00:00:00.000Z');

    const rows = listAdminUsers(database!);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: account.user.id,
      username: 'listed_user',
      role: 'user',
      status: 'enabled',
      createdAt: expect.any(String),
      driveConnected: false,
      mustChangePassword: false,
      acceptedTermsVersion: TERMS_VERSION,
      acceptedTermsAt: '2026-10-02T00:00:00.000Z',
      currentTermsVersion: TERMS_VERSION,
      consentStatus: 'accepted',
    });
    expect(Object.keys(rows[0]).sort()).toEqual([
      'acceptedTermsAt', 'acceptedTermsVersion', 'consentStatus', 'createdAt', 'currentTermsVersion',
      'driveConnected', 'id', 'mustChangePassword', 'role', 'status', 'username',
    ]);
    expect(JSON.stringify(rows[0])).not.toMatch(/password_hash|recovery|token_hash|credentials_ciphertext|root_folder_id|content|knowledge|reference|user.agent|\bip\b/i);
  });

  it('marks an account for reacceptance when its latest consent is an older version', async () => {
    const account = await registerAccount({ username: 'old_terms_user', password: secret(), acceptedTerms: true }, database!);
    database!.prepare('DELETE FROM terms_acceptances WHERE user_id = ?').run(account.user.id);
    database!.prepare('INSERT INTO terms_acceptances (id, user_id, version, accepted_at) VALUES (?, ?, ?, ?)')
      .run('current-consent', account.user.id, TERMS_VERSION, '2026-10-01T00:00:00.000Z');
    database!.prepare('INSERT INTO terms_acceptances (id, user_id, version, accepted_at) VALUES (?, ?, ?, ?)')
      .run('latest-old-consent', account.user.id, '2025-01-v1', '2026-10-02T00:00:00.000Z');

    expect(listAdminUsers(database!)[0]).toMatchObject({
      acceptedTermsVersion: '2025-01-v1',
      acceptedTermsAt: '2026-10-02T00:00:00.000Z',
      currentTermsVersion: TERMS_VERSION,
      consentStatus: 'needs_reacceptance',
    });
  });

  it('marks an account without an acceptance row as not accepted', async () => {
    const account = await bootstrapSuperadmin(database!, {
      SUPERADMIN_USERNAME: 'consentless_admin',
      SUPERADMIN_INITIAL_PASSWORD: secret(),
    });

    expect(listAdminUsers(database!)[0]).toMatchObject({
      id: account!.id,
      acceptedTermsVersion: null,
      acceptedTermsAt: null,
      currentTermsVersion: TERMS_VERSION,
      consentStatus: 'not_accepted',
    });
  });

  it('records consent only for the current terms version', async () => {
    const account = await registerAccount({ username: 'terms_user', password: secret(), acceptedTerms: true }, database!);
    expect(acceptCurrentTerms(account.user.id, database!)).toBe(true);
    expect(database!.prepare('SELECT version FROM terms_acceptances WHERE user_id = ? ORDER BY accepted_at DESC LIMIT 1')
      .get(account.user.id)).toMatchObject({ version: TERMS_VERSION });
  });
});
