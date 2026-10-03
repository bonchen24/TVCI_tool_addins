import { getSession, SESSION_COOKIE_NAME } from './service';
import type { SessionUser } from './service';
import { getDatabase } from '@/db/client';
import type { DatabaseLike } from '@/db/schema';

export function protectedRedirect(session: SessionUser | null, path: string): string | null {
  if (!session) return '/login';
  if (!session.termsAccepted && path !== '/consent') return '/consent';
  if (session.mustChangePassword && path !== '/account') return '/account';
  return null;
}

export function canAccessAdmin(session: SessionUser | null): boolean {
  return session?.status === 'enabled' && session.role === 'superadmin' && session.termsAccepted && !session.mustChangePassword;
}

export function tokenFromRequest(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie') || '';
  const value = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);
  return value ? decodeURIComponent(value) : undefined;
}

export function sessionFromRequest(request: Request, db: DatabaseLike = getDatabase()): SessionUser | null {
  return getSession(tokenFromRequest(request), db);
}

export function protectedApiResponse(request: Request, db: DatabaseLike = getDatabase()): Response | null {
  const session = sessionFromRequest(request, db);
  if (!session) return new Response(JSON.stringify({ success: false, error: 'Authentication required.' }), {
    status: 401, headers: { 'Content-Type': 'application/json' },
  });
  if (!session.termsAccepted) return new Response(JSON.stringify({ success: false, error: 'Current terms acceptance required.' }), {
    status: 428, headers: { 'Content-Type': 'application/json' },
  });
  if (session.mustChangePassword) return new Response(JSON.stringify({ success: false, error: 'Password change required.' }), {
    status: 403, headers: { 'Content-Type': 'application/json' },
  });
  return null;
}
