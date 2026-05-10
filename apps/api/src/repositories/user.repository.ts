import { eq } from "drizzle-orm";
import { users } from "../db/schema.js";
import type { Database } from "../config/database.js";

export class UserRepository {
  constructor(private db: Database) {}

  async findByEmail(email: string) {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return rows[0] ?? null;
  }

  async findById(id: string) {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(data: { email: string; passwordHash: string; displayName?: string }) {
    const [user] = await this.db
      .insert(users)
      .values(data)
      .returning();
    return user;
  }
}
