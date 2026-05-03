import type Database from "better-sqlite3";
import { getDb } from "./init";
import type { Habit, HabitHeatmapRow, HeatmapDay, WeeklyReviewData, WeekDay, WeekHabitStat } from "./types";

function startDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo + 1);
  return d.toISOString().split("T")[0];
}

export class HabitMetrics {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db ?? getDb();
  }

  private getActiveHabits(): Habit[] {
    return this.db
      .prepare("SELECT * FROM habits WHERE archived_at IS NULL ORDER BY sort_order, id")
      .all() as Habit[];
  }

  getStreak(habitId: number): number {
    const today = new Date().toISOString().split("T")[0];
    const todayDone = this.db
      .prepare("SELECT 1 FROM habit_logs WHERE habit_id = ? AND date = ?")
      .get(habitId, today);

    let streak = todayDone ? 1 : 0;
    const checkDate = new Date();
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

  getStreaks(habitIds: number[]): Record<number, number> {
    const result: Record<number, number> = {};
    for (const id of habitIds) {
      result[id] = this.getStreak(id);
    }
    return result;
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
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        current++;
        if (current > best) best = current;
      } else {
        current = 1;
      }
    }

    return best;
  }

  getHabitLogs(habitId: number, days: number): string[] {
    const rows = this.db
      .prepare("SELECT date FROM habit_logs WHERE habit_id = ? AND date >= ? ORDER BY date ASC")
      .all(habitId, startDateStr(days)) as { date: string }[];
    return rows.map((r) => r.date);
  }

  getCompletionCount(habitId: number, days: number): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM habit_logs WHERE habit_id = ? AND date >= ?")
      .get(habitId, startDateStr(days)) as { count: number };
    return row.count;
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
}

export const metrics = new HabitMetrics();
