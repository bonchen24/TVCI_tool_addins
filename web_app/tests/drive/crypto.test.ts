// @vitest-environment node
import { createHash, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptCredentials, encryptCredentials, saveEncryptedCredentials, loadEncryptedCredentials } from '@/drive/crypto';
import { initializeDatabase, type DatabaseLike } from '@/db/schema';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(process.cwd() + '/package.json');
const { DatabaseSync } = nodeRequire('node:sqlite');
const encryptionKey = () => randomBytes(32).toString('base64');

describe('encrypted Drive credentials', () => {
  it('round-trips credentials with AES-256-GCM and rejects a different key', () => {
    const key = encryptionKey();
    const credentials = { accessToken: randomBytes(32).toString('hex'), refreshToken: randomBytes(32).toString('hex'), expiresAt: 123456 };
    const encrypted = encryptCredentials(credentials, key);
    expect(encrypted.ciphertext).not.toContain(credentials.refreshToken);
    expect(decryptCredentials(encrypted, key)).toEqual(credentials);
    expect(() => decryptCredentials(encrypted, encryptionKey())).toThrow();
  });

  it('stores encrypted token bytes only in the connection row', () => {
    const db = new DatabaseSync(':memory:') as DatabaseLike & { close(): void };
    initializeDatabase(db);
    const key = encryptionKey();
    const tokens = { accessToken: randomBytes(32).toString('hex'), refreshToken: randomBytes(32).toString('hex'), expiresAt: 99 };
    db.prepare("INSERT INTO users (id, username, password_hash, role, status, created_at, updated_at) VALUES ('user-1','user-1','hash','user','enabled','now','now')").run();
    saveEncryptedCredentials('user-1', tokens, key, db);
    const stored = db.prepare('SELECT credentials_ciphertext, credentials_iv, credentials_tag FROM drive_connections').get() as any;
    expect(JSON.stringify(stored)).not.toContain(tokens.accessToken);
    expect(JSON.stringify(stored)).not.toContain(tokens.refreshToken);
    expect(loadEncryptedCredentials('user-1', key, db)).toEqual(tokens);
    expect(createHash('sha256').update(tokens.refreshToken).digest('hex')).not.toBe(stored.credentials_ciphertext);
    db.close();
  });
});
