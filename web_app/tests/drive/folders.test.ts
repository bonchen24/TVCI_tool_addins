// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DRIVE_CATEGORIES, appManagedFilesQuery, disconnectDriveConnection } from '@/drive/folders';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';
import { createRequire } from 'node:module';
import { vi } from 'vitest';
import { ensureAppFolderTree } from '@/drive/folders';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');

describe('Drive category and disconnect contract', () => {
  it('keeps Documents, Templates, Knowledge, References, and AppData distinct', () => {
    expect(Object.values(DRIVE_CATEGORIES)).toEqual(['Documents', 'Templates', 'Knowledge', 'References', 'AppData']);
    const query = appManagedFilesQuery('folder-1');
    expect(query).toContain("'folder-1' in parents");
    expect(query).toContain("key='tvciManaged'");
    expect(query).toContain('trashed=false');
  });

  it('creates the canonical Drive root and five distinct category folders', async () => {
    const db = new DatabaseSync(':memory:') as DatabaseLike & { close(): void };
    initializeDatabase(db);
    db.prepare("INSERT INTO users (id, username, password_hash, role, status, created_at, updated_at) VALUES ('u1','u1','hash','user','enabled','now','now')").run();
    db.prepare("INSERT INTO drive_connections (user_id, credentials_ciphertext, credentials_iv, credentials_tag, connected_at, updated_at) VALUES ('u1','cipher','iv','tag','now','now')").run();
    let nextId = 0;
    const client = {
      findAppFolder: vi.fn(async (_name: string, _parentId: string | null, _category: string | null, _isRoot: boolean) => null),
      createAppFolder: vi.fn(async (name: string, _parentId: string | null, _appProperties: Record<string, string>) => ({ id: `folder-${++nextId}`, name })),
    };
    const folders = await ensureAppFolderTree(client, 'u1', db);
    expect(Object.keys(folders)).toEqual(['documents', 'templates', 'knowledge', 'references', 'appData']);
    expect(client.createAppFolder).toHaveBeenCalledTimes(6);
    expect(client.createAppFolder.mock.calls.map(([name]) => name)).toEqual([
      'TVCI DocMaster', 'Documents', 'Templates', 'Knowledge', 'References', 'AppData',
    ]);
    expect(db.prepare('SELECT root_folder_id, folders_json FROM drive_connections WHERE user_id = ?').get('u1')).toBeTruthy();
    db.close();
  });

  it('disconnects encrypted connection state without deleting any Drive files', () => {
    const db = new DatabaseSync(':memory:') as DatabaseLike & { close(): void };
    initializeDatabase(db);
    db.prepare("INSERT INTO users (id, username, password_hash, role, status, created_at, updated_at) VALUES ('u1','u1','hash','user','enabled','now','now')").run();
    db.prepare("INSERT INTO drive_connections (user_id, credentials_ciphertext, credentials_iv, credentials_tag, connected_at, updated_at) VALUES ('u1','cipher','iv','tag','now','now')").run();
    disconnectDriveConnection('u1', db);
    expect(db.prepare('SELECT user_id FROM drive_connections WHERE user_id = ?').get('u1')).toBeUndefined();
    db.close();
  });
});
