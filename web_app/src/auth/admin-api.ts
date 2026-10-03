import { getDatabase } from '@/db/client';
import type { DatabaseLike } from '@/db/schema';
import { canAccessAdmin, sessionFromRequest } from './access-control';
import { listAdminUsers, rotateRecoveryCode, setAccountStatus } from './service';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

function adminSession(request: Request, db: DatabaseLike) {
  const session = sessionFromRequest(request, db);
  return canAccessAdmin(session) ? session : null;
}

export async function adminListUsers(request: Request, db: DatabaseLike = getDatabase()): Promise<Response> {
  if (!adminSession(request, db)) return json({ success: false, error: 'Forbidden.' }, 403);
  return json({ success: true, users: listAdminUsers(db) });
}

export async function adminSetStatus(request: Request, userId: string, db: DatabaseLike = getDatabase()): Promise<Response> {
  if (!adminSession(request, db)) return json({ success: false, error: 'Forbidden.' }, 403);
  try {
    const body = await request.json() as { status?: string };
    if (body.status !== 'enabled' && body.status !== 'disabled') return json({ success: false, error: 'Invalid status.' }, 400);
    if (!setAccountStatus(userId, body.status, db)) return json({ success: false, error: 'Account not found.' }, 404);
    return json({ success: true });
  } catch {
    return json({ success: false, error: 'Invalid request.' }, 400);
  }
}

export async function adminIssueRecovery(request: Request, userId: string, db: DatabaseLike = getDatabase()): Promise<Response> {
  if (!adminSession(request, db)) return json({ success: false, error: 'Forbidden.' }, 403);
  try {
    const recoveryCode = rotateRecoveryCode(userId, db, sessionFromRequest(request, db)?.id || null);
    return json({ success: true, recoveryCode });
  } catch {
    return json({ success: false, error: 'Account not found.' }, 404);
  }
}
