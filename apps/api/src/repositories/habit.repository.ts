import { eq, and, isNull, asc } from "drizzle-orm";
import { habits, habitAliases } from "../db/schema.js";
import type { Database } from "../config/database.js";

export class HabitRepository {
  constructor(private db: Database) {}

  async create(data: {
    userId: string;
    name: string;
    emoji: string;
    kind: string;
    sortOrder?: number;
  }) {
    const [habit] = await this.db.insert(habits).values(data).returning();
    return habit;
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(habits)
      .where(eq(habits.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async findByIdAndUser(id: string, userId: string) {
    const rows = await this.db
      .select()
      .from(habits)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async listActive(userId: string) {
    return this.db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)))
      .orderBy(asc(habits.sortOrder));
  }

  async update(
    id: string,
    data: { name?: string; emoji?: string; sortOrder?: number }
  ) {
    const [updated] = await this.db
      .update(habits)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(habits.id, id))
      .returning();
    return updated;
  }

  async archive(id: string) {
    const [archived] = await this.db
      .update(habits)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(habits.id, id))
      .returning();
    return archived;
  }
}

export class HabitAliasRepository {
  constructor(private db: Database) {}

  async createMany(habitId: string, aliases: string[]) {
    if (aliases.length === 0) return [];
    const values = aliases.map((alias) => ({
      habitId,
      alias: alias.toLowerCase(),
    }));
    return this.db.insert(habitAliases).values(values).returning();
  }

  async findByHabitId(habitId: string) {
    return this.db
      .select()
      .from(habitAliases)
      .where(eq(habitAliases.habitId, habitId));
  }

  async findByHabitIds(habitIds: string[]) {
    if (habitIds.length === 0) return [];
    const rows = await this.db.select().from(habitAliases);
    return rows.filter((r) => habitIds.includes(r.habitId));
  }
}
