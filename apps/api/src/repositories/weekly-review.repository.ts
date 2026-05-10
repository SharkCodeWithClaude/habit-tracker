import { eq, and, gte, lte, sql } from "drizzle-orm";
import { weeklyReviews, habitLogs, habits } from "../db/schema.js";
import type { Database } from "../config/database.js";

export class WeeklyReviewRepository {
  constructor(private db: Database) {}

  async findByUserAndWeek(userId: string, weekStart: string) {
    const rows = await this.db
      .select()
      .from(weeklyReviews)
      .where(
        and(
          eq(weeklyReviews.userId, userId),
          eq(weeklyReviews.weekStart, weekStart)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async upsertReflection(userId: string, weekStart: string, reflection: string) {
    const existing = await this.findByUserAndWeek(userId, weekStart);
    if (existing) {
      const [updated] = await this.db
        .update(weeklyReviews)
        .set({ reflection, updatedAt: new Date() })
        .where(eq(weeklyReviews.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db
      .insert(weeklyReviews)
      .values({ userId, weekStart, reflection })
      .returning();
    return created;
  }

  async getHabitLogsForWeek(userId: string, weekStart: string, weekEnd: string) {
    return this.db
      .select({
        habitId: habitLogs.habitId,
        date: habitLogs.date,
        value: habitLogs.value,
      })
      .from(habitLogs)
      .innerJoin(habits, eq(habitLogs.habitId, habits.id))
      .where(
        and(
          eq(habits.userId, userId),
          sql`${habits.archivedAt} IS NULL`,
          gte(habitLogs.date, weekStart),
          lte(habitLogs.date, weekEnd)
        )
      );
  }
}
