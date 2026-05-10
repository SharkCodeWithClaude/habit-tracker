import { WeeklyReviewRepository } from "../repositories/weekly-review.repository.js";
import { HabitRepository } from "../repositories/habit.repository.js";
import type { Database } from "../config/database.js";
import type { WeeklyReviewStats, HabitWeekStat } from "@habit-tracker/shared";

function toMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export class ReviewService {
  private reviewRepo: WeeklyReviewRepository;
  private habitRepo: HabitRepository;

  constructor(db: Database) {
    this.reviewRepo = new WeeklyReviewRepository(db);
    this.habitRepo = new HabitRepository(db);
  }

  async getWeeklyStats(userId: string, week: string): Promise<WeeklyReviewStats> {
    const weekStart = toMonday(week);
    const weekEnd = addDays(weekStart, 6);
    const totalDays = 7;

    const activeHabits = await this.habitRepo.listActive(userId);
    const logs = await this.reviewRepo.getHabitLogsForWeek(userId, weekStart, weekEnd);
    const review = await this.reviewRepo.findByUserAndWeek(userId, weekStart);

    const habitStats: HabitWeekStat[] = activeHabits.map((habit) => {
      const habitLogs = logs.filter((l) => l.habitId === habit.id);
      const completedDays = new Set(habitLogs.map((l) => l.date)).size;
      const completionPercent = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

      return {
        habitId: habit.id,
        name: habit.name,
        emoji: habit.emoji,
        completedDays,
        totalDays,
        completionPercent,
      };
    });

    const totalCompleted = habitStats.reduce((sum, h) => sum + h.completedDays, 0);
    const totalPossible = habitStats.reduce((sum, h) => sum + h.totalDays, 0);
    const overallCompletionPercent =
      totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    const sorted = [...habitStats].sort(
      (a, b) => b.completionPercent - a.completionPercent
    );
    const best = sorted.length > 0 ? sorted[0] : null;
    const worst = sorted.length > 0 ? sorted[sorted.length - 1] : null;

    return {
      weekStart,
      overallCompletionPercent,
      habits: habitStats,
      best,
      worst,
      reflection: review?.reflection ?? "",
    };
  }

  async upsertReflection(
    userId: string,
    week: string,
    reflection: string
  ): Promise<{ weekStart: string; reflection: string }> {
    const weekStart = toMonday(week);
    const record = await this.reviewRepo.upsertReflection(userId, weekStart, reflection);
    return { weekStart: record.weekStart, reflection: record.reflection };
  }
}

export class ReviewError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
