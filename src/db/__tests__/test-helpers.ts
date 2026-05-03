import fs from "fs";
import path from "path";
import { getDbForPath } from "../init";
import { HabitStorage } from "../storage";
import type Database from "better-sqlite3";

let testCounter = 0;

export function setupTestDb(): {
  db: Database.Database;
  storage: HabitStorage;
  cleanup: () => void;
} {
  const dbPath = path.join(__dirname, `test-${process.pid}-${++testCounter}.db`);
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = getDbForPath(dbPath);
  const storage = new HabitStorage(db);

  const cleanup = () => {
    db.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const p = dbPath + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  };

  return { db, storage, cleanup };
}

export function addDays(base: string, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}
