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
      "⚠ Postgres not available — habits integration tests will be skipped"
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
      email: "habits@example.com",
      password: "password123",
    }),
  });
  const body = await res.json() as any;
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
  return { res, body: await res.json() as any };
}

describe("POST /api/habits", () => {
  it("creates a habit and returns it", async () => {
    if (skip()) return;

    const { res, body } = await createHabit({ name: "Run", emoji: "🏃", kind: "binary" });

    expect(res.status).toBe(201);
    expect(body.habit.name).toBe("Run");
    expect(body.habit.emoji).toBe("🏃");
    expect(body.habit.kind).toBe("binary");
    expect(body.habit.id).toBeDefined();
    expect(body.habit.sortOrder).toBe(0);
    expect(body.habit.archivedAt).toBeNull();
  });

  it("creates a habit with aliases", async () => {
    if (skip()) return;

    const { res, body } = await createHabit({
      name: "Workout",
      aliases: ["ran", "running", "jog"],
    });

    expect(res.status).toBe(201);
    expect(body.habit.aliases).toEqual(expect.arrayContaining(["ran", "running", "jog"]));
    expect(body.habit.aliases).toHaveLength(3);
  });

  it("rejects missing name", async () => {
    if (skip()) return;

    const res = await app.request("/api/habits", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ emoji: "🏃" }),
    });

    expect(res.status).toBe(400);
  });

  it("rejects invalid kind", async () => {
    if (skip()) return;

    const res = await app.request("/api/habits", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: "Water", kind: "invalid" }),
    });

    expect(res.status).toBe(400);
  });

  it("requires auth", async () => {
    if (skip()) return;

    const res = await app.request("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Run" }),
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/habits", () => {
  it("lists active habits sorted by sort_order", async () => {
    if (skip()) return;

    await createHabit({ name: "Read", sortOrder: 2 });
    await createHabit({ name: "Meditate", sortOrder: 0 });
    await createHabit({ name: "Run", sortOrder: 1 });

    const res = await app.request("/api/habits", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.habits).toHaveLength(3);
    expect(body.habits[0].name).toBe("Meditate");
    expect(body.habits[1].name).toBe("Run");
    expect(body.habits[2].name).toBe("Read");
  });

  it("excludes archived habits", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Old habit" });

    await app.request(`/api/habits/${created.habit.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    const res = await app.request("/api/habits", {
      headers: authHeaders(),
    });

    const body = await res.json() as any;
    expect(body.habits).toHaveLength(0);
  });

  it("requires auth", async () => {
    if (skip()) return;

    const res = await app.request("/api/habits");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/habits/:id", () => {
  it("updates habit name and emoji", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Run" });

    const res = await app.request(`/api/habits/${created.habit.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ name: "Jogging", emoji: "🏃‍♂️" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.habit.name).toBe("Jogging");
    expect(body.habit.emoji).toBe("🏃‍♂️");
  });

  it("updates sort_order", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Run" });

    const res = await app.request(`/api/habits/${created.habit.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ sortOrder: 5 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.habit.sortOrder).toBe(5);
  });

  it("returns 404 for non-existent habit", async () => {
    if (skip()) return;

    const res = await app.request(
      `/api/habits/00000000-0000-0000-0000-000000000000`,
      {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ name: "New Name" }),
      }
    );

    expect(res.status).toBe(404);
  });

  it("rejects empty body", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Run" });

    const res = await app.request(`/api/habits/${created.habit.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/habits/:id", () => {
  it("soft-deletes via archived_at", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Old" });

    const res = await app.request(`/api/habits/${created.habit.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.habit.archivedAt).toBeTruthy();

    const rows = await db
      .select()
      .from(schema.habits)
      .where(sql`id = ${created.habit.id}`);
    expect(rows[0].archivedAt).toBeTruthy();
  });

  it("returns 404 for non-existent habit", async () => {
    if (skip()) return;

    const res = await app.request(
      `/api/habits/00000000-0000-0000-0000-000000000000`,
      {
        method: "DELETE",
        headers: authHeaders(),
      }
    );

    expect(res.status).toBe(404);
  });
});

describe("POST /api/habits/:id/toggle", () => {
  it("toggles on: creates log for binary habit", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Run", kind: "binary" });

    const res = await app.request(`/api/habits/${created.habit.id}/toggle`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ date: "2026-05-10" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.toggled).toBe(true);

    const logs = await db
      .select()
      .from(schema.habitLogs)
      .where(sql`habit_id = ${created.habit.id}`);
    expect(logs).toHaveLength(1);
    expect(logs[0].value).toBe(1);
  });

  it("toggles off: removes log for binary habit", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Run", kind: "binary" });

    await app.request(`/api/habits/${created.habit.id}/toggle`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ date: "2026-05-10" }),
    });

    const res = await app.request(`/api/habits/${created.habit.id}/toggle`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ date: "2026-05-10" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.toggled).toBe(false);

    const logs = await db
      .select()
      .from(schema.habitLogs)
      .where(sql`habit_id = ${created.habit.id}`);
    expect(logs).toHaveLength(0);
  });

  it("rejects invalid date format", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Run" });

    const res = await app.request(`/api/habits/${created.habit.id}/toggle`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ date: "not-a-date" }),
    });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/habits/:id/sessions", () => {
  it("sets session count for a date", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Water", kind: "session" });

    const res = await app.request(`/api/habits/${created.habit.id}/sessions`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ date: "2026-05-10", value: 3 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.log.value).toBe(3);
  });

  it("updates existing session count", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Water", kind: "session" });

    await app.request(`/api/habits/${created.habit.id}/sessions`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ date: "2026-05-10", value: 3 }),
    });

    const res = await app.request(`/api/habits/${created.habit.id}/sessions`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ date: "2026-05-10", value: 5 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.log.value).toBe(5);

    const logs = await db
      .select()
      .from(schema.habitLogs)
      .where(sql`habit_id = ${created.habit.id}`);
    expect(logs).toHaveLength(1);
  });

  it("removes log when value is 0", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Water", kind: "session" });

    await app.request(`/api/habits/${created.habit.id}/sessions`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ date: "2026-05-10", value: 3 }),
    });

    const res = await app.request(`/api/habits/${created.habit.id}/sessions`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ date: "2026-05-10", value: 0 }),
    });

    expect(res.status).toBe(200);

    const logs = await db
      .select()
      .from(schema.habitLogs)
      .where(sql`habit_id = ${created.habit.id}`);
    expect(logs).toHaveLength(0);
  });
});

describe("GET /api/habits/streaks", () => {
  it("returns current streak per habit", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Run" });

    for (const date of ["2026-05-08", "2026-05-09", "2026-05-10"]) {
      await app.request(`/api/habits/${created.habit.id}/toggle`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ date }),
      });
    }

    const res = await app.request("/api/habits/streaks", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.streaks).toHaveLength(1);
    expect(body.streaks[0].habitId).toBe(created.habit.id);
    expect(body.streaks[0].currentStreak).toBe(3);
  });

  it("breaks streak on gap", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "Run" });

    for (const date of ["2026-05-07", "2026-05-09", "2026-05-10"]) {
      await app.request(`/api/habits/${created.habit.id}/toggle`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ date }),
      });
    }

    const res = await app.request("/api/habits/streaks", {
      headers: authHeaders(),
    });

    const body = await res.json() as any;
    expect(body.streaks[0].currentStreak).toBe(2);
  });

  it("returns 0 for habit with no logs", async () => {
    if (skip()) return;

    await createHabit({ name: "Run" });

    const res = await app.request("/api/habits/streaks", {
      headers: authHeaders(),
    });

    const body = await res.json() as any;
    expect(body.streaks).toHaveLength(1);
    expect(body.streaks[0].currentStreak).toBe(0);
  });
});

describe("ownership isolation", () => {
  it("cannot access another user's habit", async () => {
    if (skip()) return;

    const { body: created } = await createHabit({ name: "My Habit" });

    const otherRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "other@example.com",
        password: "password123",
      }),
    });
    const otherBody = await otherRes.json() as any;
    const otherToken = otherBody.accessToken;

    const res = await app.request(`/api/habits/${created.habit.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${otherToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Stolen" }),
    });

    expect(res.status).toBe(404);
  });
});

describe("full habit lifecycle", () => {
  it("create → list → toggle → streak → archive → list excludes archived", async () => {
    if (skip()) return;

    // 1. Create
    const { body: created } = await createHabit({
      name: "Daily Run",
      emoji: "🏃",
      aliases: ["ran", "running"],
    });
    expect(created.habit.id).toBeDefined();
    const habitId = created.habit.id;

    // 2. List
    let listRes = await app.request("/api/habits", { headers: authHeaders() });
    let listBody = await listRes.json() as any;
    expect(listBody.habits).toHaveLength(1);
    expect(listBody.habits[0].aliases).toEqual(expect.arrayContaining(["ran", "running"]));

    // 3. Toggle on three consecutive days
    for (const date of ["2026-05-08", "2026-05-09", "2026-05-10"]) {
      await app.request(`/api/habits/${habitId}/toggle`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ date }),
      });
    }

    // 4. Streak
    const streakRes = await app.request("/api/habits/streaks", {
      headers: authHeaders(),
    });
    const streakBody = await streakRes.json() as any;
    expect(streakBody.streaks[0].currentStreak).toBe(3);

    // 5. Archive
    const archiveRes = await app.request(`/api/habits/${habitId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    expect(archiveRes.status).toBe(200);

    // 6. List excludes archived
    listRes = await app.request("/api/habits", { headers: authHeaders() });
    listBody = await listRes.json() as any;
    expect(listBody.habits).toHaveLength(0);
  });
});
