import { getDatabase } from '@/db/client';
import type { DatabaseLike } from '@/db/schema';
import { loadEncryptedCredentials, saveEncryptedCredentials, type DriveCredentials } from './crypto';
import { ensureAppFolderTree, type DriveFolderIds } from './folders';
import { GoogleDriveClient } from './google-api';
import { refreshDriveAccessToken, type GoogleOAuthConfig } from './tokens';

export type DriveEnvironment = GoogleOAuthConfig & { encryptionKey: string };

export function driveEnvironment(env: NodeJS.ProcessEnv = process.env): DriveEnvironment {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_REDIRECT_URI;
  const encryptionKey = env.DRIVE_TOKEN_ENCRYPTION_KEY;
  if (!clientId || !clientSecret || !redirectUri || !encryptionKey) throw new Error('Google Drive is not configured on this server.');
  return { clientId, clientSecret, redirectUri, encryptionKey };
}

export async function driveContext(userId: string, db: DatabaseLike = getDatabase(), env: DriveEnvironment = driveEnvironment(), fetcher: typeof fetch = fetch): Promise<{ client: GoogleDriveClient; folders: DriveFolderIds; credentials: DriveCredentials }> {
  let credentials = loadEncryptedCredentials(userId, env.encryptionKey, db);
  if (!credentials) throw new Error('Google Drive is not connected.');
  if (credentials.expiresAt <= Date.now() + 60_000) {
    credentials = await refreshDriveAccessToken(credentials, env, fetcher);
    saveEncryptedCredentials(userId, credentials, env.encryptionKey, db);
  }
  const client = new GoogleDriveClient(credentials.accessToken, fetcher);
  const folders = await ensureAppFolderTree(client, userId, db);
  return { client, folders, credentials };
}
