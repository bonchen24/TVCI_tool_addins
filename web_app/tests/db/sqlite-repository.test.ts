// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');

describe('privacy database schema', () => {
  let database: (DatabaseLike & { close(): void }) | undefined;

  afterEach(() => {
    database?.close();
    database = undefined;
  });

  it('drops legacy content tables and retains only account and Drive state', () => {
    database = new DatabaseSync(':memory:');
    database!.exec(`
      CREATE TABLE documents (id TEXT, content TEXT, updated_at TEXT);
      CREATE TABLE document_versions (id TEXT, document_id TEXT, version_number INTEGER, content TEXT);
      CREATE TABLE user_templates (id TEXT, content TEXT);
      CREATE TABLE audit_logs (id TEXT, details TEXT);
      INSERT INTO documents (id, content) VALUES ('old-document', 'private draft fixture');
    `);

    initializeDatabase(database!);

    const names = database!
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((row: any) => row.name);

    expect(names).toEqual([
      'drive_connections',
      'oauth_states',
      'recovery_credentials',
      'sessions',
      'spellcheck_user_dictionary',
      'terms_acceptances',
      'users',
    ]);
    expect(names).not.toContain('documents');
    expect(names).not.toContain('document_versions');
    expect(names).not.toContain('user_templates');
    expect(names).not.toContain('audit_logs');
  });

  it('uses an isolated in-memory database for schema migration tests', () => {
    database = new DatabaseSync(':memory:');
    expect(database).toBeDefined();
    initializeDatabase(database!);
  });
});
