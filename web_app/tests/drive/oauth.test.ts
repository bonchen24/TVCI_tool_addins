// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';
import { createSession, registerAccount } from '@/auth/service';
import { buildDriveAuthorization, consumeOAuthState } from '@/drive/oauth';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');

describe('Google Drive OAuth security', () => {
  let db: (DatabaseLike & { close(): void }) | undefined;
  let userId = '';
  let sessionToken = '';

  beforeEach(async () => {
    db = new DatabaseSync(':memory:');
    initializeDatabase(db!);
    const account = await registerAccount({ username: 'drive_user', password: randomBytes(32).toString('base64url'), acceptedTerms: true }, db);
    userId = account.user.id;
    sessionToken = createSession(userId, db).token;
  });
  afterEach(() => { db?.close(); db = undefined; });

  it('requests only drive.file and binds state to the current server session', () => {
    const { url, state } = buildDriveAuthorization({
      sessionToken,
      userId,
      db: db!,
      clientId: 'test-client-id',
      redirectUri: 'https://app.example.test/api/drive/callback',
      now: new Date('2026-10-02T00:00:00.000Z'),
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/drive.file');
    expect(url).not.toMatch(/drive\.readonly|\/auth\/drive(?:[& ]|$)|email|profile|openid/i);
    expect(parsed.searchParams.get('access_type')).toBe('offline');
    expect(parsed.searchParams.get('state')).toBe(state);
    const stored = db!.prepare('SELECT state_hash, session_hash, user_id, expires_at FROM oauth_states').get() as any;
    expect(stored.state_hash).not.toBe(state);
    expect(stored.user_id).toBe(userId);
    expect(consumeOAuthState(state, sessionToken, db!, new Date('2026-10-02T00:01:00.000Z'))).toMatchObject({ userId });
    expect(consumeOAuthState(state, sessionToken, db!)).toBeNull();
  });

  it('rejects state replay, expiry, and a state returned in another session', () => {
    const first = buildDriveAuthorization({ sessionToken, userId, db: db!, clientId: 'test-client-id', redirectUri: 'https://app.example.test/callback' });
    const otherSession = randomBytes(32).toString('base64url');
    expect(consumeOAuthState(first.state, otherSession, db!)).toBeNull();
    expect(consumeOAuthState(first.state, sessionToken, db!)).toMatchObject({ userId });
    expect(consumeOAuthState(first.state, sessionToken, db!)).toBeNull();

    const expired = buildDriveAuthorization({ sessionToken, userId, db: db!, clientId: 'test-client-id', redirectUri: 'https://app.example.test/callback', now: new Date('2026-10-02T00:00:00.000Z') });
    expect(consumeOAuthState(expired.state, sessionToken, db!, new Date('2026-10-02T00:16:00.000Z'))).toBeNull();
  });
});
