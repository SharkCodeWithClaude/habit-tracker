import { eq, and, isNull, asc } from "drizzle-orm";
import { conversations } from "../db/schema.js";
import type { Database } from "../config/database.js";

export class ConversationRepository {
  constructor(private db: Database) {}

  async create(data: { userId: string; date: string }) {
    const [conversation] = await this.db
      .insert(conversations)
      .values(data)
      .returning();
    return conversation;
  }

  async findActive(userId: string) {
    const rows = await this.db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.userId, userId), isNull(conversations.endedAt))
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findByIdAndUser(id: string, userId: string) {
    const rows = await this.db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.id, id), eq(conversations.userId, userId))
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async wrap(id: string) {
    const [wrapped] = await this.db
      .update(conversations)
      .set({ endedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return wrapped;
  }

  async updateTokenCount(id: string, tokenCount: number) {
    const [updated] = await this.db
      .update(conversations)
      .set({ tokenCount })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async listByUserAndDate(userId: string, date: string) {
    return this.db
      .select()
      .from(conversations)
      .where(
        and(eq(conversations.userId, userId), eq(conversations.date, date))
      )
      .orderBy(asc(conversations.startedAt));
  }
}
