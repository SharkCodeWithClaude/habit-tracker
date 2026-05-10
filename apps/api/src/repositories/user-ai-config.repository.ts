import { eq, and } from "drizzle-orm";
import { userAiConfigs } from "../db/schema.js";
import type { Database } from "../config/database.js";
import type { AiProvider } from "@habit-tracker/shared";

export class UserAiConfigRepository {
  constructor(private db: Database) {}

  async findActive(userId: string) {
    const rows = await this.db
      .select()
      .from(userAiConfigs)
      .where(
        and(eq(userAiConfigs.userId, userId), eq(userAiConfigs.isActive, true))
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async findByUserAndProvider(userId: string, provider: AiProvider) {
    const rows = await this.db
      .select()
      .from(userAiConfigs)
      .where(
        and(
          eq(userAiConfigs.userId, userId),
          eq(userAiConfigs.provider, provider)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async listByUser(userId: string) {
    return this.db
      .select()
      .from(userAiConfigs)
      .where(eq(userAiConfigs.userId, userId));
  }

  async upsert(data: {
    userId: string;
    provider: AiProvider;
    apiKeyEncrypted: string;
    modelName?: string;
  }) {
    const existing = await this.findByUserAndProvider(data.userId, data.provider);
    if (existing) {
      const [updated] = await this.db
        .update(userAiConfigs)
        .set({
          apiKeyEncrypted: data.apiKeyEncrypted,
          modelName: data.modelName ?? null,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(userAiConfigs.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await this.db
      .insert(userAiConfigs)
      .values({
        userId: data.userId,
        provider: data.provider,
        apiKeyEncrypted: data.apiKeyEncrypted,
        modelName: data.modelName ?? null,
        isActive: true,
      })
      .returning();
    return created;
  }

  async deactivateAll(userId: string) {
    await this.db
      .update(userAiConfigs)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(userAiConfigs.userId, userId));
  }

  async deleteByUserAndProvider(userId: string, provider: AiProvider) {
    const rows = await this.db
      .delete(userAiConfigs)
      .where(
        and(
          eq(userAiConfigs.userId, userId),
          eq(userAiConfigs.provider, provider)
        )
      )
      .returning();
    return rows[0] ?? null;
  }
}
