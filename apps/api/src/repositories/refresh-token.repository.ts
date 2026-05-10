import { eq, and, gt } from "drizzle-orm";
import { refreshTokens } from "../db/schema.js";
import type { Database } from "../config/database.js";

export class RefreshTokenRepository {
  constructor(private db: Database) {}

  async create(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    const [token] = await this.db
      .insert(refreshTokens)
      .values(data)
      .returning();
    return token;
  }

  async findValidByHash(tokenHash: string) {
    const rows = await this.db
      .select()
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.tokenHash, tokenHash),
          gt(refreshTokens.expiresAt, new Date())
        )
      )
      .limit(1);
    return rows[0] ?? null;
  }

  async deleteByHash(tokenHash: string) {
    await this.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  async deleteByUserId(userId: string) {
    await this.db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, userId));
  }
}
