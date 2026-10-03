import { describe, expect, it, vi } from 'vitest';

const { rotateRecovery } = vi.hoisted(() => ({ rotateRecovery: vi.fn() }));

vi.mock('@/auth/api', () => ({ rotateRecovery }));

import { POST } from '@app/api/account/recovery/route';

describe('Next 15 route handler wrappers', () => {
  it('does not pass route context as the recovery handler database override', async () => {
    const request = new Request('http://local/api/account/recovery', { method: 'POST' });
    const context = { params: Promise.resolve({}) };

    await (POST as any)(request, context);

    expect(rotateRecovery.mock.calls).toEqual([[request]]);
  });
});
