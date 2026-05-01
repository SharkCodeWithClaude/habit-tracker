import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS habits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  archived_at DATETIME NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS habit_logs (
  habit_id INTEGER NOT NULL REFERENCES habits(id),
  date     TEXT    NOT NULL,
  done     INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (habit_id, date)
);

CREATE TABLE IF NOT EXISTS day_notes (
  date       TEXT PRIMARY KEY,
  note       TEXT NOT NULL DEFAULT '',
  intention  TEXT NOT NULL DEFAULT '',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

const DB_PATH = path.join(process.cwd(), "data", "habits.db");

let _db: Database.Database | null = null;

function migrate(db: Database.Database): void {
  const columns = db.pragma("table_info(day_notes)") as { name: string }[];
  const hasIntention = columns.some((c) => c.name === "intention");
  if (!hasIntention) {
    db.exec("ALTER TABLE day_notes ADD COLUMN intention TEXT NOT NULL DEFAULT ''");
  }
}

function initDb(db: Database.Database): void {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
}

export function getDb(): Database.Database {
  if (_db) return _db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  initDb(_db);
  return _db;
}

export function getDbForPath(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  initDb(db);
  return db;
}
