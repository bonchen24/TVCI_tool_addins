import { type DriveCategory, type DriveFolderIds } from './folders';
import type { DriveFile } from './google-api';

export interface DriveResourceClient {
  listManagedFiles(parentId: string, category: DriveCategory, search?: string): Promise<DriveFile[]>;
  createManagedText(name: string, parentId: string, category: DriveCategory, content: string, mimeType?: string): Promise<DriveFile>;
  getManagedText(fileId: string, parentId: string, category: DriveCategory): Promise<string>;
  updateManagedText(fileId: string, parentId: string, category: DriveCategory, content: string, mimeType?: string): Promise<void>;
  renameManagedFile(fileId: string, parentId: string, category: DriveCategory, name: string): Promise<void>;
  deleteManagedFile(fileId: string, parentId: string, category: DriveCategory): Promise<void>;
}

export interface ResourceEntry {
  fileId: string;
  category: DriveCategory;
  title: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
  tags?: string[];
  content?: unknown;
}

interface ResourceInput {
  title: string;
  content: unknown;
  tags?: string[];
}

type ManifestEntry = Omit<ResourceEntry, 'content'>;

function normalizedTitle(title: string): string {
  const value = title.trim().replace(/[\\/:*?"<>|]/g, '-').slice(0, 120);
  if (!value) throw new Error('A title is required.');
  return value;
}

function normalizedTags(tags?: string[]): string[] | undefined {
  if (!tags) return undefined;
  return [...new Set(tags.map((tag) => tag.trim().slice(0, 48)).filter(Boolean))].slice(0, 20);
}

function metadata(file: DriveFile, category: DriveCategory): ResourceEntry {
  return {
    fileId: file.id,
    category,
    title: file.name.replace(/\.tvci\.json$/i, ''),
    createdAt: file.createdTime || '',
    updatedAt: file.modifiedTime || '',
    schemaVersion: 1,
  };
}

async function readManifest(client: DriveResourceClient, appDataFolderId: string): Promise<{ file: DriveFile | null; entries: ManifestEntry[] }> {
  const file = (await client.listManagedFiles(appDataFolderId, 'appData')).find((item) => item.name === 'manifest.json') || null;
  if (!file) return { file: null, entries: [] };
  try {
    const parsed = JSON.parse(await client.getManagedText(file.id, appDataFolderId, 'appData'));
    if (!Array.isArray(parsed)) return { file, entries: [] };
    return { file, entries: parsed.filter((item) => item && typeof item.fileId === 'string' && typeof item.category === 'string') as ManifestEntry[] };
  } catch {
    return { file, entries: [] };
  }
}

async function writeManifest(client: DriveResourceClient, appDataFolderId: string, entries: ManifestEntry[]): Promise<void> {
  const { file } = await readManifest(client, appDataFolderId);
  const content = JSON.stringify(entries.map((entry) => ({
    fileId: entry.fileId,
    category: entry.category,
    title: entry.title,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    schemaVersion: entry.schemaVersion,
    ...(entry.tags?.length ? { tags: entry.tags } : {}),
  })));
  if (file) await client.updateManagedText(file.id, appDataFolderId, 'appData', content, 'application/json');
  else await client.createManagedText('manifest.json', appDataFolderId, 'appData', content, 'application/json');
}

async function saveResource(client: DriveResourceClient, folders: DriveFolderIds, category: DriveCategory, format: string, input: ResourceInput, now = new Date()): Promise<ResourceEntry> {
  const title = normalizedTitle(input.title);
  const tags = normalizedTags(input.tags);
  const timestamp = now.toISOString();
  const document = { format, schemaVersion: 1, title, content: input.content, ...(tags ? { tags } : {}), createdAt: timestamp, updatedAt: timestamp };
  const file = await client.createManagedText(`${title}.tvci.json`, folders[category], category, JSON.stringify(document), 'application/json');
  const entry: ResourceEntry = { fileId: file.id, category, title, createdAt: timestamp, updatedAt: timestamp, schemaVersion: 1, ...(tags ? { tags } : {}), content: input.content };
  await writeManifest(client, folders.appData, [...(await readManifest(client, folders.appData)).entries, entry]);
  return entry;
}

export function saveDocument(client: DriveResourceClient, folders: DriveFolderIds, input: ResourceInput, now?: Date): Promise<ResourceEntry> {
  return saveResource(client, folders, 'documents', 'tvci-document', input, now);
}

export function savePersonalTemplate(client: DriveResourceClient, folders: DriveFolderIds, input: ResourceInput, now?: Date): Promise<ResourceEntry> {
  return saveResource(client, folders, 'templates', 'tvci-template', input, now);
}

export function saveKnowledge(client: DriveResourceClient, folders: DriveFolderIds, input: ResourceInput, now?: Date): Promise<ResourceEntry> {
  return saveResource(client, folders, 'knowledge', 'tvci-knowledge', input, now);
}

export function saveReference(client: DriveResourceClient, folders: DriveFolderIds, input: ResourceInput, now?: Date): Promise<ResourceEntry> {
  return saveResource(client, folders, 'references', 'tvci-reference', input, now);
}

export async function listResources(client: DriveResourceClient, category: DriveCategory, folderId: string, search = ''): Promise<ResourceEntry[]> {
  const files = await client.listManagedFiles(folderId, category, search);
  return files.map((file) => metadata(file, category));
}

export async function readResource(client: DriveResourceClient, category: DriveCategory, folderId: string, fileId: string): Promise<ResourceEntry> {
  const raw = await client.getManagedText(fileId, folderId, category);
  const parsed = JSON.parse(raw);
  const formats: Partial<Record<DriveCategory, string>> = {
    documents: 'tvci-document', templates: 'tvci-template', knowledge: 'tvci-knowledge', references: 'tvci-reference',
  };
  if (!formats[category] || parsed.format !== formats[category]) {
    throw new Error('Unsupported TVCI resource format.');
  }
  return {
    fileId,
    category,
    title: normalizedTitle(String(parsed.title || '')),
    createdAt: String(parsed.createdAt || ''),
    updatedAt: String(parsed.updatedAt || ''),
    schemaVersion: Number(parsed.schemaVersion || 1),
    ...(Array.isArray(parsed.tags) ? { tags: parsed.tags } : {}),
    content: parsed.content,
  };
}

export async function renameResource(client: DriveResourceClient, folders: DriveFolderIds, category: DriveCategory, fileId: string, titleInput: string): Promise<void> {
  const title = normalizedTitle(titleInput);
  await readResource(client, category, folders[category], fileId);
  await client.renameManagedFile(fileId, folders[category], category, `${title}.tvci.json`);
  const current = await readManifest(client, folders.appData);
  await writeManifest(client, folders.appData, current.entries.map((item) => item.fileId === fileId ? { ...item, title, updatedAt: new Date().toISOString() } : item));
}

export async function updateResource(client: DriveResourceClient, folders: DriveFolderIds, category: DriveCategory, fileId: string, input: ResourceInput, now = new Date()): Promise<ResourceEntry> {
  const existing = await readResource(client, category, folders[category], fileId);
  const title = normalizedTitle(input.title);
  const tags = normalizedTags(input.tags);
  const timestamp = now.toISOString();
  const format: Record<Exclude<DriveCategory, 'appData'>, string> = {
    documents: 'tvci-document', templates: 'tvci-template', knowledge: 'tvci-knowledge', references: 'tvci-reference',
  };
  const document = { format: format[category as Exclude<DriveCategory, 'appData'>], schemaVersion: 1, title, content: input.content, ...(tags ? { tags } : {}), createdAt: existing.createdAt || timestamp, updatedAt: timestamp };
  await client.updateManagedText(fileId, folders[category], category, JSON.stringify(document), 'application/json');
  if (title !== existing.title) await client.renameManagedFile(fileId, folders[category], category, `${title}.tvci.json`);
  const current = await readManifest(client, folders.appData);
  const entry = { fileId, category, title, createdAt: document.createdAt, updatedAt: timestamp, schemaVersion: 1, ...(tags ? { tags } : {}) };
  await writeManifest(client, folders.appData, current.entries.map((item) => item.fileId === fileId ? entry : item));
  return { ...entry, content: input.content };
}

export async function deleteResource(client: DriveResourceClient, folders: DriveFolderIds, category: DriveCategory, fileId: string): Promise<void> {
  await client.deleteManagedFile(fileId, folders[category], category);
  const current = await readManifest(client, folders.appData);
  await writeManifest(client, folders.appData, current.entries.filter((item) => item.fileId !== fileId));
}

export { buildSelectedAiContext } from './client-context';
