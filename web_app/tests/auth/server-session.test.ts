import { beforeEach, describe, expect, it, vi } from 'vitest';

const dependencies = vi.hoisted(() => ({
  cookies: vi.fn(),
  getDatabase: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('next/headers', () => ({ cookies: dependencies.cookies }));
vi.mock('@/db/client', () => ({ getDatabase: dependencies.getDatabase }));
vi.mock('@/auth/service', () => ({
  SESSION_COOKIE_NAME: 'tvci_session',
  getSession: dependencies.getSession,
}));

import { currentServerSession } from '@/auth/server';

describe('current server session', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reads the session cookie from Next’s asynchronous cookie store', async () => {
    const cookieStore = { get: vi.fn().mockReturnValue({ value: 'session-token' }) };
    const database = { name: 'database' };
    const session = { id: 'user-1' };
    dependencies.cookies.mockResolvedValue(cookieStore);
    dependencies.getDatabase.mockReturnValue(database);
    dependencies.getSession.mockReturnValue(session);

    await expect(currentServerSession()).resolves.toBe(session);

    expect(cookieStore.get).toHaveBeenCalledWith('tvci_session');
    expect(dependencies.getSession).toHaveBeenCalledWith('session-token', database);
  });
});
