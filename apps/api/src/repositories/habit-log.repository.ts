import { eq, and, desc } from "drizzle-orm";
import { habitLogs } from "../db/schema.js";
import type { Database } from "../config/database.js";

export class HabitLogRepository {
  constructor(private db: Database) {}

  async findByHabitAndDate(habitId: string, date: string) {
    const rows = await this.db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))
      .limit(1);
    return rows[0] ?? null;
  }

  async upsert(habitId: string, date: string, value: number) {
    const existing = await this.findByHabitAndDate(habitId, date);
    if (existing) {
      const [updated] = await this.db
        .update(habitLogs)
        .set({ value })
        .where(eq(habitLogs.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db
      .insert(habitLogs)
      .values({ habitId, date, value })
      .returning();
    return created;
  }

  async deleteByHabitAndDate(habitId: string, date: string) {
    await this.db
      .delete(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));
  }

  async findByHabitOrderedDesc(habitId: string) {
    return this.db
      .select()
      .from(habitLogs)
      .where(eq(habitLogs.habitId, habitId))
      .orderBy(desc(habitLogs.date));
  }
}
