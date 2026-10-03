import { getDatabase } from '@/db/client';
import type { DatabaseLike } from '@/db/schema';
import { protectedApiResponse, sessionFromRequest, tokenFromRequest } from '@/auth/access-control';
import { disconnectDriveConnection } from './folders';
import { buildDriveAuthorization, consumeOAuthState } from './oauth';
import { loadEncryptedCredentials, saveEncryptedCredentials } from './crypto';
import { driveEnvironment, type DriveEnvironment } from './context';
import { ensureAppFolderTree } from './folders';
import { GoogleDriveClient } from './google-api';
import { exchangeAuthorizationCode } from './tokens';

type Environment = Partial<Pick<NodeJS.ProcessEnv, 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'GOOGLE_REDIRECT_URI' | 'DRIVE_TOKEN_ENCRYPTION_KEY'>>;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const redirect = (request: Request, destination: string) => new Response(null, { status: 302, headers: { Location: new URL(destination, request.url).toString() } });

function configured(env: Environment): DriveEnvironment {
  return driveEnvironment({ ...process.env, ...env } as NodeJS.ProcessEnv);
}

export async function startDriveConnection(request: Request, db: DatabaseLike = getDatabase(), env: Environment = {}): Promise<Response> {
  const denied = protectedApiResponse(request, db);
  if (denied) return denied;
  const session = sessionFromRequest(request, db)!;
  const sessionToken = tokenFromRequest(request);
  if (!sessionToken) return json({ success: false }, 401);
  try {
    const config = configured(env);
    const authorization = buildDriveAuthorization({ sessionToken, userId: session.id, db, clientId: config.clientId, redirectUri: config.redirectUri });
    return new Response(null, { status: 302, headers: { Location: authorization.url, 'Cache-Control': 'no-store' } });
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 503);
  }
}

export async function completeDriveConnection(request: Request, db: DatabaseLike = getDatabase(), env: Environment = {}, fetcher: typeof fetch = fetch): Promise<Response> {
  const denied = protectedApiResponse(request, db);
  if (denied) return denied;
  const url = new URL(request.url);
  const session = sessionFromRequest(request, db)!;
  const sessionToken = tokenFromRequest(request);
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  if (url.searchParams.has('error') || !sessionToken || !code) return redirect(request, '/account?drive=error');
  const stateResult = consumeOAuthState(state, sessionToken, db);
  if (!stateResult || stateResult.userId !== session.id) return redirect(request, '/account?drive=error');
  try {
    const config = configured(env);
    const credentials = await exchangeAuthorizationCode(code, config, fetcher);
    saveEncryptedCredentials(session.id, credentials, config.encryptionKey, db);
    const client = new GoogleDriveClient(credentials.accessToken, fetcher);
    await ensureAppFolderTree(client, session.id, db);
    return redirect(request, '/account?drive=connected');
  } catch {
    disconnectDriveConnection(session.id, db);
    return redirect(request, '/account?drive=error');
  }
}

export async function disconnectDrive(request: Request, db: DatabaseLike = getDatabase(), env: Environment = {}, fetcher: typeof fetch = fetch): Promise<Response> {
  const denied = protectedApiResponse(request, db);
  if (denied) return denied;
  const session = sessionFromRequest(request, db)!;
  try {
    const config = configured(env);
    const credentials = loadEncryptedCredentials(session.id, config.encryptionKey, db);
    if (credentials) {
      try { await new GoogleDriveClient(credentials.accessToken, fetcher).revoke(credentials.refreshToken); }
      catch { /* Credentials are still removed locally if Google's revoke endpoint is unavailable. */ }
    }
  } catch { /* A missing key or unreadable row still results in local disconnection. */ }
  disconnectDriveConnection(session.id, db);
  return json({ success: true, connected: false });
}

export function driveStatus(request: Request, db: DatabaseLike = getDatabase()): Response {
  const denied = protectedApiResponse(request, db);
  if (denied) return denied;
  const session = sessionFromRequest(request, db)!;
  const connected = Boolean(db.prepare('SELECT user_id FROM drive_connections WHERE user_id = ?').get(session.id));
  return json({ success: true, connected });
}
