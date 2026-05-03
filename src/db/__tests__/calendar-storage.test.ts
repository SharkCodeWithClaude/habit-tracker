import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupTestDb } from "./test-helpers";
import { HabitStorage } from "../storage";

let storage: HabitStorage;
let cleanup: () => void;

beforeEach(() => {
  ({ storage, cleanup } = setupTestDb());
});

afterEach(() => cleanup());

describe("getMonth — calendar data", () => {
  it("returns correct number of days for each month", () => {
    storage.createHabit("read");

    expect(storage.getMonth(2026, 1)).toHaveLength(31);
    expect(storage.getMonth(2026, 2)).toHaveLength(28);
    expect(storage.getMonth(2024, 2)).toHaveLength(29); // leap year
    expect(storage.getMonth(2026, 4)).toHaveLength(30);
  });

  it("tracks done status per habit per day", () => {
    const h1 = storage.createHabit("read");
    const h2 = storage.createHabit("exercise");

    storage.toggleHabitForDate(h1.id, "2026-05-10");
    storage.toggleHabitForDate(h2.id, "2026-05-10");
    storage.toggleHabitForDate(h1.id, "2026-05-15");

    const days = storage.getMonth(2026, 5);

    const may10 = days.find((d) => d.date === "2026-05-10")!;
    expect(may10.habits.find((h) => h.id === h1.id)!.done).toBe(true);
    expect(may10.habits.find((h) => h.id === h2.id)!.done).toBe(true);

    const may15 = days.find((d) => d.date === "2026-05-15")!;
    expect(may15.habits.find((h) => h.id === h1.id)!.done).toBe(true);
    expect(may15.habits.find((h) => h.id === h2.id)!.done).toBe(false);

    const may1 = days.find((d) => d.date === "2026-05-01")!;
    expect(may1.habits.every((h) => !h.done)).toBe(true);
  });

  it("includes notes for days that have them", () => {
    storage.createHabit("read");
    storage.setDayNote("2026-05-10", "great day");
    storage.setDayNote("2026-05-20", "productive");

    const days = storage.getMonth(2026, 5);

    expect(days.find((d) => d.date === "2026-05-10")!.note).toBe("great day");
    expect(days.find((d) => d.date === "2026-05-20")!.note).toBe("productive");
    expect(days.find((d) => d.date === "2026-05-01")!.note).toBe("");
  });

  it("excludes archived habits from month data", () => {
    const h1 = storage.createHabit("read");
    const h2 = storage.createHabit("exercise");
    storage.toggleHabitForDate(h1.id, "2026-05-10");
    storage.toggleHabitForDate(h2.id, "2026-05-10");
    storage.archiveHabit(h2.id);

    const days = storage.getMonth(2026, 5);
    const may10 = days.find((d) => d.date === "2026-05-10")!;
    expect(may10.habits).toHaveLength(1);
    expect(may10.habits[0].name).toBe("read");
  });

  it("returns empty habits array when no active habits exist", () => {
    const days = storage.getMonth(2026, 5);
    expect(days).toHaveLength(31);
    expect(days[0].habits).toEqual([]);
  });
});
