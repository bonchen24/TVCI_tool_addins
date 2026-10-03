import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { getDatabase } from '@/db/client';
import type { DatabaseLike } from '@/db/schema';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function digest(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function sameDigest(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

export function buildDriveAuthorization(input: {
  sessionToken: string;
  userId: string;
  db?: DatabaseLike;
  clientId: string;
  redirectUri: string;
  now?: Date;
}): { url: string; state: string } {
  const db = input.db || getDatabase();
  const now = input.now || new Date();
  const state = randomBytes(32).toString('base64url');
  const sessionHash = digest(input.sessionToken);
  db.prepare('INSERT INTO oauth_states (state_hash, session_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(digest(state), sessionHash, input.userId, new Date(now.getTime() + OAUTH_STATE_TTL_MS).toISOString(), now.toISOString());
  const authorization = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorization.searchParams.set('client_id', input.clientId);
  authorization.searchParams.set('redirect_uri', input.redirectUri);
  authorization.searchParams.set('response_type', 'code');
  authorization.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file');
  authorization.searchParams.set('access_type', 'offline');
  authorization.searchParams.set('include_granted_scopes', 'true');
  authorization.searchParams.set('prompt', 'consent');
  authorization.searchParams.set('state', state);
  return { url: authorization.toString(), state };
}

export function consumeOAuthState(state: string, sessionToken: string, db: DatabaseLike = getDatabase(), now = new Date()): { userId: string } | null {
  if (!state || state.length > 256 || !sessionToken) return null;
  const stateHash = digest(state);
  const row = db.prepare('SELECT state_hash, session_hash, user_id, expires_at FROM oauth_states WHERE state_hash = ?').get(stateHash) as {
    state_hash: string;
    session_hash: string;
    user_id: string;
    expires_at: string;
  } | undefined;
  if (!row) return null;
  if (Date.parse(row.expires_at) <= now.getTime()) {
    db.prepare('DELETE FROM oauth_states WHERE state_hash = ?').run(stateHash);
    return null;
  }
  if (!sameDigest(row.session_hash, digest(sessionToken))) return null;
  db.prepare('DELETE FROM oauth_states WHERE state_hash = ?').run(stateHash);
  return { userId: row.user_id };
}
