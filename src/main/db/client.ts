import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import * as schema from './schema'
import { log } from '../logger'

let db: ReturnType<typeof drizzle> | null = null
let sqlite: Database.Database | null = null

export function getDb(): ReturnType<typeof drizzle> {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}

export function getSqlite(): Database.Database {
  if (!sqlite) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return sqlite
}

export function initDb(): void {
  const dbPath = path.join(app.getPath('userData'), 'clips.db')
  const blobsDir = path.join(app.getPath('userData'), 'blobs')

  if (!fs.existsSync(blobsDir)) {
    fs.mkdirSync(blobsDir, { recursive: true })
  }

  sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  db = drizzle(sqlite, { schema })

  applyMigrations(sqlite)

  log.info(`Database initialized at ${dbPath}`)
}

function applyMigrations(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS clips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_hash TEXT NOT NULL,
      type TEXT NOT NULL,
      text_value TEXT,
      blob_path TEXT,
      source_app TEXT,
      source_title TEXT,
      byte_size INTEGER NOT NULL DEFAULT 0,
      is_sensitive INTEGER NOT NULL DEFAULT 0,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      last_used_at INTEGER NOT NULL,
      use_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS clip_categories (
      clip_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (clip_id, category_id)
    );
  `)

  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_clips_created ON clips(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_clips_type    ON clips(type);
    CREATE INDEX IF NOT EXISTS idx_clips_app     ON clips(source_app);
    CREATE INDEX IF NOT EXISTS idx_clips_hash    ON clips(content_hash);

    CREATE VIRTUAL TABLE IF NOT EXISTS clips_fts USING fts5(
      text_value, source_app, source_title,
      content='clips', content_rowid='id'
    );

    CREATE TRIGGER IF NOT EXISTS clips_ai AFTER INSERT ON clips BEGIN
      INSERT INTO clips_fts(rowid, text_value, source_app, source_title)
      VALUES (new.id, new.text_value, new.source_app, new.source_title);
    END;

    CREATE TRIGGER IF NOT EXISTS clips_ad AFTER DELETE ON clips BEGIN
      INSERT INTO clips_fts(clips_fts, rowid, text_value, source_app, source_title)
      VALUES('delete', old.id, old.text_value, old.source_app, old.source_title);
    END;

    CREATE TRIGGER IF NOT EXISTS clips_au AFTER UPDATE ON clips BEGIN
      INSERT INTO clips_fts(clips_fts, rowid, text_value, source_app, source_title)
      VALUES('delete', old.id, old.text_value, old.source_app, old.source_title);
      INSERT INTO clips_fts(rowid, text_value, source_app, source_title)
      VALUES (new.id, new.text_value, new.source_app, new.source_title);
    END;
  `)
  log.info('FTS5 migration applied')
}

export function closeDb(): void {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    db = null
    log.info('Database connection closed')
  }
}
