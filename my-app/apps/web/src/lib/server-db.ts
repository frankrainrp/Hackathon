import "server-only";

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { LmsFeed } from "./lms-sync";

let sqlite: Database.Database | undefined;

function getDatabase(): Database.Database {
  if (sqlite) return sqlite;

  const dbPath = process.env.BUTLER_DB_PATH || "/data/butler.sqlite";
  mkdirSync(dirname(dbPath), { recursive: true });
  sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    ) STRICT
  `);
  sqlite.exec("CREATE TABLE IF NOT EXISTS lms_feed (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL) STRICT");
  return sqlite;
}

export function readLmsFeed(): LmsFeed {
  const row = getDatabase().prepare("SELECT value FROM lms_feed WHERE id=1").get() as { value: string } | undefined;
  return row ? JSON.parse(row.value) : { revision: 0, ddls: [], notes: [], sessions: [], messages: [] };
}

/** Separate durable inbox: a stale browser's full app_state PUT cannot erase LMS updates. */
export function updateLmsFeed(update: (feed: LmsFeed) => LmsFeed): LmsFeed {
  return getDatabase().transaction(() => {
    const result = update(readLmsFeed());
    getDatabase().prepare("INSERT INTO lms_feed VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").run(JSON.stringify(result));
    return result;
  })();
}

export function readState(key: string): unknown[] {
  const row = getDatabase().prepare("SELECT value FROM app_state WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  if (!row) return [];
  const parsed: unknown = JSON.parse(row.value);
  return Array.isArray(parsed) ? parsed : [];
}

export function writeState(key: string, value: unknown[]): void {
  getDatabase()
    .prepare(`
      INSERT INTO app_state (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `)
    .run(key, JSON.stringify(value), Date.now());
}
