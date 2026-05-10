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
let userId: string;

beforeAll(async () => {
  try {
    client = postgres(DATABASE_URL, { connect_timeout: 3 });
    db = drizzle(client, { schema });
    await db.execute(sql`SELECT 1`);
    pgAvailable = true;
  } catch {
    console.warn(
      "⚠ Postgres not available — reviews integration tests will be skipped"
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
  await db.delete(schema.weeklyReviews);
  await db.delete(schema.habitLogs);
  await db.delete(schema.habitAliases);
  await db.delete(schema.habits);
  await db.delete(schema.refreshTokens);
  await db.delete(schema.users);

  const res = await app.request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "review@example.com",
      password: "password123",
    }),
  });
  const body = (await res.json()) as any;
  accessToken = body.accessToken;
  userId = body.user.id;
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
  return (await res.json()) as any;
}

async function toggleHabit(habitId: string, date: string) {
  await app.request(`/api/habits/${habitId}/toggle`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ date }),
  });
}

describe("GET /api/reviews/weekly", () => {
  it("returns stats for a week with no logs", async () => {
    if (skip()) return;

    await createHabit({ name: "Run", emoji: "🏃" });
    await createHabit({ name: "Read", emoji: "📖" });

    const res = await app.request("/api/reviews/weekly?week=2026-05-04", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.weekStart).toBe("2026-05-04");
    expect(body.overallCompletionPercent).toBe(0);
    expect(body.habits).toHaveLength(2);
    expect(body.habits[0].completedDays).toBe(0);
    expect(body.habits[0].totalDays).toBe(7);
    expect(body.reflection).toBe("");
  });

  it("computes per-habit and overall completion correctly", async () => {
    if (skip()) return;

    const { habit: run } = await createHabit({ name: "Run", emoji: "🏃" });
    const { habit: read } = await createHabit({ name: "Read", emoji: "📖" });

    // Week of 2026-05-04 (Mon) to 2026-05-10 (Sun)
    // Run: completed 5/7 days
    for (const date of ["2026-05-04", "2026-05-05", "2026-05-06", "2026-05-07", "2026-05-08"]) {
      await toggleHabit(run.id, date);
    }
    // Read: completed 3/7 days
    for (const date of ["2026-05-04", "2026-05-06", "2026-05-08"]) {
      await toggleHabit(read.id, date);
    }

    const res = await app.request("/api/reviews/weekly?week=2026-05-04", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.weekStart).toBe("2026-05-04");

    const runStat = body.habits.find((h: any) => h.habitId === run.id);
    const readStat = body.habits.find((h: any) => h.habitId === read.id);

    expect(runStat.completedDays).toBe(5);
    expect(runStat.completionPercent).toBe(71);
    expect(readStat.completedDays).toBe(3);
    expect(readStat.completionPercent).toBe(43);

    // Overall: (5+3) / (7+7) = 8/14 = 57%
    expect(body.overallCompletionPercent).toBe(57);

    // Best = Run (71%), Worst = Read (43%)
    expect(body.best.habitId).toBe(run.id);
    expect(body.worst.habitId).toBe(read.id);
  });

  it("normalizes any date in the week to that week's Monday", async () => {
    if (skip()) return;

    await createHabit({ name: "Run", emoji: "🏃" });

    // Pass a Wednesday (2026-05-07) — should resolve to Monday 2026-05-04
    const res = await app.request("/api/reviews/weekly?week=2026-05-07", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.weekStart).toBe("2026-05-04");
  });

  it("rejects missing week parameter", async () => {
    if (skip()) return;

    const res = await app.request("/api/reviews/weekly", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(400);
  });

  it("rejects invalid date format", async () => {
    if (skip()) return;

    const res = await app.request("/api/reviews/weekly?week=not-a-date", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(400);
  });

  it("requires auth", async () => {
    if (skip()) return;

    const res = await app.request("/api/reviews/weekly?week=2026-05-04");
    expect(res.status).toBe(401);
  });

  it("returns empty habits array when user has no habits", async () => {
    if (skip()) return;

    const res = await app.request("/api/reviews/weekly?week=2026-05-04", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.habits).toHaveLength(0);
    expect(body.overallCompletionPercent).toBe(0);
    expect(body.best).toBeNull();
    expect(body.worst).toBeNull();
  });
});

describe("PUT /api/reviews/weekly", () => {
  it("creates a new reflection", async () => {
    if (skip()) return;

    const res = await app.request("/api/reviews/weekly", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        week: "2026-05-04",
        reflection: "Great week overall!",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.weekStart).toBe("2026-05-04");
    expect(body.reflection).toBe("Great week overall!");
  });

  it("updates existing reflection (upsert)", async () => {
    if (skip()) return;

    await app.request("/api/reviews/weekly", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        week: "2026-05-04",
        reflection: "First version",
      }),
    });

    const res = await app.request("/api/reviews/weekly", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        week: "2026-05-04",
        reflection: "Updated reflection",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.reflection).toBe("Updated reflection");

    // Verify only one row exists
    const rows = await db
      .select()
      .from(schema.weeklyReviews)
      .where(sql`user_id = ${userId}`);
    expect(rows).toHaveLength(1);
  });

  it("persists reflection visible in GET stats", async () => {
    if (skip()) return;

    await app.request("/api/reviews/weekly", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        week: "2026-05-04",
        reflection: "Reflected deeply",
      }),
    });

    const res = await app.request("/api/reviews/weekly?week=2026-05-04", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.reflection).toBe("Reflected deeply");
  });

  it("normalizes week date to Monday", async () => {
    if (skip()) return;

    // Send Thursday 2026-05-08, should store as Monday 2026-05-04
    const res = await app.request("/api/reviews/weekly", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        week: "2026-05-08",
        reflection: "Thursday input",
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.weekStart).toBe("2026-05-04");
  });

  it("rejects missing fields", async () => {
    if (skip()) return;

    const res = await app.request("/api/reviews/weekly", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ week: "2026-05-04" }),
    });

    expect(res.status).toBe(400);
  });

  it("requires auth", async () => {
    if (skip()) return;

    const res = await app.request("/api/reviews/weekly", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        week: "2026-05-04",
        reflection: "No auth",
      }),
    });

    expect(res.status).toBe(401);
  });
});

describe("weekly review full lifecycle", () => {
  it("seed logs → verify stats → save reflection → reload → verify persistence", async () => {
    if (skip()) return;

    // Create habits
    const { habit: meditate } = await createHabit({ name: "Meditate", emoji: "🧘" });
    const { habit: exercise } = await createHabit({ name: "Exercise", emoji: "💪" });

    // Seed logs for week 2026-05-04 to 2026-05-10
    // Meditate: every day (7/7)
    for (const date of [
      "2026-05-04", "2026-05-05", "2026-05-06", "2026-05-07",
      "2026-05-08", "2026-05-09", "2026-05-10",
    ]) {
      await toggleHabit(meditate.id, date);
    }
    // Exercise: 4/7 days
    for (const date of ["2026-05-04", "2026-05-06", "2026-05-08", "2026-05-10"]) {
      await toggleHabit(exercise.id, date);
    }

    // Verify stats
    let res = await app.request("/api/reviews/weekly?week=2026-05-04", {
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    let body = (await res.json()) as any;

    expect(body.overallCompletionPercent).toBe(79); // (7+4)/(7+7) = 11/14 = 78.57 → 79%
    const meditateStat = body.habits.find((h: any) => h.habitId === meditate.id);
    const exerciseStat = body.habits.find((h: any) => h.habitId === exercise.id);
    expect(meditateStat.completedDays).toBe(7);
    expect(meditateStat.completionPercent).toBe(100);
    expect(exerciseStat.completedDays).toBe(4);
    expect(exerciseStat.completionPercent).toBe(57);
    expect(body.best.habitId).toBe(meditate.id);
    expect(body.worst.habitId).toBe(exercise.id);

    // Save reflection
    res = await app.request("/api/reviews/weekly", {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({
        week: "2026-05-04",
        reflection: "Best week so far! Meditation streak is solid.",
      }),
    });
    expect(res.status).toBe(200);

    // Reload and verify persistence
    res = await app.request("/api/reviews/weekly?week=2026-05-04", {
      headers: authHeaders(),
    });
    body = (await res.json()) as any;
    expect(body.reflection).toBe("Best week so far! Meditation streak is solid.");
    expect(body.overallCompletionPercent).toBe(79);
  });
});
