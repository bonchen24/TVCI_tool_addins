import { protectedApiResponse, sessionFromRequest } from '@/auth/access-control';
import { getDatabase } from '@/db/client';
import type { DatabaseLike } from '@/db/schema';
import { addUserWord, listUserWords, removeUserWord } from './dictionary-storage';

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

async function readTerm(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || !('term' in body) || typeof body.term !== 'string') return null;
    return body.term;
  } catch {
    return null;
  }
}

export async function getUserDictionary(request: Request, db: DatabaseLike = getDatabase()): Promise<Response> {
  const denied = protectedApiResponse(request, db);
  if (denied) return denied;
  const user = sessionFromRequest(request, db)!;
  return json({ success: true, words: listUserWords(user.id, db) });
}

export async function addUserDictionaryTerm(request: Request, db: DatabaseLike = getDatabase()): Promise<Response> {
  const denied = protectedApiResponse(request, db);
  if (denied) return denied;
  const user = sessionFromRequest(request, db)!;
  const term = await readTerm(request);
  if (term === null) return json({ success: false, error: 'A single dictionary term is required.' }, 400);
  try {
    addUserWord(user.id, term, db);
    return json({ success: true, words: listUserWords(user.id, db) }, 201);
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }
}

export async function deleteUserDictionaryTerm(request: Request, db: DatabaseLike = getDatabase()): Promise<Response> {
  const denied = protectedApiResponse(request, db);
  if (denied) return denied;
  const user = sessionFromRequest(request, db)!;
  const term = await readTerm(request);
  if (term === null) return json({ success: false, error: 'A single dictionary term is required.' }, 400);
  try {
    removeUserWord(user.id, term, db);
    return json({ success: true, words: listUserWords(user.id, db) });
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }
}
