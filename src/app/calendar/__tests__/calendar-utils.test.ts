import { describe, it, expect } from "vitest";
import { buildCalendarGrid, parseYearMonth, formatYearMonth } from "../calendar-utils";
import type { DayRecord } from "@/db/types";

describe("parseYearMonth", () => {
  it("parses valid YYYY-MM string", () => {
    expect(parseYearMonth("2026-05")).toEqual({ year: 2026, month: 5 });
  });

  it("returns current month for invalid input", () => {
    const now = new Date();
    const result = parseYearMonth("garbage");
    expect(result.year).toBe(now.getFullYear());
    expect(result.month).toBe(now.getMonth() + 1);
  });

  it("returns current month for undefined input", () => {
    const now = new Date();
    const result = parseYearMonth(undefined);
    expect(result.year).toBe(now.getFullYear());
    expect(result.month).toBe(now.getMonth() + 1);
  });

  it("rejects month out of range", () => {
    const now = new Date();
    const result = parseYearMonth("2026-13");
    expect(result.year).toBe(now.getFullYear());
    expect(result.month).toBe(now.getMonth() + 1);
  });
});

describe("formatYearMonth", () => {
  it("formats year and month as YYYY-MM", () => {
    expect(formatYearMonth(2026, 5)).toBe("2026-05");
  });

  it("zero-pads single digit months", () => {
    expect(formatYearMonth(2026, 1)).toBe("2026-01");
  });
});

describe("buildCalendarGrid", () => {
  const makeDays = (count: number): DayRecord[] =>
    Array.from({ length: count }, (_, i) => ({
      date: `2026-05-${String(i + 1).padStart(2, "0")}`,
      note: "",
      intention: "",
      habits: [],
    }));

  it("returns 7-column rows with leading empty cells for May 2026 (starts Friday)", () => {
    const days = makeDays(31);
    const grid = buildCalendarGrid(2026, 5, days);

    // May 1 2026 is a Friday => startCol = 5
    expect(grid[0]).toHaveLength(7);
    // first 5 cells should be null (padding)
    for (let i = 0; i < 5; i++) {
      expect(grid[0][i]).toBeNull();
    }
    // 6th cell (index 5) should be May 1
    expect(grid[0][5]?.date).toBe("2026-05-01");
    expect(grid[0][6]?.date).toBe("2026-05-02");
  });

  it("fills trailing cells with null", () => {
    const days = makeDays(31);
    const grid = buildCalendarGrid(2026, 5, days);
    const lastRow = grid[grid.length - 1];
    // May 31 is Sunday (index 0), so rest of last row should be null
    // Actually May 31 2026: let's calculate. May 1 = Friday, so May 31 = Sunday
    // The last row should have May 31 at index 0, rest null
    expect(lastRow[0]?.date).toBe("2026-05-31");
    for (let i = 1; i < 7; i++) {
      expect(lastRow[i]).toBeNull();
    }
  });

  it("contains all days of the month", () => {
    const days = makeDays(31);
    const grid = buildCalendarGrid(2026, 5, days);
    const allDays = grid.flat().filter((d) => d !== null);
    expect(allDays).toHaveLength(31);
  });

  it("handles February in a non-leap year", () => {
    const febDays: DayRecord[] = Array.from({ length: 28 }, (_, i) => ({
      date: `2027-02-${String(i + 1).padStart(2, "0")}`,
      note: "",
      intention: "",
      habits: [],
    }));
    const grid = buildCalendarGrid(2027, 2, febDays);
    const allDays = grid.flat().filter((d) => d !== null);
    expect(allDays).toHaveLength(28);
  });
});
