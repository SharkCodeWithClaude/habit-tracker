import type { DayRecord } from "@/db/types";

export type CalendarCell = DayRecord | null;

export function parseYearMonth(ym: string | undefined): { year: number; month: number } {
  if (!ym) return currentYearMonth();

  const match = ym.match(/^(\d{4})-(\d{2})$/);
  if (!match) return currentYearMonth();

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);

  if (month < 1 || month > 12) return currentYearMonth();

  return { year, month };
}

export function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function buildCalendarGrid(
  year: number,
  month: number,
  days: DayRecord[],
): CalendarCell[][] {
  const firstDay = new Date(year, month - 1, 1);
  const startCol = firstDay.getDay();

  const cells: CalendarCell[] = [];

  for (let i = 0; i < startCol; i++) {
    cells.push(null);
  }

  for (const day of days) {
    cells.push(day);
  }

  const remainder = cells.length % 7;
  if (remainder > 0) {
    for (let i = 0; i < 7 - remainder; i++) {
      cells.push(null);
    }
  }

  const rows: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return rows;
}

export function navigateMonth(
  year: number,
  month: number,
  direction: 1 | -1,
): { year: number; month: number } {
  let m = month + direction;
  let y = year;
  if (m < 1) { m = 12; y--; }
  if (m > 12) { m = 1; y++; }
  return { year: y, month: m };
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
