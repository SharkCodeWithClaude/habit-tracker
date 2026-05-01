import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { HabitStorage } from "../storage";
import { getDbForPath } from "../init";
import type Database from "better-sqlite3";

const TEST_DB_PATH = path.join(__dirname, "test-day-edit.db");

let db: Database.Database;
let storage: HabitStorage;

beforeEach(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  db = getDbForPath(TEST_DB_PATH);
  storage = new HabitStorage(db);
});

afterEach(() => {
  db.close();
  for (const suffix of ["", "-wal", "-shm"]) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
});

describe("editing past days", () => {
  it("can toggle habits for a past date", () => {
    const h = storage.createHabit("read");
    storage.toggleHabitForDate(h.id, "2026-04-15");

    const day = storage.getDay("2026-04-15");
    expect(day.habits[0].done).toBe(true);

    storage.toggleHabitForDate(h.id, "2026-04-15");
    const dayAfter = storage.getDay("2026-04-15");
    expect(dayAfter.habits[0].done).toBe(false);
  });

  it("can set note and intention for a past date", () => {
    storage.setDayNote("2026-04-15", "Past note");
    storage.setDayIntention("2026-04-15", "Past intention");

    const day = storage.getDay("2026-04-15");
    expect(day.note).toBe("Past note");
    expect(day.intention).toBe("Past intention");
  });

  it("editing a past day shows up in getMonth", () => {
    const h = storage.createHabit("read");
    storage.toggleHabitForDate(h.id, "2026-04-15");
    storage.setDayNote("2026-04-15", "Edited from calendar");

    const days = storage.getMonth(2026, 4);
    const apr15 = days.find((d) => d.date === "2026-04-15")!;
    expect(apr15.habits[0].done).toBe(true);
    expect(apr15.note).toBe("Edited from calendar");
  });

  it("getDay returns all active habits even for dates before habit was created", () => {
    storage.createHabit("read");
    storage.createHabit("exercise");

    const pastDay = storage.getDay("2020-01-01");
    expect(pastDay.habits).toHaveLength(2);
    expect(pastDay.habits[0].done).toBe(false);
    expect(pastDay.habits[1].done).toBe(false);
  });
});
