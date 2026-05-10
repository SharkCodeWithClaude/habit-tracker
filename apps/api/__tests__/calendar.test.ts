import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { execSync } from "node:child_process";
import { createApp } from "../src/app.js";
import * as schema from "../src/db/schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://habit:habit_dev@localhost:5432/habit_tracker";

let client: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle<typeof schema>>;
let app: ReturnType<typeof createApp>;
let pgAvailable = false;
let accessToken: string;

beforeAll(async () => {
  try {
    client = postgres(DATABASE_URL, { connect_timeout: 3 });
    db = drizzle(client, { schema });
    await db.execute(sql`SELECT 1`);
    pgAvailable = true;
  } catch {
    console.warn(
      "⚠ Postgres not available — calendar integration tests will be skipped"
    );
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

  app = createApp(db);
});

beforeEach(async () => {
  if (!pgAvailable) return;
  await db.delete(schema.habitLogs);
  await db.delete(schema.habitAliases);
  await db.delete(schema.habits);
  await db.delete(schema.refreshTokens);
  await db.delete(schema.users);

  const res = await app.request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "cal@example.com",
      password: "password123",
    }),
  });
  const body = (await res.json()) as any;
  accessToken = body.accessToken;
});

afterAll(async () => {
  if (pgAvailable) {
    await client.end();
  }
});

function skip() {
  return !pgAvailable;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

async function createHabit(data: Record<string, unknown> = {}) {
  const res = await app.request("/api/habits", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name: "Meditate", emoji: "🧘", ...data }),
  });
  return { res, body: (await res.json()) as any };
}

async function toggleOn(habitId: string, date: string) {
  await app.request(`/api/habits/${habitId}/toggle`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ date }),
  });
}

describe("GET /api/habits/calendar", () => {
  it("returns empty days for a month with no logs", async () => {
    if (skip()) return;

    await createHabit({ name: "Run" });

    const res = await app.request("/api/habits/calendar?month=2026-05", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.days).toHaveLength(31);
    expect(body.days[0].date).toBe("2026-05-01");
    expect(body.days[0].completions).toEqual([]);
    expect(body.days[30].date).toBe("2026-05-31");
  });

  it("returns completions for days with logs", async () => {
    if (skip()) return;

    const { body: h1 } = await createHabit({ name: "Run", emoji: "🏃" });
    const { body: h2 } = await createHabit({ name: "Read", emoji: "📚" });

    await toggleOn(h1.habit.id, "2026-05-10");
    await toggleOn(h2.habit.id, "2026-05-10");
    await toggleOn(h1.habit.id, "2026-05-15");

    const res = await app.request("/api/habits/calendar?month=2026-05", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;

    const day10 = body.days.find((d: any) => d.date === "2026-05-10");
    expect(day10.completions).toHaveLength(2);
    expect(day10.completions.map((c: any) => c.habitId).sort()).toEqual(
      [h1.habit.id, h2.habit.id].sort()
    );

    const day15 = body.days.find((d: any) => d.date === "2026-05-15");
    expect(day15.completions).toHaveLength(1);
    expect(day15.completions[0].habitId).toBe(h1.habit.id);
    expect(day15.completions[0].value).toBe(1);
  });

  it("handles February correctly (28 days in non-leap year)", async () => {
    if (skip()) return;

    const res = await app.request("/api/habits/calendar?month=2027-02", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.days).toHaveLength(28);
    expect(body.days[27].date).toBe("2027-02-28");
  });

  it("rejects invalid month format", async () => {
    if (skip()) return;

    const res = await app.request("/api/habits/calendar?month=2026-5", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(400);
  });

  it("rejects missing month param", async () => {
    if (skip()) return;

    const res = await app.request("/api/habits/calendar", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(400);
  });

  it("requires auth", async () => {
    if (skip()) return;

    const res = await app.request("/api/habits/calendar?month=2026-05");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/habits/heatmap", () => {
  it("returns heatmap data for active habits", async () => {
    if (skip()) return;

    const { body: h1 } = await createHabit({ name: "Run", emoji: "🏃" });
    await toggleOn(h1.habit.id, "2026-05-10");
    await toggleOn(h1.habit.id, "2026-05-09");

    const res = await app.request("/api/habits/heatmap?weeks=18", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.heatmap).toHaveLength(1);
    expect(body.heatmap[0].habitId).toBe(h1.habit.id);
    expect(body.heatmap[0].habitName).toBe("Run");
    expect(body.heatmap[0].habitEmoji).toBe("🏃");
    expect(body.heatmap[0].days).toHaveLength(2);
  });

  it("defaults to 18 weeks when no param provided", async () => {
    if (skip()) return;

    const { body: h1 } = await createHabit({ name: "Run" });
    await toggleOn(h1.habit.id, "2026-05-10");

    const res = await app.request("/api/habits/heatmap", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.heatmap).toHaveLength(1);
    expect(body.heatmap[0].days).toHaveLength(1);
  });

  it("excludes logs outside the date range", async () => {
    if (skip()) return;

    const { body: h1 } = await createHabit({ name: "Run" });
    await toggleOn(h1.habit.id, "2025-01-01");

    const res = await app.request("/api/habits/heatmap?weeks=1", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.heatmap[0].days).toHaveLength(0);
  });

  it("excludes archived habits", async () => {
    if (skip()) return;

    const { body: h1 } = await createHabit({ name: "Old" });
    await toggleOn(h1.habit.id, "2026-05-10");

    await app.request(`/api/habits/${h1.habit.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    const res = await app.request("/api/habits/heatmap?weeks=18", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.heatmap).toHaveLength(0);
  });

  it("rejects weeks > 52", async () => {
    if (skip()) return;

    const res = await app.request("/api/habits/heatmap?weeks=53", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(400);
  });

  it("requires auth", async () => {
    if (skip()) return;

    const res = await app.request("/api/habits/heatmap?weeks=18");
    expect(res.status).toBe(401);
  });
});
