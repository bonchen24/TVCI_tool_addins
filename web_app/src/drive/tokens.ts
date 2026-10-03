import type { DriveCredentials } from './crypto';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

type TokenResponse = { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };

async function requestToken(form: URLSearchParams, fetcher: typeof fetch): Promise<TokenResponse> {
  const response = await fetcher('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  let payload: TokenResponse;
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok || !payload.access_token) throw new Error('Google authorization could not be completed.');
  return payload;
}

export async function exchangeAuthorizationCode(code: string, config: GoogleOAuthConfig, fetcher: typeof fetch = fetch): Promise<DriveCredentials> {
  const form = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });
  const token = await requestToken(form, fetcher);
  if (!token.refresh_token) throw new Error('Google did not provide an offline refresh token. Reconnect and approve Drive access.');
  return {
    accessToken: token.access_token!,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + Math.max(60, token.expires_in || 3600) * 1000,
  };
}

export async function refreshDriveAccessToken(current: DriveCredentials, config: GoogleOAuthConfig, fetcher: typeof fetch = fetch): Promise<DriveCredentials> {
  const form = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: current.refreshToken,
    grant_type: 'refresh_token',
  });
  const token = await requestToken(form, fetcher);
  return {
    accessToken: token.access_token!,
    refreshToken: token.refresh_token || current.refreshToken,
    expiresAt: Date.now() + Math.max(60, token.expires_in || 3600) * 1000,
  };
}
