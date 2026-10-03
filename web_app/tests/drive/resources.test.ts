// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildSelectedAiContext, listResources, readResource, saveKnowledge, savePersonalTemplate, saveReference } from '@/drive/resources';
import type { DriveResourceClient } from '@/drive/resources';
import type { DriveFile } from '@/drive/google-api';
import type { DriveCategory, DriveFolderIds } from '@/drive/folders';

class MemoryDrive implements DriveResourceClient {
  files = new Map<string, { metadata: DriveFile; parentId: string; category: DriveCategory; body: string }>();
  private nextId = 0;
  async listManagedFiles(parentId: string, category: DriveCategory, search = '') {
    return [...this.files.values()].filter((file) => file.parentId === parentId && file.category === category && file.metadata.name.toLowerCase().includes(search.toLowerCase())).map((file) => file.metadata);
  }
  async createManagedText(name: string, parentId: string, category: DriveCategory, content: string) {
    const id = `file-${++this.nextId}`;
    const metadata: DriveFile = { id, name, mimeType: 'application/json', parents: [parentId], appProperties: { tvciManaged: 'true', tvciCategory: category } };
    this.files.set(id, { metadata, parentId, category, body: content });
    return metadata;
  }
  async getManagedText(id: string, parentId: string, category: DriveCategory) {
    const file = this.files.get(id);
    if (!file || file.parentId !== parentId || file.category !== category) throw new Error('outside category');
    return file.body;
  }
  async updateManagedText(id: string, parentId: string, category: DriveCategory, content: string) {
    const file = this.files.get(id);
    if (!file || file.parentId !== parentId || file.category !== category) throw new Error('outside category');
    file.body = content;
  }
  async renameManagedFile(id: string, parentId: string, category: DriveCategory, name: string) {
    const file = this.files.get(id);
    if (!file || file.parentId !== parentId || file.category !== category) throw new Error('outside category');
    file.metadata.name = name;
  }
  async deleteManagedFile(id: string, parentId: string, category: DriveCategory) {
    const file = this.files.get(id);
    if (!file || file.parentId !== parentId || file.category !== category) throw new Error('outside category');
    this.files.delete(id);
  }
}

const folders: DriveFolderIds = { documents: 'docs', templates: 'templates', knowledge: 'knowledge', references: 'references', appData: 'appdata' };

describe('user-controlled Drive resources', () => {
  it('saves Knowledge only through an explicit call and keeps body out of AppData manifest', async () => {
    const drive = new MemoryDrive();
    const knowledge = await saveKnowledge(drive, folders, { title: 'Writing rule', content: 'Sensitive example body', tags: ['style'] });
    expect(knowledge.category).toBe('knowledge');
    const manifest = [...drive.files.values()].find((file) => file.category === 'appData')!.body;
    expect(manifest).toContain(knowledge.fileId);
    expect(manifest).toContain('Writing rule');
    expect(manifest).not.toContain('Sensitive example body');
    const listed = await listResources(drive, 'knowledge', folders.knowledge, 'writing');
    expect(listed.map((item) => item.fileId)).toContain(knowledge.fileId);
    expect(await readResource(drive, 'knowledge', folders.knowledge, knowledge.fileId)).toMatchObject({ content: 'Sensitive example body', tags: ['style'] });
  });

  it('keeps References separate from Knowledge and sends only explicitly selected context', async () => {
    const drive = new MemoryDrive();
    const ref = await saveReference(drive, folders, { title: 'Policy reference', content: 'Reference content' });
    const knowledge = await saveKnowledge(drive, folders, { title: 'Personal note', content: 'Knowledge content' });
    expect((await listResources(drive, 'references', folders.references)).map((item) => item.fileId)).toEqual([ref.fileId]);
    expect((await listResources(drive, 'knowledge', folders.knowledge)).map((item) => item.fileId)).toEqual([knowledge.fileId]);
    const selected = buildSelectedAiContext([ref, knowledge], [ref.fileId]);
    expect(selected).toContain('Reference content');
    expect(selected).not.toContain('Knowledge content');
  });

  it('stores personal templates in Templates separately from the built-in catalog', async () => {
    const drive = new MemoryDrive();
    const template = await savePersonalTemplate(drive, folders, { title: 'My form', content: { type: 'doc', content: [] } });
    expect(template.category).toBe('templates');
    expect((await listResources(drive, 'templates', folders.templates)).map((item) => item.title)).toEqual(['My form']);
  });
});
