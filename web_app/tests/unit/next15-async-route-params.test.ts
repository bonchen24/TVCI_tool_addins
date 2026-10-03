import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleResourceCollection, handleResourceItem, adminSetStatus, adminIssueRecovery } = vi.hoisted(() => ({
  handleResourceCollection: vi.fn(),
  handleResourceItem: vi.fn(),
  adminSetStatus: vi.fn(),
  adminIssueRecovery: vi.fn(),
}));

vi.mock('@/drive/resource-api', () => ({ handleResourceCollection, handleResourceItem }));
vi.mock('@/auth/admin-api', () => ({ adminSetStatus, adminIssueRecovery }));

import * as driveCollectionRoute from '@app/api/drive/[category]/route';
import * as driveItemRoute from '@app/api/drive/[category]/[id]/route';
import * as adminStatusRoute from '@app/api/admin/users/[id]/route';
import * as adminRecoveryRoute from '@app/api/admin/users/[id]/recovery/route';

describe('Next 15 async route params', () => {
  const request = new Request('http://local/api/test');
  const context = (params: Record<string, string>) => ({ params: Promise.resolve(params) }) as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves category params for Drive collection methods', async () => {
    await driveCollectionRoute.GET(request, context({ category: 'templates' }));
    await driveCollectionRoute.POST(request, context({ category: 'templates' }));

    expect(handleResourceCollection.mock.calls).toEqual([
      [request, 'templates'],
      [request, 'templates'],
    ]);
  });

  it('resolves category and id params for Drive item methods', async () => {
    await driveItemRoute.GET(request, context({ category: 'templates', id: 'doc-1' }));
    await driveItemRoute.PUT(request, context({ category: 'templates', id: 'doc-1' }));
    await driveItemRoute.PATCH(request, context({ category: 'templates', id: 'doc-1' }));
    await driveItemRoute.DELETE(request, context({ category: 'templates', id: 'doc-1' }));

    expect(handleResourceItem.mock.calls).toEqual([
      [request, 'templates', 'doc-1'],
      [request, 'templates', 'doc-1'],
      [request, 'templates', 'doc-1'],
      [request, 'templates', 'doc-1'],
    ]);
  });

  it('resolves user id params for the admin status route', async () => {
    await adminStatusRoute.PATCH(request, context({ id: 'user-1' }));

    expect(adminSetStatus).toHaveBeenCalledWith(request, 'user-1');
  });

  it('resolves user id params for the admin recovery route', async () => {
    await adminRecoveryRoute.POST(request, context({ id: 'user-1' }));

    expect(adminIssueRecovery).toHaveBeenCalledWith(request, 'user-1');
  });
});
