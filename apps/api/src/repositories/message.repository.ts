import { eq, asc } from "drizzle-orm";
import { messages } from "../db/schema.js";
import type { Database } from "../config/database.js";

export class MessageRepository {
  constructor(private db: Database) {}

  async create(data: {
    conversationId: string;
    role: string;
    content: string;
  }) {
    const [message] = await this.db
      .insert(messages)
      .values(data)
      .returning();
    return message;
  }

  async listByConversation(conversationId: string) {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(asc(messages.createdAt));
  }
}
