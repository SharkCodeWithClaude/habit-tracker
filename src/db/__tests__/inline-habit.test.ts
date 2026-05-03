import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupTestDb } from "./test-helpers";
import { HabitStorage } from "../storage";
import type Database from "better-sqlite3";

let db: Database.Database;
let storage: HabitStorage;
let cleanup: () => void;

beforeEach(() => {
  ({ db, storage, cleanup } = setupTestDb());
});

afterEach(() => cleanup());

describe("inline habit creation", () => {
  it("creates a habit with a name", () => {
    const habit = storage.createHabit("Meditate");
    expect(habit.name).toBe("Meditate");
    expect(storage.getActiveHabits()).toHaveLength(1);
  });

  it("new habit appears in getDay immediately", () => {
    storage.createHabit("Meditate");
    const day = storage.getDay("2026-05-01");
    expect(day.habits).toHaveLength(1);
    expect(day.habits[0].name).toBe("Meditate");
    expect(day.habits[0].done).toBe(false);
  });
});

describe("inline habit deletion (archive on clear)", () => {
  it("archiving a habit removes it from active list", () => {
    const h = storage.createHabit("Meditate");
    storage.archiveHabit(h.id);
    expect(storage.getActiveHabits()).toHaveLength(0);
  });

  it("archived habit disappears from getDay", () => {
    const h1 = storage.createHabit("Read");
    const h2 = storage.createHabit("Meditate");
    storage.archiveHabit(h2.id);

    const day = storage.getDay("2026-05-01");
    expect(day.habits).toHaveLength(1);
    expect(day.habits[0].name).toBe("Read");
  });

  it("archived habit preserves its logs", () => {
    const h = storage.createHabit("Read");
    storage.toggleHabitForDate(h.id, "2026-05-01");
    storage.archiveHabit(h.id);

    const log = db
      .prepare("SELECT * FROM habit_logs WHERE habit_id = ?")
      .get(h.id);
    expect(log).toBeDefined();
  });
});

describe("updateHabitName", () => {
  it("updates the habit name", () => {
    const h = storage.createHabit("Read");
    storage.updateHabitName(h.id, "Read 20 pages");
    const habits = storage.getActiveHabits();
    expect(habits[0].name).toBe("Read 20 pages");
  });

  it("does not affect other habits", () => {
    storage.createHabit("Read");
    const h2 = storage.createHabit("Exercise");
    storage.updateHabitName(h2.id, "Workout");

    const habits = storage.getActiveHabits();
    expect(habits[0].name).toBe("Read");
    expect(habits[1].name).toBe("Workout");
  });
});
