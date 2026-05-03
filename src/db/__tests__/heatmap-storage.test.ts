import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupTestDb, addDays, todayStr } from "./test-helpers";
import { HabitMetrics } from "../metrics";
import { HabitStorage } from "../storage";
import type Database from "better-sqlite3";

let db: Database.Database;
let store: HabitStorage;
let metrics: HabitMetrics;
let cleanup: () => void;

const today = todayStr();

beforeEach(() => {
  ({ db, storage: store, cleanup } = setupTestDb());
  metrics = new HabitMetrics(db);
});

afterEach(() => cleanup());

describe("heatmap storage", () => {
  describe("getHabitLogs", () => {
    it("returns empty array when no logs exist", () => {
      const habit = store.createHabit("Read");
      const logs = metrics.getHabitLogs(habit.id, 126);
      expect(logs).toEqual([]);
    });

    it("returns logs within the specified day range", () => {
      const habit = store.createHabit("Read");
      store.toggleHabitForDate(habit.id, today);
      store.toggleHabitForDate(habit.id, addDays(today, -5));
      store.toggleHabitForDate(habit.id, addDays(today, -200));

      const logs = metrics.getHabitLogs(habit.id, 126);
      expect(logs).toHaveLength(2);
      expect(logs).toContain(today);
      expect(logs).toContain(addDays(today, -5));
      expect(logs).not.toContain(addDays(today, -200));
    });

    it("returns logs sorted by date ascending", () => {
      const habit = store.createHabit("Read");
      store.toggleHabitForDate(habit.id, today);
      store.toggleHabitForDate(habit.id, addDays(today, -10));
      store.toggleHabitForDate(habit.id, addDays(today, -3));

      const logs = metrics.getHabitLogs(habit.id, 126);
      expect(logs).toEqual([...logs].sort());
    });
  });

  describe("getCompletionCount", () => {
    it("returns 0 when no logs exist", () => {
      const habit = store.createHabit("Read");
      expect(metrics.getCompletionCount(habit.id, 30)).toBe(0);
    });

    it("counts only logs within the specified day range", () => {
      const habit = store.createHabit("Read");
      store.toggleHabitForDate(habit.id, today);
      store.toggleHabitForDate(habit.id, addDays(today, -10));
      store.toggleHabitForDate(habit.id, addDays(today, -29));
      store.toggleHabitForDate(habit.id, addDays(today, -45));

      expect(metrics.getCompletionCount(habit.id, 30)).toBe(3);
    });
  });

  describe("getBestStreak", () => {
    it("returns 0 when no logs exist", () => {
      const habit = store.createHabit("Read");
      expect(metrics.getBestStreak(habit.id)).toBe(0);
    });

    it("returns 1 for a single logged day", () => {
      const habit = store.createHabit("Read");
      store.toggleHabitForDate(habit.id, today);
      expect(metrics.getBestStreak(habit.id)).toBe(1);
    });

    it("returns the longest consecutive run", () => {
      const habit = store.createHabit("Read");
      store.toggleHabitForDate(habit.id, today);
      store.toggleHabitForDate(habit.id, addDays(today, -1));
      store.toggleHabitForDate(habit.id, addDays(today, -2));
      for (let i = -10; i <= -6; i++) {
        store.toggleHabitForDate(habit.id, addDays(today, i));
      }

      expect(metrics.getBestStreak(habit.id)).toBe(5);
    });

    it("handles non-contiguous single days", () => {
      const habit = store.createHabit("Read");
      store.toggleHabitForDate(habit.id, addDays(today, -10));
      store.toggleHabitForDate(habit.id, addDays(today, -5));
      store.toggleHabitForDate(habit.id, addDays(today, -1));

      expect(metrics.getBestStreak(habit.id)).toBe(1);
    });
  });

  describe("getHeatmapData", () => {
    it("returns one row per active habit", () => {
      store.createHabit("Read");
      store.createHabit("Exercise");
      const archived = store.createHabit("Old");
      store.archiveHabit(archived.id);

      const rows = metrics.getHeatmapData(18);
      expect(rows).toHaveLength(2);
      expect(rows[0].habitName).toBe("Read");
      expect(rows[1].habitName).toBe("Exercise");
    });

    it("returns correct number of weeks", () => {
      store.createHabit("Read");
      const rows = metrics.getHeatmapData(18);
      expect(rows[0].weeks).toHaveLength(18);
    });

    it("each week has 7 days", () => {
      store.createHabit("Read");
      const rows = metrics.getHeatmapData(18);
      for (const week of rows[0].weeks) {
        expect(week).toHaveLength(7);
      }
    });

    it("marks done days correctly", () => {
      const habit = store.createHabit("Read");
      store.toggleHabitForDate(habit.id, today);

      const rows = metrics.getHeatmapData(18);
      const allDays = rows[0].weeks.flat();
      const todayCell = allDays.find((d) => d.date === today);
      expect(todayCell?.done).toBe(true);
    });

    it("includes total30 and bestStreak stats", () => {
      const habit = store.createHabit("Read");
      for (let i = 0; i < 5; i++) {
        store.toggleHabitForDate(habit.id, addDays(today, -i));
      }

      const rows = metrics.getHeatmapData(18);
      expect(rows[0].total30).toBe(5);
      expect(rows[0].bestStreak).toBe(5);
    });
  });
});
