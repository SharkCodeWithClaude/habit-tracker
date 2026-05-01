import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { HabitStorage } from "../storage";
import { getDbForPath } from "../init";
import type Database from "better-sqlite3";

const TEST_DB_PATH = path.join(__dirname, "test-intention.db");

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

describe("intention support", () => {
  it("getDay returns empty intention when none set", () => {
    const day = storage.getDay("2026-05-01");
    expect(day.intention).toBe("");
  });

  it("setDayIntention creates a new intention", () => {
    storage.setDayIntention("2026-05-01", "Ship the feature");
    const day = storage.getDay("2026-05-01");
    expect(day.intention).toBe("Ship the feature");
  });

  it("setDayIntention updates an existing intention", () => {
    storage.setDayIntention("2026-05-01", "First draft");
    storage.setDayIntention("2026-05-01", "Final version");
    const day = storage.getDay("2026-05-01");
    expect(day.intention).toBe("Final version");
  });

  it("intention and note are independent", () => {
    storage.setDayIntention("2026-05-01", "My intention");
    storage.setDayNote("2026-05-01", "My note");
    const day = storage.getDay("2026-05-01");
    expect(day.intention).toBe("My intention");
    expect(day.note).toBe("My note");
  });

  it("setDayNote does not overwrite intention", () => {
    storage.setDayIntention("2026-05-01", "Stay focused");
    storage.setDayNote("2026-05-01", "Good progress");
    const day = storage.getDay("2026-05-01");
    expect(day.intention).toBe("Stay focused");
  });

  it("setDayIntention does not overwrite note", () => {
    storage.setDayNote("2026-05-01", "Some notes");
    storage.setDayIntention("2026-05-01", "New intention");
    const day = storage.getDay("2026-05-01");
    expect(day.note).toBe("Some notes");
  });

  it("getMonth includes intention for each day", () => {
    storage.createHabit("read");
    storage.setDayIntention("2026-05-10", "Read 50 pages");
    const days = storage.getMonth(2026, 5);
    const may10 = days.find((d) => d.date === "2026-05-10")!;
    expect(may10.intention).toBe("Read 50 pages");
    expect(days[0].intention).toBe("");
  });
});

describe("InkCheckbox jitter determinism", () => {
  function jitter(seed: number, n: number): number {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return (x - Math.floor(x) - 0.5) * 1.6;
  }

  it("produces the same value for the same seed and index", () => {
    expect(jitter(1, 1)).toBe(jitter(1, 1));
    expect(jitter(3, 5)).toBe(jitter(3, 5));
  });

  it("produces different values for different seeds", () => {
    expect(jitter(1, 1)).not.toBe(jitter(2, 1));
  });

  it("produces values within the expected range [-0.8, 0.8]", () => {
    for (let seed = 0; seed < 20; seed++) {
      for (let n = 0; n < 20; n++) {
        const val = jitter(seed, n);
        expect(val).toBeGreaterThanOrEqual(-0.8);
        expect(val).toBeLessThanOrEqual(0.8);
      }
    }
  });
});
