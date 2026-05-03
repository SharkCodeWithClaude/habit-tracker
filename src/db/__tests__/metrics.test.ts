import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupTestDb, addDays, todayStr } from "./test-helpers";
import { HabitMetrics } from "../metrics";
import { HabitStorage } from "../storage";
import type Database from "better-sqlite3";

let db: Database.Database;
let storage: HabitStorage;
let metrics: HabitMetrics;
let cleanup: () => void;

const today = todayStr();

beforeEach(() => {
  ({ db, storage, cleanup } = setupTestDb());
  metrics = new HabitMetrics(db);
});

afterEach(() => cleanup());

describe("HabitMetrics", () => {
  describe("getStreak", () => {
    it("returns 0 for no logs", () => {
      const habit = storage.createHabit("read");
      expect(metrics.getStreak(habit.id)).toBe(0);
    });

    it("counts consecutive days ending today", () => {
      const habit = storage.createHabit("read");
      for (let i = 0; i < 3; i++) {
        storage.toggleHabitForDate(habit.id, addDays(today, -i));
      }
      expect(metrics.getStreak(habit.id)).toBe(3);
    });

    it("yesterday-tolerant: streak counts from yesterday if today not done", () => {
      const habit = storage.createHabit("read");
      storage.toggleHabitForDate(habit.id, addDays(today, -1));
      storage.toggleHabitForDate(habit.id, addDays(today, -2));
      expect(metrics.getStreak(habit.id)).toBe(2);
    });
  });

  describe("getStreaks (batch)", () => {
    it("returns streaks for multiple habits in one call", () => {
      const h1 = storage.createHabit("read");
      const h2 = storage.createHabit("exercise");
      const h3 = storage.createHabit("meditate");

      for (let i = 0; i < 3; i++) {
        storage.toggleHabitForDate(h1.id, addDays(today, -i));
      }
      storage.toggleHabitForDate(h2.id, today);

      const streaks = metrics.getStreaks([h1.id, h2.id, h3.id]);
      expect(streaks[h1.id]).toBe(3);
      expect(streaks[h2.id]).toBe(1);
      expect(streaks[h3.id]).toBe(0);
    });

    it("returns empty object for empty array", () => {
      expect(metrics.getStreaks([])).toEqual({});
    });
  });

  describe("getBestStreak", () => {
    it("returns 0 when no logs exist", () => {
      const habit = storage.createHabit("Read");
      expect(metrics.getBestStreak(habit.id)).toBe(0);
    });

    it("returns 1 for a single logged day", () => {
      const habit = storage.createHabit("Read");
      storage.toggleHabitForDate(habit.id, today);
      expect(metrics.getBestStreak(habit.id)).toBe(1);
    });

    it("returns the longest consecutive run", () => {
      const habit = storage.createHabit("Read");
      storage.toggleHabitForDate(habit.id, today);
      storage.toggleHabitForDate(habit.id, addDays(today, -1));
      storage.toggleHabitForDate(habit.id, addDays(today, -2));
      for (let i = -10; i <= -6; i++) {
        storage.toggleHabitForDate(habit.id, addDays(today, i));
      }
      expect(metrics.getBestStreak(habit.id)).toBe(5);
    });

    it("handles non-contiguous single days", () => {
      const habit = storage.createHabit("Read");
      storage.toggleHabitForDate(habit.id, addDays(today, -10));
      storage.toggleHabitForDate(habit.id, addDays(today, -5));
      storage.toggleHabitForDate(habit.id, addDays(today, -1));
      expect(metrics.getBestStreak(habit.id)).toBe(1);
    });
  });

  describe("getHabitLogs", () => {
    it("returns empty array when no logs exist", () => {
      const habit = storage.createHabit("Read");
      expect(metrics.getHabitLogs(habit.id, 126)).toEqual([]);
    });

    it("returns logs within the specified day range", () => {
      const habit = storage.createHabit("Read");
      storage.toggleHabitForDate(habit.id, today);
      storage.toggleHabitForDate(habit.id, addDays(today, -5));
      storage.toggleHabitForDate(habit.id, addDays(today, -200));

      const logs = metrics.getHabitLogs(habit.id, 126);
      expect(logs).toHaveLength(2);
      expect(logs).toContain(today);
      expect(logs).toContain(addDays(today, -5));
    });

    it("returns logs sorted by date ascending", () => {
      const habit = storage.createHabit("Read");
      storage.toggleHabitForDate(habit.id, today);
      storage.toggleHabitForDate(habit.id, addDays(today, -10));
      storage.toggleHabitForDate(habit.id, addDays(today, -3));

      const logs = metrics.getHabitLogs(habit.id, 126);
      expect(logs).toEqual([...logs].sort());
    });
  });

  describe("getCompletionCount", () => {
    it("returns 0 when no logs exist", () => {
      const habit = storage.createHabit("Read");
      expect(metrics.getCompletionCount(habit.id, 30)).toBe(0);
    });

    it("counts only logs within the specified day range", () => {
      const habit = storage.createHabit("Read");
      storage.toggleHabitForDate(habit.id, today);
      storage.toggleHabitForDate(habit.id, addDays(today, -10));
      storage.toggleHabitForDate(habit.id, addDays(today, -29));
      storage.toggleHabitForDate(habit.id, addDays(today, -45));

      expect(metrics.getCompletionCount(habit.id, 30)).toBe(3);
    });
  });

  describe("getHeatmapData", () => {
    it("returns one row per active habit", () => {
      storage.createHabit("Read");
      storage.createHabit("Exercise");
      const archived = storage.createHabit("Old");
      storage.archiveHabit(archived.id);

      const rows = metrics.getHeatmapData(18);
      expect(rows).toHaveLength(2);
      expect(rows[0].habitName).toBe("Read");
      expect(rows[1].habitName).toBe("Exercise");
    });

    it("returns correct number of weeks", () => {
      storage.createHabit("Read");
      const rows = metrics.getHeatmapData(18);
      expect(rows[0].weeks).toHaveLength(18);
    });

    it("each week has 7 days", () => {
      storage.createHabit("Read");
      const rows = metrics.getHeatmapData(18);
      for (const week of rows[0].weeks) {
        expect(week).toHaveLength(7);
      }
    });

    it("marks done days correctly", () => {
      const habit = storage.createHabit("Read");
      storage.toggleHabitForDate(habit.id, today);

      const rows = metrics.getHeatmapData(18);
      const allDays = rows[0].weeks.flat();
      const todayCell = allDays.find((d) => d.date === today);
      expect(todayCell?.done).toBe(true);
    });

    it("includes total30 and bestStreak stats", () => {
      const habit = storage.createHabit("Read");
      for (let i = 0; i < 5; i++) {
        storage.toggleHabitForDate(habit.id, addDays(today, -i));
      }

      const rows = metrics.getHeatmapData(18);
      expect(rows[0].total30).toBe(5);
      expect(rows[0].bestStreak).toBe(5);
    });
  });

  describe("getWeeklyReview", () => {
    it("returns 7 days ending on the given date", () => {
      storage.createHabit("Read");
      const review = metrics.getWeeklyReview(today);
      expect(review.days).toHaveLength(7);
      expect(review.days[6].date).toBe(today);
      expect(review.days[0].date).toBe(addDays(today, -6));
    });

    it("marks today correctly in the days array", () => {
      storage.createHabit("Read");
      const review = metrics.getWeeklyReview(today);
      expect(review.days[6].isToday).toBe(true);
      expect(review.days[0].isToday).toBe(false);
    });

    it("computes per-habit stats with done count and days array", () => {
      const h1 = storage.createHabit("Read");
      const h2 = storage.createHabit("Exercise");
      storage.toggleHabitForDate(h1.id, today);
      storage.toggleHabitForDate(h1.id, addDays(today, -1));
      storage.toggleHabitForDate(h1.id, addDays(today, -2));
      storage.toggleHabitForDate(h2.id, today);

      const review = metrics.getWeeklyReview(today);
      expect(review.habits).toHaveLength(2);

      const readStat = review.habits.find((h) => h.habitName === "Read")!;
      expect(readStat.done).toBe(3);
      expect(readStat.days[6]).toBe(true);
      expect(readStat.days[5]).toBe(true);
      expect(readStat.days[4]).toBe(true);
      expect(readStat.days[3]).toBe(false);
    });

    it("computes overall completion stats", () => {
      const h1 = storage.createHabit("Read");
      const h2 = storage.createHabit("Exercise");
      storage.toggleHabitForDate(h1.id, today);
      storage.toggleHabitForDate(h1.id, addDays(today, -1));
      storage.toggleHabitForDate(h1.id, addDays(today, -2));
      storage.toggleHabitForDate(h2.id, today);

      const review = metrics.getWeeklyReview(today);
      expect(review.totalCompletions).toBe(4);
      expect(review.possibleCompletions).toBe(14);
      expect(review.pct).toBe(29);
    });

    it("identifies best and worst habits", () => {
      const h1 = storage.createHabit("Read");
      const h2 = storage.createHabit("Exercise");
      storage.toggleHabitForDate(h1.id, today);
      storage.toggleHabitForDate(h1.id, addDays(today, -1));
      storage.toggleHabitForDate(h1.id, addDays(today, -2));
      storage.toggleHabitForDate(h2.id, today);

      const review = metrics.getWeeklyReview(today);
      expect(review.bestHabit?.habitName).toBe("Read");
      expect(review.worstHabit?.habitName).toBe("Exercise");
    });

    it("returns null for best/worst when no habits exist", () => {
      const review = metrics.getWeeklyReview(today);
      expect(review.bestHabit).toBeNull();
      expect(review.worstHabit).toBeNull();
    });

    it("excludes archived habits", () => {
      const h1 = storage.createHabit("Read");
      const h2 = storage.createHabit("Old");
      storage.archiveHabit(h2.id);
      storage.toggleHabitForDate(h1.id, today);

      const review = metrics.getWeeklyReview(today);
      expect(review.habits).toHaveLength(1);
      expect(review.habits[0].habitName).toBe("Read");
    });
  });

  describe("reflection persistence", () => {
    it("returns empty string when no reflection saved", () => {
      const review = metrics.getWeeklyReview(today);
      expect(review.reflection).toBe("");
    });

    it("saves and retrieves reflection text", () => {
      storage.saveReflection(today, "Great week!");
      const review = metrics.getWeeklyReview(today);
      expect(review.reflection).toBe("Great week!");
    });

    it("updates existing reflection", () => {
      storage.saveReflection(today, "First draft");
      storage.saveReflection(today, "Updated reflection");
      const review = metrics.getWeeklyReview(today);
      expect(review.reflection).toBe("Updated reflection");
    });
  });
});
