import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { HabitStorage } from "../storage";
import { getDbForPath } from "../init";
import type Database from "better-sqlite3";

const TEST_DB_PATH = path.join(__dirname, "test-habits.db");

let db: Database.Database;
let storage: HabitStorage;

beforeEach(() => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  db = getDbForPath(TEST_DB_PATH);
  storage = new HabitStorage(db);
});

afterEach(() => {
  db.close();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  const walPath = TEST_DB_PATH + "-wal";
  const shmPath = TEST_DB_PATH + "-shm";
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
});

describe("HabitStorage", () => {
  describe("createHabit", () => {
    it("creates a habit and returns it", () => {
      const habit = storage.createHabit("read");
      expect(habit.id).toBe(1);
      expect(habit.name).toBe("read");
      expect(habit.archived_at).toBeNull();
    });

    it("assigns incrementing sort_order", () => {
      const h1 = storage.createHabit("read");
      const h2 = storage.createHabit("exercise");
      expect(h2.sort_order).toBeGreaterThan(h1.sort_order);
    });
  });

  describe("getActiveHabits", () => {
    it("returns only non-archived habits", () => {
      storage.createHabit("read");
      const h2 = storage.createHabit("exercise");
      storage.archiveHabit(h2.id);

      const active = storage.getActiveHabits();
      expect(active).toHaveLength(1);
      expect(active[0].name).toBe("read");
    });

    it("returns empty array when no habits", () => {
      expect(storage.getActiveHabits()).toEqual([]);
    });
  });

  describe("archiveHabit", () => {
    it("sets archived_at timestamp", () => {
      const habit = storage.createHabit("read");
      storage.archiveHabit(habit.id);

      const row = db
        .prepare("SELECT archived_at FROM habits WHERE id = ?")
        .get(habit.id) as { archived_at: string };
      expect(row.archived_at).not.toBeNull();
    });
  });

  describe("toggleHabitForDate", () => {
    it("marks habit as done and returns true", () => {
      const habit = storage.createHabit("read");
      const result = storage.toggleHabitForDate(habit.id, "2026-05-01");
      expect(result).toBe(true);

      const log = db
        .prepare("SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?")
        .get(habit.id, "2026-05-01");
      expect(log).toBeDefined();
    });

    it("toggles off an already-done habit and returns false", () => {
      const habit = storage.createHabit("read");
      storage.toggleHabitForDate(habit.id, "2026-05-01");
      const result = storage.toggleHabitForDate(habit.id, "2026-05-01");
      expect(result).toBe(false);

      const log = db
        .prepare("SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?")
        .get(habit.id, "2026-05-01");
      expect(log).toBeUndefined();
    });
  });

  describe("getDay", () => {
    it("returns habits with done status for the given date", () => {
      const h1 = storage.createHabit("read");
      storage.createHabit("exercise");
      storage.toggleHabitForDate(h1.id, "2026-05-01");

      const day = storage.getDay("2026-05-01");
      expect(day.date).toBe("2026-05-01");
      expect(day.habits).toHaveLength(2);
      expect(day.habits[0].done).toBe(true);
      expect(day.habits[1].done).toBe(false);
    });

    it("returns empty note when none set", () => {
      const day = storage.getDay("2026-05-01");
      expect(day.note).toBe("");
    });

    it("returns saved note", () => {
      storage.setDayNote("2026-05-01", "great day");
      const day = storage.getDay("2026-05-01");
      expect(day.note).toBe("great day");
    });
  });

  describe("setDayNote", () => {
    it("creates a new note", () => {
      storage.setDayNote("2026-05-01", "hello");
      const row = db
        .prepare("SELECT note FROM day_notes WHERE date = ?")
        .get("2026-05-01") as { note: string };
      expect(row.note).toBe("hello");
    });

    it("updates an existing note", () => {
      storage.setDayNote("2026-05-01", "hello");
      storage.setDayNote("2026-05-01", "updated");
      const row = db
        .prepare("SELECT note FROM day_notes WHERE date = ?")
        .get("2026-05-01") as { note: string };
      expect(row.note).toBe("updated");
    });
  });

  describe("getMonth", () => {
    it("returns all days in the month with habit status", () => {
      storage.createHabit("read");
      storage.toggleHabitForDate(1, "2026-05-15");

      const days = storage.getMonth(2026, 5);
      expect(days).toHaveLength(31);
      expect(days[14].date).toBe("2026-05-15");
      expect(days[14].habits[0].done).toBe(true);
      expect(days[0].habits[0].done).toBe(false);
    });
  });

  describe("getStreak", () => {
    it("returns 0 for no logs", () => {
      const habit = storage.createHabit("read");
      expect(storage.getStreak(habit.id)).toBe(0);
    });

    it("counts consecutive days ending today", () => {
      const habit = storage.createHabit("read");
      const today = new Date();
      for (let i = 0; i < 3; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        storage.toggleHabitForDate(habit.id, d.toISOString().split("T")[0]);
      }
      expect(storage.getStreak(habit.id)).toBe(3);
    });

    it("yesterday-tolerant: streak counts from yesterday if today not done", () => {
      const habit = storage.createHabit("read");
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date();
      dayBefore.setDate(dayBefore.getDate() - 2);

      storage.toggleHabitForDate(habit.id, yesterday.toISOString().split("T")[0]);
      storage.toggleHabitForDate(habit.id, dayBefore.toISOString().split("T")[0]);

      expect(storage.getStreak(habit.id)).toBe(2);
    });
  });
});
