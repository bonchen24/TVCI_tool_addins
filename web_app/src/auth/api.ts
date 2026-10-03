import { getDatabase } from '@/db/client';
import type { DatabaseLike } from '@/db/schema';
import { sessionFromRequest } from './access-control';
import {
  acceptCurrentTerms,
  authenticateUser,
  bootstrapSuperadmin,
  changeOwnAccountPassword,
  createSession,
  logoutSession,
  recoverAccount,
  registerAccount,
  rotateRecoveryCode,
  SESSION_COOKIE_NAME,
  sessionCookie,
  verifyAccountPassword,
} from './service';
import { loadEncryptedCredentials } from '@/drive/crypto';
import { GoogleDriveClient } from '@/drive/google-api';

type AccountDriveEnvironment = { DRIVE_TOKEN_ENCRYPTION_KEY?: string };

function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json();
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request.');
  return body as Record<string, unknown>;
}

export async function register(request: Request, db: DatabaseLike = getDatabase()): Promise<Response> {
  try {
    const body = await readJson(request);
    if (typeof body.password !== 'string' || body.password !== body.confirmPassword) {
      return json({ success: false, error: 'Passwords do not match.' }, 400);
    }
    const result = await registerAccount({
      username: String(body.username || ''),
      password: body.password,
      acceptedTerms: body.acceptedTerms === true,
    }, db);
    const session = createSession(result.user.id, db);
    return json({ success: true, user: result.user, recoveryCode: result.recoveryCode }, 201, {
      'Set-Cookie': sessionCookie(session.token),
    });
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }
}

export async function login(request: Request, db: DatabaseLike = getDatabase()): Promise<Response> {
  try {
    const body = await readJson(request);
    const username = String(body.username || '');
    const password = typeof body.password === 'string' ? body.password : '';
    await bootstrapSuperadmin(db);
    const result = await authenticateUser(username, password, db);
    if (!result) return json({ success: false, error: 'Invalid username or password.' }, 401);
    return json({ success: true, user: result.user }, 200, { 'Set-Cookie': sessionCookie(result.session.token) });
  } catch {
    return json({ success: false, error: 'Unable to sign in.' }, 400);
  }
}

export async function recover(request: Request, db: DatabaseLike = getDatabase()): Promise<Response> {
  try {
    const body = await readJson(request);
    const success = await recoverAccount({
      username: String(body.username || ''),
      recoveryCode: String(body.recoveryCode || ''),
      newPassword: typeof body.newPassword === 'string' ? body.newPassword : '',
    }, db);
    if (!success) return json({ success: false, error: 'Recovery details could not be verified.' }, 400);
    return json({ success: true });
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }
}

export async function logout(request: Request, db: DatabaseLike = getDatabase()): Promise<Response> {
  const token = request.headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))?.slice(SESSION_COOKIE_NAME.length + 1);
  logoutSession(token ? decodeURIComponent(token) : undefined, db);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return json({ success: true }, 200, { 'Set-Cookie': `${SESSION_COOKIE_NAME}=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0` });
}

export function currentSession(request: Request, db: DatabaseLike = getDatabase()): Response {
  const session = sessionFromRequest(request, db);
  if (!session) return json({ success: false }, 401);
  return json({ success: true, user: session });
}

export async function acceptTerms(request: Request, db: DatabaseLike = getDatabase()): Promise<Response> {
  const session = sessionFromRequest(request, db);
  if (!session) return json({ success: false }, 401);
  acceptCurrentTerms(session.id, db);
  return json({ success: true });
}

export async function changePassword(request: Request, db: DatabaseLike = getDatabase()): Promise<Response> {
  const session = sessionFromRequest(request, db);
  if (!session) return json({ success: false }, 401);
  try {
    const body = await readJson(request);
    if (typeof body.currentPassword !== 'string' || !body.currentPassword) throw new Error('Vui lòng nhập mật khẩu hiện tại.');
    if (typeof body.newPassword !== 'string') throw new Error('Vui lòng nhập mật khẩu mới.');
    if (body.newPassword !== body.confirmPassword) throw new Error('Mật khẩu xác nhận không khớp.');
    if (!(await changeOwnAccountPassword(session.id, body.currentPassword, body.newPassword, db))) {
      return json({ success: false, error: 'Thông tin xác thực không hợp lệ.' }, 400);
    }
    const nextSession = createSession(session.id, db);
    return json({ success: true }, 200, { 'Set-Cookie': sessionCookie(nextSession.token) });
  } catch (error) {
    return json({ success: false, error: (error as Error).message }, 400);
  }
}

export async function deleteAccount(
  request: Request,
  db: DatabaseLike = getDatabase(),
  env: AccountDriveEnvironment = {},
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const session = sessionFromRequest(request, db);
  if (!session) return json({ success: false, error: 'Authentication required.' }, 401);
  if (session.role === 'superadmin') return json({ success: false, error: 'Tài khoản superadmin không thể tự xóa.' }, 403);

  try {
    const body = await readJson(request);
    if (body.confirmedDataDeletion !== true) {
      return json({ success: false, error: 'Vui lòng xác nhận bạn hiểu dữ liệu Drive không bị xóa.' }, 400);
    }
    const usernameConfirmation = typeof body.usernameConfirmation === 'string' ? body.usernameConfirmation.trim().toLowerCase() : '';
    if (usernameConfirmation !== session.username.toLowerCase()) {
      return json({ success: false, error: 'Tên đăng nhập xác nhận không khớp.' }, 400);
    }
    if (typeof body.currentPassword !== 'string' || !body.currentPassword || !(await verifyAccountPassword(session.id, body.currentPassword, db))) {
      return json({ success: false, error: 'Thông tin xác thực không hợp lệ.' }, 400);
    }

    const encryptionKey = env.DRIVE_TOKEN_ENCRYPTION_KEY || process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
    if (encryptionKey) {
      try {
        const credentials = loadEncryptedCredentials(session.id, encryptionKey, db);
        if (credentials) {
          try {
            await new GoogleDriveClient(credentials.accessToken, fetcher).revoke(credentials.refreshToken);
          } catch {
            // A failed remote revoke must not retain the local account or credentials.
          }
        }
      } catch {
        // Unreadable credentials or a missing/invalid encryption key still allow local deletion.
      }
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(session.id);
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return json({ success: true }, 200, {
      'Set-Cookie': `${SESSION_COOKIE_NAME}=; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=0`,
    });
  } catch {
    return json({ success: false, error: 'Không thể xóa tài khoản.' }, 400);
  }
}

export function rotateRecovery(request: Request, db: DatabaseLike = getDatabase()): Response {
  const session = sessionFromRequest(request, db);
  if (!session) return json({ success: false }, 401);
  return json({ success: true, recoveryCode: rotateRecoveryCode(session.id, db) });
}
