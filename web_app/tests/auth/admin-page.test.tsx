import { describe, expect, it, vi } from 'vitest';
import AdminPage from '@app/(protected)/admin/page';

const { currentServerSession, listAdminUsers, notFound } = vi.hoisted(() => ({
  currentServerSession: vi.fn(),
  listAdminUsers: vi.fn(),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/auth/server', () => ({ currentServerSession }));
vi.mock('@/auth/service', () => ({ listAdminUsers }));

describe('admin page access', () => {
  it('rejects an ordinary user before loading the admin user list', async () => {
    currentServerSession.mockResolvedValue({
      id: 'ordinary-user',
      username: 'ordinary_user',
      role: 'user',
      status: 'enabled',
      mustChangePassword: false,
      createdAt: '2026-10-01T00:00:00.000Z',
      expiresAt: '2026-10-08T00:00:00.000Z',
      termsAccepted: true,
    });

    await expect(AdminPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledOnce();
    expect(listAdminUsers).not.toHaveBeenCalled();
  });
});
