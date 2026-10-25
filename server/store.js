import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version > 1) throw new Error('La base de datos requiere una versión más reciente de Cotiza.');
  if (version === 0) {
    db.exec(
      [
        'BEGIN IMMEDIATE;',
        'CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, profile TEXT NOT NULL, next_number INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);',
        'CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);',
        'CREATE INDEX sessions_user ON sessions(user_id);',
        'CREATE TABLE clients (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);',
        'CREATE INDEX clients_user ON clients(user_id);',
        "CREATE TABLE quotes (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, client_id TEXT NOT NULL REFERENCES clients(id), number INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected')), data TEXT NOT NULL, snapshot TEXT, token_hash TEXT UNIQUE, response_name TEXT, responded_at TEXT, sent_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, number));",
        'CREATE INDEX quotes_user ON quotes(user_id);',
        'PRAGMA user_version = 1;',
        'COMMIT;',
      ].join('\n'),
    );
  }
  return db;
}

export function transaction(db, operation) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function readClient(row) {
  return row ? { ...JSON.parse(row.data), id: row.id, createdAt: row.created_at } : null;
}

export function readQuote(row) {
  return row
    ? {
        ...JSON.parse(row.data),
        id: row.id,
        clientId: row.client_id,
        number: row.number,
        status: row.status,
        snapshot: row.snapshot ? JSON.parse(row.snapshot) : null,
        responseName: row.response_name,
        respondedAt: row.responded_at,
        sentAt: row.sent_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}
