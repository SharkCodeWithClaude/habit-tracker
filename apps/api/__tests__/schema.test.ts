import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { execSync } from "node:child_process";
import * as schema from "../src/db/schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://habit:habit_dev@localhost:5432/habit_tracker";

let client: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle>;
let pgAvailable = false;

beforeAll(async () => {
  try {
    client = postgres(DATABASE_URL, { connect_timeout: 3 });
    db = drizzle(client, { schema });
    await db.execute(sql`SELECT 1`);
    pgAvailable = true;
  } catch {
    console.warn("⚠ Postgres not available — schema integration tests will be skipped");
    return;
  }

  await db.execute(sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  execSync("npx drizzle-kit push --force", {
    cwd: new URL("..", import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL },
    stdio: "pipe",
  });
});

afterAll(async () => {
  if (pgAvailable) {
    await client.end();
  }
});

function skipIfNoPg() {
  if (!pgAvailable) {
    return true;
  }
  return false;
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    )`
  );
  return result[0].exists === true;
}

describe("schema tables exist", () => {
  const expectedTables = [
    "users",
    "habits",
    "habit_aliases",
    "habit_logs",
    "conversations",
    "messages",
    "weekly_reviews",
    "user_ai_configs",
    "refresh_tokens",
  ];

  for (const table of expectedTables) {
    it(`table "${table}" exists`, async () => {
      if (skipIfNoPg()) return;
      expect(await tableExists(table)).toBe(true);
    });
  }
});

describe("basic INSERT/SELECT", () => {
  it("inserts and selects a user", async () => {
    if (skipIfNoPg()) return;
    const [user] = await db
      .insert(schema.users)
      .values({
        email: "test@example.com",
        passwordHash: "hash123",
        displayName: "Test User",
      })
      .returning();

    expect(user.id).toBeDefined();
    expect(user.email).toBe("test@example.com");
    expect(user.displayName).toBe("Test User");
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it("inserts a habit linked to user", async () => {
    if (skipIfNoPg()) return;
    const [user] = await db
      .insert(schema.users)
      .values({ email: "habit-user@test.com", passwordHash: "hash" })
      .returning();

    const [habit] = await db
      .insert(schema.habits)
      .values({
        userId: user.id,
        name: "Meditate",
        emoji: "🧘",
        kind: "binary",
      })
      .returning();

    expect(habit.id).toBeDefined();
    expect(habit.userId).toBe(user.id);
    expect(habit.name).toBe("Meditate");
    expect(habit.kind).toBe("binary");
    expect(habit.sortOrder).toBe(0);
    expect(habit.archivedAt).toBeNull();
  });

  it("inserts habit aliases", async () => {
    if (skipIfNoPg()) return;
    const [user] = await db
      .insert(schema.users)
      .values({ email: "alias-user@test.com", passwordHash: "hash" })
      .returning();

    const [habit] = await db
      .insert(schema.habits)
      .values({ userId: user.id, name: "Running" })
      .returning();

    const [alias] = await db
      .insert(schema.habitAliases)
      .values({ habitId: habit.id, alias: "ran" })
      .returning();

    expect(alias.habitId).toBe(habit.id);
    expect(alias.alias).toBe("ran");
  });

  it("inserts habit logs with unique constraint on (habit_id, date)", async () => {
    if (skipIfNoPg()) return;
    const [user] = await db
      .insert(schema.users)
      .values({ email: "log-user@test.com", passwordHash: "hash" })
      .returning();

    const [habit] = await db
      .insert(schema.habits)
      .values({ userId: user.id, name: "Read" })
      .returning();

    const [log] = await db
      .insert(schema.habitLogs)
      .values({ habitId: habit.id, date: "2026-01-15", value: 1 })
      .returning();

    expect(log.habitId).toBe(habit.id);
    expect(log.value).toBe(1);

    await expect(
      db.insert(schema.habitLogs).values({
        habitId: habit.id,
        date: "2026-01-15",
        value: 2,
      })
    ).rejects.toThrow();
  });

  it("inserts conversations and messages", async () => {
    if (skipIfNoPg()) return;
    const [user] = await db
      .insert(schema.users)
      .values({ email: "chat-user@test.com", passwordHash: "hash" })
      .returning();

    const [conv] = await db
      .insert(schema.conversations)
      .values({ userId: user.id, date: "2026-01-15" })
      .returning();

    expect(conv.tokenCount).toBe(0);
    expect(conv.endedAt).toBeNull();

    const [msg] = await db
      .insert(schema.messages)
      .values({
        conversationId: conv.id,
        role: "user",
        content: "Hello",
      })
      .returning();

    expect(msg.role).toBe("user");
    expect(msg.content).toBe("Hello");
  });

  it("inserts weekly reviews with unique (user_id, week_start)", async () => {
    if (skipIfNoPg()) return;
    const [user] = await db
      .insert(schema.users)
      .values({ email: "review-user@test.com", passwordHash: "hash" })
      .returning();

    const [review] = await db
      .insert(schema.weeklyReviews)
      .values({
        userId: user.id,
        weekStart: "2026-01-13",
        reflection: "Great week!",
      })
      .returning();

    expect(review.reflection).toBe("Great week!");

    await expect(
      db.insert(schema.weeklyReviews).values({
        userId: user.id,
        weekStart: "2026-01-13",
        reflection: "Duplicate",
      })
    ).rejects.toThrow();
  });

  it("inserts user AI configs", async () => {
    if (skipIfNoPg()) return;
    const [user] = await db
      .insert(schema.users)
      .values({ email: "ai-user@test.com", passwordHash: "hash" })
      .returning();

    const [config] = await db
      .insert(schema.userAiConfigs)
      .values({
        userId: user.id,
        provider: "claude",
        apiKeyEncrypted: "encrypted-key-data",
        modelName: "claude-sonnet-4-6",
      })
      .returning();

    expect(config.provider).toBe("claude");
    expect(config.isActive).toBe(true);
  });

  it("inserts refresh tokens", async () => {
    if (skipIfNoPg()) return;
    const [user] = await db
      .insert(schema.users)
      .values({ email: "token-user@test.com", passwordHash: "hash" })
      .returning();

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const [token] = await db
      .insert(schema.refreshTokens)
      .values({
        userId: user.id,
        tokenHash: "sha256-hash-value",
        expiresAt,
      })
      .returning();

    expect(token.tokenHash).toBe("sha256-hash-value");
    expect(token.expiresAt).toBeInstanceOf(Date);
  });

  it("CASCADE deletes habits when user is deleted", async () => {
    if (skipIfNoPg()) return;
    const [user] = await db
      .insert(schema.users)
      .values({ email: "cascade-user@test.com", passwordHash: "hash" })
      .returning();

    await db
      .insert(schema.habits)
      .values({ userId: user.id, name: "Will be deleted" });

    await db.delete(schema.users).where(sql`id = ${user.id}`);

    const remaining = await db
      .select()
      .from(schema.habits)
      .where(sql`user_id = ${user.id}`);

    expect(remaining).toHaveLength(0);
  });

  it("CHECK constraint rejects invalid habit kind", async () => {
    if (skipIfNoPg()) return;
    const [user] = await db
      .insert(schema.users)
      .values({ email: "check-user@test.com", passwordHash: "hash" })
      .returning();

    await expect(
      db.insert(schema.habits).values({
        userId: user.id,
        name: "Bad Kind",
        kind: "invalid" as any,
      })
    ).rejects.toThrow();
  });

  it("CHECK constraint rejects invalid message role", async () => {
    if (skipIfNoPg()) return;
    const [user] = await db
      .insert(schema.users)
      .values({ email: "role-user@test.com", passwordHash: "hash" })
      .returning();

    const [conv] = await db
      .insert(schema.conversations)
      .values({ userId: user.id, date: "2026-01-15" })
      .returning();

    await expect(
      db.insert(schema.messages).values({
        conversationId: conv.id,
        role: "system" as any,
        content: "Bad role",
      })
    ).rejects.toThrow();
  });
});
