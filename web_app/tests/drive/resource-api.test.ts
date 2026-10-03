// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';
import { createSession, registerAccount, sessionCookie } from '@/auth/service';
import { handleResourceCollection, handleResourceItem } from '@/drive/resource-api';
import type { DriveResourceClient } from '@/drive/resources';
import type { DriveFile } from '@/drive/google-api';
import type { DriveCategory } from '@/drive/folders';
import type { DriveFolderIds } from '@/drive/folders';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');
const folders: DriveFolderIds = { documents: 'docs', templates: 'templates', knowledge: 'knowledge', references: 'references', appData: 'appdata' };

class FakeDrive implements DriveResourceClient {
  files = new Map<string, { file: DriveFile; body: string; parent: string; category: DriveCategory }>();
  deleted: string[] = [];
  private counter = 0;
  async listManagedFiles(parent: string, category: DriveCategory, search = '') { return [...this.files.values()].filter((item) => item.parent === parent && item.category === category && item.file.name.includes(search)).map((item) => item.file); }
  async createManagedText(name: string, parent: string, category: DriveCategory, body: string) { const id = `id-${++this.counter}`; const file = { id, name, mimeType: 'application/json', parents: [parent], appProperties: { tvciManaged: 'true', tvciCategory: category } }; this.files.set(id, { file, body, parent, category }); return file; }
  async getManagedText(id: string, parent: string, category: DriveCategory) { const item = this.files.get(id); if (!item || item.parent !== parent || item.category !== category) throw new Error('wrong category'); return item.body; }
  async updateManagedText(id: string, _parent: string, _category: DriveCategory, body: string) { this.files.get(id)!.body = body; }
  async renameManagedFile(id: string, _parent: string, _category: DriveCategory, name: string) { this.files.get(id)!.file.name = name; }
  async deleteManagedFile(id: string) { this.deleted.push(id); this.files.delete(id); }
}

describe('Drive resource API', () => {
  let db: (DatabaseLike & { close(): void }) | undefined;
  let cookie = '';
  let drive: FakeDrive;
  const provider = async () => ({ client: drive, folders });

  beforeEach(async () => {
    db = new DatabaseSync(':memory:'); initializeDatabase(db!); drive = new FakeDrive();
    const account = await registerAccount({ username: 'resource_api_user', password: randomBytes(32).toString('base64url'), acceptedTerms: true }, db);
    cookie = sessionCookie(createSession(account.user.id, db).token).split(';')[0];
  });
  afterEach(() => { db?.close(); db = undefined; });

  it('requires an authenticated session and persists document content through Drive only', async () => {
    const unauth = await handleResourceCollection(new Request('https://local/api/drive/documents', { method: 'POST' }), 'documents', db!, provider);
    expect(unauth.status).toBe(401);
    const response = await handleResourceCollection(new Request('https://local/api/drive/documents', {
      method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Current draft', content: { type: 'doc', content: [] } }),
    }), 'documents', db!, provider);
    expect(response.status).toBe(201);
    expect(drive.files.size).toBe(2); // canonical document plus metadata-only AppData manifest
    const tables = db!.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map((row: any) => row.name);
    expect(tables).not.toContain('documents');
    expect(tables).not.toContain('document_versions');
  });

  it('lists only metadata and uses category-specific Knowledge and Reference routes', async () => {
    await handleResourceCollection(new Request('https://local/api/drive/knowledge', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Rule', content: 'Knowledge body', tags: ['style'] }) }), 'knowledge', db!, provider);
    await handleResourceCollection(new Request('https://local/api/drive/references', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Source', content: 'Reference body' }) }), 'references', db!, provider);
    const response = await handleResourceCollection(new Request('https://local/api/drive/knowledge', { headers: { Cookie: cookie } }), 'knowledge', db!, provider);
    const body = await response.json();
    expect(body.resources).toHaveLength(1);
    expect(body.resources[0]).toMatchObject({ category: 'knowledge', title: 'Rule' });
    expect(JSON.stringify(body)).not.toContain('Knowledge body');
    expect([...drive.files.values()].filter((item) => item.category === 'references')).toHaveLength(1);
  });

  it('requires explicit delete confirmation before calling Drive delete', async () => {
    const saved = await handleResourceCollection(new Request('https://local/api/drive/knowledge', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Rule', content: 'Body' }) }), 'knowledge', db!, provider);
    const id = (await saved.json()).resource.fileId;
    const noConfirm = await handleResourceItem(new Request(`https://local/api/drive/knowledge/${id}`, { method: 'DELETE', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmed: false }) }), 'knowledge', id, db!, provider);
    expect(noConfirm.status).toBe(400);
    expect(drive.deleted).toEqual([]);
    const confirmed = await handleResourceItem(new Request(`https://local/api/drive/knowledge/${id}`, { method: 'DELETE', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmed: true }) }), 'knowledge', id, db!, provider);
    expect(confirmed.status).toBe(200);
    expect(drive.deleted).toEqual([id]);
  });

  it('requires Drive connection for long-term Knowledge', async () => {
    const response = await handleResourceCollection(new Request('https://local/api/drive/knowledge', { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Rule', content: 'Body' }) }), 'knowledge', db!, async () => { throw new Error('Google Drive is not connected.'); });
    expect(response.status).toBe(503);
    expect(drive.files.size).toBe(0);
  });
});
