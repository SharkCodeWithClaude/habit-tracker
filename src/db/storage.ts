import type Database from "better-sqlite3";
import { getDb } from "./init";
import type { Habit, HabitWithStatus, DayRecord, HabitHeatmapRow, HeatmapDay, WeeklyReviewData, WeekDay, WeekHabitStat } from "./types";

export class HabitStorage {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db ?? getDb();
  }

  getActiveHabits(): Habit[] {
    return this.db
      .prepare("SELECT * FROM habits WHERE archived_at IS NULL ORDER BY sort_order, id")
      .all() as Habit[];
  }

  createHabit(name: string): Habit {
    const maxOrder = this.db
      .prepare("SELECT COALESCE(MAX(sort_order), 0) as max_order FROM habits WHERE archived_at IS NULL")
      .get() as { max_order: number };

    const result = this.db
      .prepare("INSERT INTO habits (name, sort_order) VALUES (?, ?)")
      .run(name, maxOrder.max_order + 1);

    return this.db
      .prepare("SELECT * FROM habits WHERE id = ?")
      .get(result.lastInsertRowid) as Habit;
  }

  archiveHabit(id: number): void {
    this.db
      .prepare("UPDATE habits SET archived_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(id);
  }

  updateHabitName(id: number, name: string): void {
    this.db
      .prepare("UPDATE habits SET name = ? WHERE id = ?")
      .run(name, id);
  }

  toggleHabitForDate(habitId: number, date: string): boolean {
    const existing = this.db
      .prepare("SELECT 1 FROM habit_logs WHERE habit_id = ? AND date = ?")
      .get(habitId, date);

    if (existing) {
      this.db
        .prepare("DELETE FROM habit_logs WHERE habit_id = ? AND date = ?")
        .run(habitId, date);
      return false;
    } else {
      this.db
        .prepare("INSERT INTO habit_logs (habit_id, date) VALUES (?, ?)")
        .run(habitId, date);
      return true;
    }
  }

  getDay(date: string): DayRecord {
    const habits = this.getActiveHabits();
    const logs = this.db
      .prepare("SELECT habit_id FROM habit_logs WHERE date = ?")
      .all(date) as { habit_id: number }[];

    const doneSet = new Set(logs.map((l) => l.habit_id));

    const dayNote = this.db
      .prepare("SELECT note, intention FROM day_notes WHERE date = ?")
      .get(date) as { note: string; intention: string } | undefined;

    return {
      date,
      note: dayNote?.note ?? "",
      intention: dayNote?.intention ?? "",
      habits: habits.map((h) => ({
        id: h.id,
        name: h.name,
        done: doneSet.has(h.id),
      })),
    };
  }

  setDayNote(date: string, note: string): void {
    this.db
      .prepare(
        `INSERT INTO day_notes (date, note, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(date) DO UPDATE SET note = excluded.note, updated_at = CURRENT_TIMESTAMP`
      )
      .run(date, note);
  }

  setDayIntention(date: string, intention: string): void {
    this.db
      .prepare(
        `INSERT INTO day_notes (date, intention, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(date) DO UPDATE SET intention = excluded.intention, updated_at = CURRENT_TIMESTAMP`
      )
      .run(date, intention);
  }

  getMonth(year: number, month: number): DayRecord[] {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

    const habits = this.getActiveHabits();
    const logs = this.db
      .prepare("SELECT habit_id, date FROM habit_logs WHERE date >= ? AND date <= ?")
      .all(startDate, endDate) as { habit_id: number; date: string }[];

    const notes = this.db
      .prepare("SELECT date, note, intention FROM day_notes WHERE date >= ? AND date <= ?")
      .all(startDate, endDate) as { date: string; note: string; intention: string }[];

    const logsByDate = new Map<string, Set<number>>();
    for (const log of logs) {
      if (!logsByDate.has(log.date)) logsByDate.set(log.date, new Set());
      logsByDate.get(log.date)!.add(log.habit_id);
    }

    const notesByDate = new Map<string, { note: string; intention: string }>();
    for (const n of notes) {
      notesByDate.set(n.date, { note: n.note, intention: n.intention });
    }

    const days: DayRecord[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const doneSet = logsByDate.get(date) ?? new Set();
      const dayNote = notesByDate.get(date);
      days.push({
        date,
        note: dayNote?.note ?? "",
        intention: dayNote?.intention ?? "",
        habits: habits.map((h) => ({
          id: h.id,
          name: h.name,
          done: doneSet.has(h.id),
        })),
      });
    }

    return days;
  }

  getStreak(habitId: number): number {
    const today = new Date().toISOString().split("T")[0];
    const todayDone = this.db
      .prepare("SELECT 1 FROM habit_logs WHERE habit_id = ? AND date = ?")
      .get(habitId, today);

    let streak = todayDone ? 1 : 0;
    let checkDate = new Date();
    if (!todayDone) {
      // start counting from yesterday
    }
    checkDate.setDate(checkDate.getDate() - 1);

    while (true) {
      const dateStr = checkDate.toISOString().split("T")[0];
      const done = this.db
        .prepare("SELECT 1 FROM habit_logs WHERE habit_id = ? AND date = ?")
        .get(habitId, dateStr);

      if (!done) break;
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }
  getHabitLogs(habitId: number, days: number): string[] {
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    const startDate = start.toISOString().split("T")[0];

    const rows = this.db
      .prepare("SELECT date FROM habit_logs WHERE habit_id = ? AND date >= ? ORDER BY date ASC")
      .all(habitId, startDate) as { date: string }[];

    return rows.map((r) => r.date);
  }

  getCompletionCount(habitId: number, days: number): number {
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    const startDate = start.toISOString().split("T")[0];

    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM habit_logs WHERE habit_id = ? AND date >= ?")
      .get(habitId, startDate) as { count: number };

    return row.count;
  }

  getBestStreak(habitId: number): number {
    const rows = this.db
      .prepare("SELECT date FROM habit_logs WHERE habit_id = ? ORDER BY date ASC")
      .all(habitId) as { date: string }[];

    if (rows.length === 0) return 0;

    let best = 1;
    let current = 1;

    for (let i = 1; i < rows.length; i++) {
      const prev = new Date(rows[i - 1].date);
      const curr = new Date(rows[i].date);
      const diffMs = curr.getTime() - prev.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        current++;
        if (current > best) best = current;
      } else {
        current = 1;
      }
    }

    return best;
  }

  getHeatmapData(weeks: number): HabitHeatmapRow[] {
    const habits = this.getActiveHabits();
    const totalDays = weeks * 7;

    const today = new Date();
    const todayDay = today.getDay();
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - todayDay));

    const startDate = new Date(endOfWeek);
    startDate.setDate(endOfWeek.getDate() - totalDays + 1);

    return habits.map((habit) => {
      const logs = new Set(this.getHabitLogs(habit.id, totalDays));
      const weeksList: HeatmapDay[][] = [];

      const cursor = new Date(startDate);
      for (let w = 0; w < weeks; w++) {
        const week: HeatmapDay[] = [];
        for (let d = 0; d < 7; d++) {
          const dateStr = cursor.toISOString().split("T")[0];
          week.push({ date: dateStr, done: logs.has(dateStr) });
          cursor.setDate(cursor.getDate() + 1);
        }
        weeksList.push(week);
      }

      return {
        habitId: habit.id,
        habitName: habit.name,
        total30: this.getCompletionCount(habit.id, 30),
        bestStreak: this.getBestStreak(habit.id),
        weeks: weeksList,
      };
    });
  }
  getWeeklyReview(endDate: string): WeeklyReviewData {
    const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
    const end = new Date(endDate);
    const todayStr = new Date().toISOString().split("T")[0];

    const days: WeekDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: dateStr,
        dayLetter: DAY_LETTERS[d.getDay()],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
      });
    }

    const startDate = days[0].date;
    const habits = this.getActiveHabits();
    const logs = this.db
      .prepare("SELECT habit_id, date FROM habit_logs WHERE date >= ? AND date <= ?")
      .all(startDate, endDate) as { habit_id: number; date: string }[];

    const logSet = new Set(logs.map((l) => `${l.habit_id}|${l.date}`));

    const habitStats: WeekHabitStat[] = habits.map((h) => {
      const daysArr = days.map((d) => logSet.has(`${h.id}|${d.date}`));
      return {
        habitId: h.id,
        habitName: h.name,
        done: daysArr.filter(Boolean).length,
        days: daysArr,
      };
    });

    const totalCompletions = habitStats.reduce((s, h) => s + h.done, 0);
    const possibleCompletions = habits.length * 7;
    const pct = possibleCompletions > 0 ? Math.round((totalCompletions / possibleCompletions) * 100) : 0;

    const sorted = [...habitStats].sort((a, b) => b.done - a.done);
    const bestHabit = sorted.length > 0 ? sorted[0] : null;
    const worstHabit = sorted.length > 0 ? sorted[sorted.length - 1] : null;

    const reflectionRow = this.db
      .prepare("SELECT reflection FROM weekly_reviews WHERE week_end = ?")
      .get(endDate) as { reflection: string } | undefined;

    return {
      days,
      habits: habitStats,
      totalCompletions,
      possibleCompletions,
      pct,
      bestHabit,
      worstHabit,
      reflection: reflectionRow?.reflection ?? "",
      weekEndDate: endDate,
    };
  }

  saveReflection(weekEnd: string, reflection: string): void {
    this.db
      .prepare(
        `INSERT INTO weekly_reviews (week_end, reflection, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(week_end) DO UPDATE SET reflection = excluded.reflection, updated_at = CURRENT_TIMESTAMP`
      )
      .run(weekEnd, reflection);
  }
}

export const storage = new HabitStorage();
