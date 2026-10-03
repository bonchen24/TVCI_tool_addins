import type { DatabaseLike } from '@/db/schema';
import { getDatabase } from '@/db/client';
import { protectedApiResponse, sessionFromRequest } from '@/auth/access-control';
import { driveContext } from './context';
import type { DriveFolderIds } from './folders';
import type { DriveCategory } from './folders';
import {
  deleteResource,
  listResources,
  readResource,
  renameResource,
  saveDocument,
  saveKnowledge,
  savePersonalTemplate,
  saveReference,
  updateResource,
  type DriveResourceClient,
  type ResourceEntry,
} from './resources';

export type DriveContextProvider = (userId: string, db: DatabaseLike) => Promise<{ client: DriveResourceClient; folders: DriveFolderIds }>;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const publicResource = (resource: ResourceEntry) => ({
  fileId: resource.fileId,
  category: resource.category,
  title: resource.title,
  createdAt: resource.createdAt,
  updatedAt: resource.updatedAt,
  schemaVersion: resource.schemaVersion,
  ...(resource.tags ? { tags: resource.tags } : {}),
});

function categoryFromPath(value: string): DriveCategory | null {
  return value === 'documents' || value === 'templates' || value === 'knowledge' || value === 'references' ? value : null;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const value = await request.json();
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request.');
  if (JSON.stringify(value).length > 1_500_000) throw new Error('Resource is too large.');
  return value as Record<string, unknown>;
}

function resourceInput(body: Record<string, unknown>): { title: string; content: unknown; tags?: string[] } | null {
  if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 120 || body.content === undefined) return null;
  if (Array.isArray(body.tags) && !body.tags.every((tag) => typeof tag === 'string')) return null;
  return { title: body.title, content: body.content, ...(Array.isArray(body.tags) ? { tags: body.tags as string[] } : {}) };
}

export async function handleResourceCollection(request: Request, categoryName: string, db: DatabaseLike = getDatabase(), contextProvider: DriveContextProvider = driveContext): Promise<Response> {
  const denied = protectedApiResponse(request, db);
  if (denied) return denied;
  const category = categoryFromPath(categoryName);
  if (!category) return json({ success: false, error: 'Unknown Drive category.' }, 404);
  const session = sessionFromRequest(request, db)!;
  try {
    const { client, folders } = await contextProvider(session.id, db);
    if (request.method === 'GET') {
      const search = new URL(request.url).searchParams.get('search') || '';
      const resources = await listResources(client, category, folders[category], search);
      return json({ success: true, resources: resources.map(publicResource) });
    }
    if (request.method !== 'POST') return json({ success: false, error: 'Method not allowed.' }, 405);
    const input = resourceInput(await readBody(request));
    if (!input || ((category === 'knowledge' || category === 'references') && (typeof input.content !== 'string' || !input.content.trim()))) {
      return json({ success: false, error: 'A title and content are required.' }, 400);
    }
    const resource = category === 'documents'
      ? await saveDocument(client, folders, input)
      : category === 'templates'
        ? await savePersonalTemplate(client, folders, input)
        : category === 'knowledge'
          ? await saveKnowledge(client, folders, input)
          : await saveReference(client, folders, input);
    return json({ success: true, resource: publicResource(resource) }, 201);
  } catch (error) {
    const message = (error as Error).message;
    return json({ success: false, error: message === 'Google Drive is not connected.' ? message : 'Google Drive request could not be completed.' }, 503);
  }
}

export async function handleResourceItem(request: Request, categoryName: string, fileId: string, db: DatabaseLike = getDatabase(), contextProvider: DriveContextProvider = driveContext): Promise<Response> {
  const denied = protectedApiResponse(request, db);
  if (denied) return denied;
  const category = categoryFromPath(categoryName);
  if (!category) return json({ success: false, error: 'Unknown Drive category.' }, 404);
  const session = sessionFromRequest(request, db)!;
  try {
    const { client, folders } = await contextProvider(session.id, db);
    if (request.method === 'GET') {
      return json({ success: true, resource: await readResource(client, category, folders[category], fileId) });
    }
    if (request.method === 'PUT') {
      const input = resourceInput(await readBody(request));
      if (!input) return json({ success: false, error: 'A title and content are required.' }, 400);
      const resource = await updateResource(client, folders, category, fileId, input);
      return json({ success: true, resource: publicResource(resource) });
    }
    if (request.method === 'PATCH') {
      const body = await readBody(request);
      if (typeof body.title !== 'string' || !body.title.trim()) return json({ success: false, error: 'A title is required.' }, 400);
      await renameResource(client, folders, category, fileId, body.title);
      return json({ success: true });
    }
    if (request.method === 'DELETE') {
      const body = await readBody(request);
      if (body.confirmed !== true) return json({ success: false, error: 'Explicit delete confirmation is required.' }, 400);
      await deleteResource(client, folders, category, fileId);
      return json({ success: true });
    }
    return json({ success: false, error: 'Method not allowed.' }, 405);
  } catch {
    return json({ success: false, error: 'Google Drive request could not be completed.' }, 503);
  }
}
