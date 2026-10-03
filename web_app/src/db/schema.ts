export interface DatabaseLike {
  exec(sql: string): void;
  prepare(sql: string): {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
}

const LEGACY_CONTENT_TABLES = [
  'document_versions',
  'user_templates',
  'audit_logs',
  'documents',
] as const;

/**
 * Removes the legacy content schema before installing the account-only schema.
 * secure_delete + VACUUM + WAL checkpoint prevents old document pages remaining
 * silently recoverable in the active SQLite database after this migration.
 */
export function initializeDatabase(db: DatabaseLike): void {
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA secure_delete = ON;');

  const existingTables = new Set(
    db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => (row as { name: string }).name)
  );
  const hasLegacyContent = LEGACY_CONTENT_TABLES.some((table) => existingTables.has(table));

  if (hasLegacyContent) {
    for (const table of LEGACY_CONTENT_TABLES) {
      db.exec(`DROP TABLE IF EXISTS ${table};`);
    }
    db.exec('VACUUM;');
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  }

  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'superadmin')),
      status TEXT NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled')),
      must_change_password INTEGER NOT NULL DEFAULT 0 CHECK (must_change_password IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS recovery_credentials (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      issued_by TEXT,
      consumed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS terms_acceptances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      version TEXT NOT NULL,
      accepted_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_terms_user_time ON terms_acceptances(user_id, accepted_at DESC);

    CREATE TABLE IF NOT EXISTS drive_connections (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      credentials_ciphertext TEXT NOT NULL,
      credentials_iv TEXT NOT NULL,
      credentials_tag TEXT NOT NULL,
      root_folder_id TEXT,
      folders_json TEXT NOT NULL DEFAULT '{}',
      connected_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS spellcheck_user_dictionary (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      normalized_term TEXT NOT NULL,
      term TEXT NOT NULL CHECK (length(term) BETWEEN 1 AND 80),
      added_at TEXT NOT NULL,
      PRIMARY KEY (user_id, normalized_term)
    );
    CREATE INDEX IF NOT EXISTS idx_spellcheck_dictionary_user ON spellcheck_user_dictionary(user_id, normalized_term);

    CREATE TABLE IF NOT EXISTS oauth_states (
      state_hash TEXT PRIMARY KEY,
      session_hash TEXT NOT NULL REFERENCES sessions(token_hash) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_state_expiry ON oauth_states(expires_at);
  `);
}
