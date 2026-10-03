import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { getDatabase } from '@/db/client';
import type { DatabaseLike } from '@/db/schema';

export interface EncryptedCredentials {
  ciphertext: string;
  iv: string;
  tag: string;
}

export interface DriveCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function encryptionKey(encodedKey: string): Buffer {
  const key = /^[A-Fa-f0-9]{64}$/.test(encodedKey)
    ? Buffer.from(encodedKey, 'hex')
    : Buffer.from(encodedKey, 'base64');
  if (key.length !== 32) throw new Error('DRIVE_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.');
  return key;
}

export function encryptCredentials(credentials: DriveCredentials, encodedKey: string): EncryptedCredentials {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), 'utf8'), cipher.final()]);
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64') };
}

export function decryptCredentials(encrypted: EncryptedCredentials, encodedKey: string): DriveCredentials {
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(encodedKey), Buffer.from(encrypted.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(encrypted.ciphertext, 'base64')), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext) as DriveCredentials;
}

export function saveEncryptedCredentials(userId: string, credentials: DriveCredentials, key: string, db: DatabaseLike = getDatabase(), now = new Date()): void {
  const encrypted = encryptCredentials(credentials, key);
  const timestamp = now.toISOString();
  db.prepare(`INSERT INTO drive_connections (user_id, credentials_ciphertext, credentials_iv, credentials_tag, connected_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET credentials_ciphertext = excluded.credentials_ciphertext,
      credentials_iv = excluded.credentials_iv, credentials_tag = excluded.credentials_tag, updated_at = excluded.updated_at`)
    .run(userId, encrypted.ciphertext, encrypted.iv, encrypted.tag, timestamp, timestamp);
}

export function loadEncryptedCredentials(userId: string, key: string, db: DatabaseLike = getDatabase()): DriveCredentials | null {
  const row = db.prepare('SELECT credentials_ciphertext AS ciphertext, credentials_iv AS iv, credentials_tag AS tag FROM drive_connections WHERE user_id = ?').get(userId) as EncryptedCredentials | undefined;
  return row ? decryptCredentials(row, key) : null;
}
