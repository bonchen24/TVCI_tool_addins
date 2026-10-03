import path from 'node:path';
import fs from 'node:fs';
import { initializeDatabase, type DatabaseLike } from './schema';

declare const __non_webpack_require__: ((id: string) => unknown) | undefined;

interface SqliteModule {
  DatabaseSync: new (path: string) => DatabaseLike;
}

function loadSqlite(): SqliteModule {
  const req: (id: string) => unknown = typeof __non_webpack_require__ !== 'undefined'
    ? __non_webpack_require__
    : eval('require') as (id: string) => unknown;
  return req('node:sqlite') as SqliteModule;
}

let dbInstance: DatabaseLike | null = null;

export function getDatabase(): DatabaseLike {
  if (!dbInstance) {
    const { DatabaseSync } = loadSqlite();
    const dbDir = process.env.DATABASE_DIR || path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'tvci.db');
    dbInstance = new DatabaseSync(dbPath);
    initializeDatabase(dbInstance);
  }
  return dbInstance;
}

export const db = {
  get instance() {
    return getDatabase();
  },
};
