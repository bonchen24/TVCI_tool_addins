// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';
import { login } from '@/auth/api';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');

describe('authentication route bootstrap', () => {
  let database: (DatabaseLike & { close(): void }) | undefined;
  afterEach(() => {
    database?.close(); database = undefined;
    delete process.env.SUPERADMIN_USERNAME;
    delete process.env.SUPERADMIN_INITIAL_PASSWORD;
  });

  it('creates the configured superadmin during login without assuming terms consent', async () => {
    database = new DatabaseSync(':memory:');
    initializeDatabase(database!);
    process.env.SUPERADMIN_USERNAME = 'env_admin';
    process.env.SUPERADMIN_INITIAL_PASSWORD = randomBytes(24).toString('base64url');

    const response = await login(new Request('http://localhost/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'env_admin', password: process.env.SUPERADMIN_INITIAL_PASSWORD }),
    }), database!);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toMatchObject({ username: 'env_admin', role: 'superadmin', mustChangePassword: true });
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(database!.prepare('SELECT COUNT(*) AS count FROM terms_acceptances').get()).toMatchObject({ count: 0 });
  });
});
