// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';
import { createSession, registerAccount, sessionCookie } from '@/auth/service';
import { startDriveConnection, completeDriveConnection, disconnectDrive, driveStatus } from '@/drive/api';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');
const env = () => ({
  GOOGLE_CLIENT_ID: 'client-id-fixture',
  GOOGLE_CLIENT_SECRET: 'client-secret-fixture',
  GOOGLE_REDIRECT_URI: 'https://app.example.test/api/drive/callback',
  DRIVE_TOKEN_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
});

describe('Drive connection endpoints', () => {
  let db: (DatabaseLike & { close(): void }) | undefined;
  let cookie = '';
  let userId = '';

  beforeEach(async () => {
    db = new DatabaseSync(':memory:');
    initializeDatabase(db!);
    const account = await registerAccount({ username: 'drive_api_user', password: randomBytes(32).toString('base64url'), acceptedTerms: true }, db);
    userId = account.user.id;
    cookie = sessionCookie(createSession(userId, db).token).split(';')[0];
  });
  afterEach(() => { db?.close(); db = undefined; });

  it('starts OAuth only for a signed-in TVCI user and records short-lived state', async () => {
    const start = await startDriveConnection(new Request('https://app.example.test/api/drive/connect', { headers: { Cookie: cookie } }), db!, env());
    expect(start.status).toBe(302);
    const location = new URL(start.headers.get('location')!);
    expect(location.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/drive.file');
    expect(db!.prepare('SELECT user_id FROM oauth_states').get()).toMatchObject({ user_id: userId });
    expect((await startDriveConnection(new Request('https://app.example.test/api/drive/connect'), db!, env())).status).toBe(401);
  });

  it('rejects invalid state without exchanging the authorization code', async () => {
    const fetcher = vi.fn();
    const response = await completeDriveConnection(new Request('https://app.example.test/api/drive/callback?code=code-fixture&state=wrong', { headers: { Cookie: cookie } }), db!, env(), fetcher as typeof fetch);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('drive=error');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('stores exchanged tokens encrypted and initializes the Drive categories', async () => {
    const started = await startDriveConnection(new Request('https://app.example.test/api/drive/connect', { headers: { Cookie: cookie } }), db!, env());
    const state = new URL(started.headers.get('location')!).searchParams.get('state')!;
    let createdFolders = 0;
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes('oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'access-token-fixture', refresh_token: 'refresh-token-fixture', expires_in: 3600 }), { status: 200 });
      if (url.includes('/drive/v3/files?') && init?.method === 'POST') return new Response(JSON.stringify({ id: `folder-${++createdFolders}` }), { status: 200 });
      if (url.includes('/drive/v3/files?')) return new Response(JSON.stringify({ files: [] }), { status: 200 });
      throw new Error(`Unexpected mocked URL ${url}`);
    };
    const response = await completeDriveConnection(new Request(`https://app.example.test/api/drive/callback?code=code-fixture&state=${state}`, { headers: { Cookie: cookie } }), db!, env(), fetcher);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('drive=connected');
    expect(createdFolders).toBe(6);
    const stored = db!.prepare('SELECT credentials_ciphertext, credentials_iv, credentials_tag, folders_json FROM drive_connections WHERE user_id = ?').get(userId) as any;
    expect(JSON.stringify(stored)).not.toContain('access-token-fixture');
    expect(JSON.stringify(stored)).not.toContain('refresh-token-fixture');
    expect(JSON.parse(stored.folders_json)).toHaveProperty('knowledge');
    expect(JSON.parse(stored.folders_json)).toHaveProperty('appData');
  });

  it('disconnect revokes token when possible but never calls Drive file deletion', async () => {
    const key = env();
    const started = await startDriveConnection(new Request('https://app.example.test/api/drive/connect', { headers: { Cookie: cookie } }), db!, key);
    const state = new URL(started.headers.get('location')!).searchParams.get('state')!;
    const exchange: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes('oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'access-token-fixture', refresh_token: 'refresh-token-fixture', expires_in: 3600 }), { status: 200 });
      if (url.includes('/drive/v3/files?') && init?.method === 'POST') return new Response(JSON.stringify({ id: `folder-${randomBytes(3).toString('hex')}` }), { status: 200 });
      return new Response(JSON.stringify({ files: [] }), { status: 200 });
    };
    await completeDriveConnection(new Request(`https://app.example.test/api/drive/callback?code=code-fixture&state=${state}`, { headers: { Cookie: cookie } }), db!, key, exchange);
    const requests: string[] = [];
    const revoker: typeof fetch = async (input) => { requests.push(String(input)); return new Response(null, { status: 200 }); };
    expect((await driveStatus(new Request('https://app.example.test/api/drive/status', { headers: { Cookie: cookie } }), db!)).status).toBe(200);
    const response = await disconnectDrive(new Request('https://app.example.test/api/drive/disconnect', { method: 'POST', headers: { Cookie: cookie } }), db!, key, revoker);
    expect(response.status).toBe(200);
    expect(requests).toEqual(['https://oauth2.googleapis.com/revoke']);
    expect(db!.prepare('SELECT user_id FROM drive_connections WHERE user_id = ?').get(userId)).toBeUndefined();
  });
});
