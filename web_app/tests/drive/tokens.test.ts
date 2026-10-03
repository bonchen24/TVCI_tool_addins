// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { exchangeAuthorizationCode, refreshDriveAccessToken } from '@/drive/tokens';

describe('Google Drive token exchange', () => {
  it('exchanges a code for offline token material without requesting extra scopes', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ access_token: 'access-fixture', refresh_token: 'refresh-fixture', expires_in: 3600 }), { status: 200 }));
    const result = await exchangeAuthorizationCode('authorization-code-fixture', {
      clientId: 'client-id-fixture', clientSecret: 'client-secret-fixture', redirectUri: 'https://app.example.test/callback',
    }, fetcher);
    expect(result.accessToken).toBe('access-fixture');
    expect(result.refreshToken).toBe('refresh-fixture');
    const form = new URLSearchParams(String(fetcher.mock.calls[0][1]?.body));
    expect(form.get('grant_type')).toBe('authorization_code');
    expect(form.get('client_secret')).toBe('client-secret-fixture');
  });

  it('preserves the existing refresh token when Google omits it on refresh', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ access_token: 'rotated-access', expires_in: 1800 }), { status: 200 }));
    const result = await refreshDriveAccessToken({ accessToken: 'expired', refreshToken: 'kept-refresh', expiresAt: 0 }, {
      clientId: 'client-id-fixture', clientSecret: 'client-secret-fixture', redirectUri: 'https://app.example.test/callback',
    }, fetcher);
    expect(result).toMatchObject({ accessToken: 'rotated-access', refreshToken: 'kept-refresh' });
  });
});
