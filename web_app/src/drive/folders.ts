import { getDatabase } from '@/db/client';
import type { DatabaseLike } from '@/db/schema';

export const DRIVE_ROOT_FOLDER = 'TVCI DocMaster';
export const DRIVE_CATEGORIES = {
  documents: 'Documents',
  templates: 'Templates',
  knowledge: 'Knowledge',
  references: 'References',
  appData: 'AppData',
} as const;

export type DriveCategory = keyof typeof DRIVE_CATEGORIES;

export type DriveFolderIds = Record<DriveCategory, string>;

export interface DriveFolderClient {
  findAppFolder(name: string, parentId: string | null, category: string | null, isRoot: boolean): Promise<{ id: string } | null>;
  createAppFolder(name: string, parentId: string | null, appProperties: Record<string, string>): Promise<{ id: string }>;
}

function escapeQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function appManagedFilesQuery(parentId: string, category?: DriveCategory): string {
  const parent = escapeQueryValue(parentId);
  const categoryFilter = category
    ? ` and appProperties has { key='tvciCategory' and value='${DRIVE_CATEGORIES[category]}' }`
    : '';
  return `'${parent}' in parents and trashed=false and appProperties has { key='tvciManaged' and value='true' }${categoryFilter}`;
}

export function disconnectDriveConnection(userId: string, db: DatabaseLike = getDatabase()): void {
  db.prepare('DELETE FROM drive_connections WHERE user_id = ?').run(userId);
}

export async function ensureAppFolderTree(client: DriveFolderClient, userId: string, db: DatabaseLike = getDatabase()): Promise<DriveFolderIds> {
  const connection = db.prepare('SELECT root_folder_id, folders_json FROM drive_connections WHERE user_id = ?').get(userId) as {
    root_folder_id: string | null;
    folders_json: string | null;
  } | undefined;
  if (!connection) throw new Error('Google Drive is not connected.');
  let saved: Partial<DriveFolderIds> = {};
  try { saved = JSON.parse(connection.folders_json || '{}'); } catch { saved = {}; }

  let rootId = connection.root_folder_id as string | null;
  if (!rootId) {
    const root = await client.findAppFolder(DRIVE_ROOT_FOLDER, null, null, true);
    rootId = root?.id || (await client.createAppFolder(DRIVE_ROOT_FOLDER, null, { tvciManaged: 'true', tvciRoot: 'true' })).id;
  }

  const folders = {} as DriveFolderIds;
  for (const [key, name] of Object.entries(DRIVE_CATEGORIES) as Array<[DriveCategory, string]>) {
    const currentId = saved[key];
    if (currentId) {
      folders[key] = currentId;
      continue;
    }
    const found = await client.findAppFolder(name, rootId, name, false);
    folders[key] = found?.id || (await client.createAppFolder(name, rootId, { tvciManaged: 'true', tvciCategory: name })).id;
  }

  db.prepare('UPDATE drive_connections SET root_folder_id = ?, folders_json = ?, updated_at = ? WHERE user_id = ?')
    .run(rootId, JSON.stringify(folders), new Date().toISOString(), userId);
  return folders;
}
