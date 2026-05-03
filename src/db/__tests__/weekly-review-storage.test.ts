import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupTestDb, addDays, todayStr } from "./test-helpers";
import { HabitStorage } from "../storage";

let store: HabitStorage;
let cleanup: () => void;

const today = todayStr();

beforeEach(() => {
  ({ storage: store, cleanup } = setupTestDb());
});

afterEach(() => cleanup());

describe("weekly review storage", () => {
  describe("getWeeklyReview", () => {
    it("returns 7 days ending on the given date", () => {
      store.createHabit("Read");
      const review = store.getWeeklyReview(today);
      expect(review.days).toHaveLength(7);
      expect(review.days[6].date).toBe(today);
      expect(review.days[0].date).toBe(addDays(today, -6));
    });

    it("marks today correctly in the days array", () => {
      store.createHabit("Read");
      const review = store.getWeeklyReview(today);
      expect(review.days[6].isToday).toBe(true);
      expect(review.days[0].isToday).toBe(false);
    });

    it("includes day letters and date numbers", () => {
      store.createHabit("Read");
      const review = store.getWeeklyReview(today);
      for (const day of review.days) {
        expect(day.dayLetter).toHaveLength(1);
        expect(day.dayNum).toBeGreaterThanOrEqual(1);
        expect(day.dayNum).toBeLessThanOrEqual(31);
      }
    });

    it("computes per-habit stats with done count and days array", () => {
      const h1 = store.createHabit("Read");
      const h2 = store.createHabit("Exercise");
      store.toggleHabitForDate(h1.id, today);
      store.toggleHabitForDate(h1.id, addDays(today, -1));
      store.toggleHabitForDate(h1.id, addDays(today, -2));
      store.toggleHabitForDate(h2.id, today);

      const review = store.getWeeklyReview(today);
      expect(review.habits).toHaveLength(2);

      const readStat = review.habits.find((h) => h.habitName === "Read")!;
      expect(readStat.done).toBe(3);
      expect(readStat.days).toHaveLength(7);
      expect(readStat.days[6]).toBe(true);
      expect(readStat.days[5]).toBe(true);
      expect(readStat.days[4]).toBe(true);
      expect(readStat.days[3]).toBe(false);

      const exStat = review.habits.find((h) => h.habitName === "Exercise")!;
      expect(exStat.done).toBe(1);
    });

    it("computes overall completion stats", () => {
      const h1 = store.createHabit("Read");
      const h2 = store.createHabit("Exercise");
      // 3 completions for Read, 1 for Exercise = 4 total out of 14 possible
      store.toggleHabitForDate(h1.id, today);
      store.toggleHabitForDate(h1.id, addDays(today, -1));
      store.toggleHabitForDate(h1.id, addDays(today, -2));
      store.toggleHabitForDate(h2.id, today);

      const review = store.getWeeklyReview(today);
      expect(review.totalCompletions).toBe(4);
      expect(review.possibleCompletions).toBe(14);
      expect(review.pct).toBe(29);
    });

    it("identifies best and worst habits", () => {
      const h1 = store.createHabit("Read");
      const h2 = store.createHabit("Exercise");
      store.toggleHabitForDate(h1.id, today);
      store.toggleHabitForDate(h1.id, addDays(today, -1));
      store.toggleHabitForDate(h1.id, addDays(today, -2));
      store.toggleHabitForDate(h2.id, today);

      const review = store.getWeeklyReview(today);
      expect(review.bestHabit?.habitName).toBe("Read");
      expect(review.worstHabit?.habitName).toBe("Exercise");
    });

    it("returns null for best/worst when no habits exist", () => {
      const review = store.getWeeklyReview(today);
      expect(review.bestHabit).toBeNull();
      expect(review.worstHabit).toBeNull();
    });

    it("excludes archived habits", () => {
      const h1 = store.createHabit("Read");
      const h2 = store.createHabit("Old");
      store.archiveHabit(h2.id);
      store.toggleHabitForDate(h1.id, today);

      const review = store.getWeeklyReview(today);
      expect(review.habits).toHaveLength(1);
      expect(review.habits[0].habitName).toBe("Read");
    });
  });

  describe("reflection persistence", () => {
    it("returns empty string when no reflection saved", () => {
      const review = store.getWeeklyReview(today);
      expect(review.reflection).toBe("");
    });

    it("saves and retrieves reflection text", () => {
      store.saveReflection(today, "Great week!");
      const review = store.getWeeklyReview(today);
      expect(review.reflection).toBe("Great week!");
    });

    it("updates existing reflection", () => {
      store.saveReflection(today, "First draft");
      store.saveReflection(today, "Updated reflection");
      const review = store.getWeeklyReview(today);
      expect(review.reflection).toBe("Updated reflection");
    });
  });
});
