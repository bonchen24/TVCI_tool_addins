// @vitest-environment node
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('server content persistence routes', () => {
  it('does not expose document body or audit persistence API routes', () => {
    expect(existsSync('app/api/documents/route.ts')).toBe(false);
    expect(existsSync('app/api/documents/[id]/route.ts')).toBe(false);
    expect(existsSync('app/api/audits/route.ts')).toBe(false);
  });
});
