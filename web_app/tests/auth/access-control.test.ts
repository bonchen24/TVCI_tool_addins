import { describe, expect, it } from 'vitest';
import { protectedRedirect, canAccessAdmin } from '@/auth/access-control';
import type { SessionUser } from '@/auth/service';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';
import { createSession, registerAccount, sessionCookie } from '@/auth/service';
import { protectedApiResponse } from '@/auth/access-control';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');

const session = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: 'user-1',
  username: 'writer_01',
  role: 'user',
  status: 'enabled',
  mustChangePassword: false,
  createdAt: '2026-10-02T00:00:00.000Z',
  expiresAt: '2026-10-09T00:00:00.000Z',
  termsAccepted: true,
  ...overrides,
});

describe('protected route decisions', () => {
  it('redirects unauthenticated editor requests to login', () => {
    expect(protectedRedirect(null, '/')).toBe('/login');
  });

  it('requires current terms and first-login password change before editor access', () => {
    expect(protectedRedirect(session({ termsAccepted: false }), '/')).toBe('/consent');
    expect(protectedRedirect(session({ mustChangePassword: true }), '/')).toBe('/account');
    expect(protectedRedirect(session({ mustChangePassword: true }), '/account')).toBeNull();
  });

  it('denies admin access to ordinary users', () => {
    expect(canAccessAdmin(session())).toBe(false);
    expect(canAccessAdmin(session({ role: 'superadmin' }))).toBe(true);
    expect(canAccessAdmin(null)).toBe(false);
  });
});

describe('protected API session checks', () => {
  let db: (DatabaseLike & { close(): void }) | undefined;

  afterEach(() => { db?.close(); db = undefined; });

  it('rejects missing, disabled, stale-terms, and must-change-password sessions', async () => {
    db = new DatabaseSync(':memory:');
    initializeDatabase(db!);
    const unauthenticated = protectedApiResponse(new Request('http://local/api/ai'), db);
    expect(unauthenticated?.status).toBe(401);

    const account = await import('@/auth/service').then(({ registerAccount }) => registerAccount({
      username: 'api_guard_user', password: randomBytes(32).toString('base64url'), acceptedTerms: true,
    }, db!));
    const issued = createSession(account.user.id, db);
    const request = () => new Request('http://local/api/ai', { headers: { Cookie: sessionCookie(issued.token) } });
    expect(protectedApiResponse(request(), db)).toBeNull();

    db!.prepare("UPDATE terms_acceptances SET version = 'old-version' WHERE user_id = ?").run(account.user.id);
    expect(protectedApiResponse(request(), db)?.status).toBe(428);
    db!.prepare('UPDATE terms_acceptances SET version = ? WHERE user_id = ?').run('2026-10-02-v1', account.user.id);
    db!.prepare('UPDATE users SET must_change_password = 1 WHERE id = ?').run(account.user.id);
    expect(protectedApiResponse(request(), db)?.status).toBe(403);
    db!.prepare("UPDATE users SET status = 'disabled' WHERE id = ?").run(account.user.id);
    expect(protectedApiResponse(request(), db)?.status).toBe(401);
  });
});
