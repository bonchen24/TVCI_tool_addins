import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { getDatabase } from '@/db/client';
import type { DatabaseLike } from '@/db/schema';
import { clearAccountAttempts, consumeAccountAttempt } from './rate-limit';
import { TERMS_VERSION } from '@/privacy/terms';

const SCRYPT_N = 32_768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_BYTES = 64;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;
export const SESSION_COOKIE_NAME = 'tvci_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type Role = 'user' | 'superadmin';
type AccountStatus = 'enabled' | 'disabled';

export interface SafeUser {
  id: string;
  username: string;
  role: Role;
  status: AccountStatus;
  mustChangePassword: boolean;
  createdAt: string;
}

export type ConsentStatus = 'accepted' | 'needs_reacceptance' | 'not_accepted';

export interface AdminUser extends SafeUser {
  driveConnected: boolean;
  acceptedTermsVersion: string | null;
  acceptedTermsAt: string | null;
  currentTermsVersion: string;
  consentStatus: ConsentStatus;
}

export interface SessionUser extends SafeUser {
  expiresAt: string;
  termsAccepted: boolean;
}

export interface RegisterInput {
  username: string;
  password: string;
  acceptedTerms: boolean;
}

export interface RecoveryInput {
  username: string;
  recoveryCode: string;
  newPassword: string;
}

interface UserRow {
  id: string;
  username: string;
  role: Role;
  status: AccountStatus;
  must_change_password: number;
  created_at: string;
  password_hash?: string;
}

interface SessionRow extends UserRow {
  expires_at: string;
  latest_terms: string | null;
}

interface RecoveryCredentialRow {
  code_hash: string;
  consumed_at: string | null;
}

interface AdminUserRow extends UserRow {
  drive_connected: number;
  accepted_terms_version: string | null;
  accepted_terms_at: string | null;
}

function deriveScrypt(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, SCRYPT_BYTES, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: SCRYPT_MAXMEM,
    }, (error, derived) => {
      if (error) reject(error);
      else resolve(derived as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  const salt = randomBytes(16);
  const derived = await deriveScrypt(password, salt);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const parts = encodedHash.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt' || Number(parts[1]) !== SCRYPT_N || Number(parts[2]) !== SCRYPT_R || Number(parts[3]) !== SCRYPT_P) {
    return false;
  }
  try {
    const salt = Buffer.from(parts[4], 'base64url');
    const expected = Buffer.from(parts[5], 'base64url');
    if (salt.length !== 16 || expected.length !== SCRYPT_BYTES) return false;
    const actual = await deriveScrypt(password, salt);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function validateUsername(username: string): string {
  const normalized = username.trim();
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(normalized)) {
    throw new Error('Username must be 3–32 letters, numbers, underscores, or hyphens.');
  }
  return normalized;
}

export function validatePassword(password: string): void {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    throw new Error('Password must be between 12 and 128 characters.');
  }
}

function nowIso(now = new Date()): string {
  return now.toISOString();
}

function hashSecret(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hashesEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function asSafeUser(row: UserRow): SafeUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    status: row.status,
    mustChangePassword: Boolean(row.must_change_password),
    createdAt: row.created_at,
  };
}

export async function registerAccount(input: RegisterInput, db: DatabaseLike = getDatabase(), now = new Date()): Promise<{ user: SafeUser; recoveryCode: string }> {
  if (!input.acceptedTerms) throw new Error('Current terms acceptance is required.');
  const username = validateUsername(input.username);
  const passwordHash = await hashPassword(input.password);
  const id = randomUUID();
  const timestamp = nowIso(now);
  const recoveryCode = randomBytes(32).toString('base64url');
  try {
    db.prepare(`INSERT INTO users (id, username, password_hash, role, status, must_change_password, created_at, updated_at)
      VALUES (?, ?, ?, 'user', 'enabled', 0, ?, ?)`).run(id, username, passwordHash, timestamp, timestamp);
  } catch (error) {
    if (String(error).toLowerCase().includes('unique')) throw new Error('Username is unavailable.');
    throw error;
  }
  db.prepare('INSERT INTO terms_acceptances (id, user_id, version, accepted_at) VALUES (?, ?, ?, ?)')
    .run(randomUUID(), id, TERMS_VERSION, timestamp);
  db.prepare('INSERT INTO recovery_credentials (user_id, code_hash, issued_at) VALUES (?, ?, ?)')
    .run(id, hashSecret(recoveryCode), timestamp);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (!row) throw new Error('Registered account could not be read back.');
  return { user: asSafeUser(row), recoveryCode };
}

export async function bootstrapSuperadmin(db: DatabaseLike = getDatabase(), env: { SUPERADMIN_USERNAME?: string; SUPERADMIN_INITIAL_PASSWORD?: string } = {
  SUPERADMIN_USERNAME: process.env.SUPERADMIN_USERNAME,
  SUPERADMIN_INITIAL_PASSWORD: process.env.SUPERADMIN_INITIAL_PASSWORD,
}): Promise<SafeUser | null> {
  const usernameValue = env.SUPERADMIN_USERNAME;
  const password = env.SUPERADMIN_INITIAL_PASSWORD;
  if (!usernameValue && !password) return null;
  if (!usernameValue || !password) throw new Error('Both superadmin bootstrap environment values are required.');
  const username = validateUsername(usernameValue);
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) return null;
  const passwordHash = await hashPassword(password);
  const id = randomUUID();
  const timestamp = nowIso();
  db.prepare(`INSERT INTO users (id, username, password_hash, role, status, must_change_password, created_at, updated_at)
    VALUES (?, ?, ?, 'superadmin', 'enabled', 1, ?, ?)`).run(id, username, passwordHash, timestamp, timestamp);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (!row) throw new Error('Bootstrapped account could not be read back.');
  return asSafeUser(row);
}

export function createSession(userId: string, db: DatabaseLike = getDatabase(), now = new Date()): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(hashSecret(token), userId, expiresAt, nowIso(now));
  return { token, expiresAt };
}

export function getSession(token: string | undefined, db: DatabaseLike = getDatabase(), now = new Date()): SessionUser | null {
  if (!token || token.length < 32 || token.length > 256) return null;
  const row = db.prepare(`SELECT u.*, s.expires_at,
    (SELECT version FROM terms_acceptances ta WHERE ta.user_id = u.id ORDER BY accepted_at DESC LIMIT 1) AS latest_terms
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`)
    .get(hashSecret(token)) as SessionRow | undefined;
  if (!row || row.status !== 'enabled' || Date.parse(row.expires_at) <= now.getTime()) return null;
  return { ...asSafeUser(row), expiresAt: row.expires_at, termsAccepted: row.latest_terms === TERMS_VERSION };
}

export function logoutSession(token: string | undefined, db: DatabaseLike = getDatabase()): void {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashSecret(token));
}

export function sessionCookie(token: string, production = process.env.NODE_ENV === 'production'): string {
  const secure = production ? '; Secure' : '';
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

export async function authenticateUser(usernameInput: string, password: string, db: DatabaseLike = getDatabase(), now = new Date()): Promise<{ user: SafeUser; session: { token: string; expiresAt: string } } | null> {
  const username = usernameInput.trim();
  if (!consumeAccountAttempt('login', username, now.getTime())) return null;
  const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as (UserRow & { password_hash: string }) | undefined;
  if (!row || row.status !== 'enabled' || !(await verifyPassword(password, row.password_hash))) return null;
  clearAccountAttempts('login', username);
  const session = createSession(row.id, db, now);
  return { user: asSafeUser(row), session };
}

export function rotateRecoveryCode(userId: string, db: DatabaseLike = getDatabase(), issuedBy: string | null = null, now = new Date()): string {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('Account not found.');
  const code = randomBytes(32).toString('base64url');
  db.prepare(`INSERT INTO recovery_credentials (user_id, code_hash, issued_at, issued_by, consumed_at)
    VALUES (?, ?, ?, ?, NULL)
    ON CONFLICT(user_id) DO UPDATE SET code_hash = excluded.code_hash, issued_at = excluded.issued_at,
      issued_by = excluded.issued_by, consumed_at = NULL`)
    .run(userId, hashSecret(code), nowIso(now), issuedBy);
  return code;
}

export async function recoverAccount(input: RecoveryInput, db: DatabaseLike = getDatabase(), now = new Date()): Promise<boolean> {
  const username = input.username.trim();
  if (!consumeAccountAttempt('recovery', username, now.getTime())) return false;
  validatePassword(input.newPassword);
  const user = db.prepare("SELECT id FROM users WHERE username = ? AND status = 'enabled'").get(username) as Pick<UserRow, 'id'> | undefined;
  if (!user) return false;
  const credential = db.prepare('SELECT code_hash, consumed_at FROM recovery_credentials WHERE user_id = ?').get(user.id) as RecoveryCredentialRow | undefined;
  const recoveryCodeHash = hashSecret(input.recoveryCode);
  if (!credential || credential.consumed_at || !hashesEqual(credential.code_hash, recoveryCodeHash)) return false;
  const passwordHash = await hashPassword(input.newPassword);
  const timestamp = nowIso(now);

  db.exec('BEGIN IMMEDIATE');
  let transactionOpen = true;
  try {
    const claim = db.prepare(`UPDATE recovery_credentials SET consumed_at = ?
      WHERE user_id = ? AND code_hash = ? AND consumed_at IS NULL`).run(timestamp, user.id, recoveryCodeHash) as { changes: number };
    if (claim.changes !== 1) {
      db.exec('ROLLBACK');
      transactionOpen = false;
      return false;
    }

    const passwordUpdate = db.prepare(`UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ?
      WHERE id = ? AND status = 'enabled'`).run(passwordHash, timestamp, user.id) as { changes: number };
    if (passwordUpdate.changes !== 1) throw new Error('Recovery account is no longer available.');
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    db.exec('COMMIT');
    transactionOpen = false;
  } catch (error) {
    if (transactionOpen) db.exec('ROLLBACK');
    throw error;
  }

  clearAccountAttempts('recovery', username);
  return true;
}

export function acceptCurrentTerms(userId: string, db: DatabaseLike = getDatabase(), now = new Date()): boolean {
  db.prepare('INSERT INTO terms_acceptances (id, user_id, version, accepted_at) VALUES (?, ?, ?, ?)')
    .run(randomUUID(), userId, TERMS_VERSION, nowIso(now));
  return true;
}

export function listAdminUsers(db: DatabaseLike = getDatabase()): AdminUser[] {
  const rows = db.prepare(`SELECT u.id, u.username, u.role, u.status, u.must_change_password, u.created_at,
    CASE WHEN d.user_id IS NULL THEN 0 ELSE 1 END AS drive_connected,
    ta.version AS accepted_terms_version, ta.accepted_at AS accepted_terms_at
    FROM users u
    LEFT JOIN drive_connections d ON d.user_id = u.id
    LEFT JOIN terms_acceptances ta ON ta.id = (
      SELECT latest.id FROM terms_acceptances latest
      WHERE latest.user_id = u.id
      ORDER BY latest.accepted_at DESC, latest.id DESC
      LIMIT 1
    )
    ORDER BY u.created_at ASC`)
    .all() as AdminUserRow[];
  return rows.map((row) => {
      const acceptedTermsVersion = row.accepted_terms_version ?? null;
      const acceptedTermsAt = row.accepted_terms_at ?? null;
      const consentStatus: ConsentStatus = acceptedTermsVersion === null
        ? 'not_accepted'
        : acceptedTermsVersion !== TERMS_VERSION
          ? 'needs_reacceptance'
          : acceptedTermsAt
            ? 'accepted'
            : 'not_accepted';

      return {
        ...asSafeUser(row),
        driveConnected: Boolean(row.drive_connected),
        acceptedTermsVersion,
        acceptedTermsAt,
        currentTermsVersion: TERMS_VERSION,
        consentStatus,
      };
    });
}

export function setAccountStatus(userId: string, status: AccountStatus, db: DatabaseLike = getDatabase()): boolean {
  const result = db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?')
    .run(status, nowIso(), userId) as { changes?: number };
  if (status === 'disabled') db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  return Boolean(result.changes);
}

export function changeAccountPassword(userId: string, passwordHash: string, db: DatabaseLike = getDatabase()): void {
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?')
    .run(passwordHash, nowIso(), userId);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export async function verifyAccountPassword(userId: string, password: string, db: DatabaseLike = getDatabase()): Promise<boolean> {
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string } | undefined;
  return Boolean(row && await verifyPassword(password, row.password_hash));
}

export async function changeOwnAccountPassword(userId: string, currentPassword: string, newPassword: string, db: DatabaseLike = getDatabase()): Promise<boolean> {
  if (!(await verifyAccountPassword(userId, currentPassword, db))) return false;
  const passwordHash = await hashPassword(newPassword);
  changeAccountPassword(userId, passwordHash, db);
  return true;
}
