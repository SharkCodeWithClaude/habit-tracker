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
      "⚠ Postgres not available — conversations integration tests will be skipped"
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
  await db.delete(schema.messages);
  await db.delete(schema.conversations);
  await db.delete(schema.habitLogs);
  await db.delete(schema.habitAliases);
  await db.delete(schema.habits);
  await db.delete(schema.refreshTokens);
  await db.delete(schema.users);

  const res = await app.request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "conv@example.com",
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

async function createConversation(date = "2026-05-10") {
  const res = await app.request("/api/conversations", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ date }),
  });
  return { res, body: (await res.json()) as any };
}

// --- POST /api/conversations ---

describe("POST /api/conversations", () => {
  it("creates a new conversation", async () => {
    if (skip()) return;

    const { res, body } = await createConversation("2026-05-10");

    expect(res.status).toBe(201);
    expect(body.conversation.id).toBeDefined();
    expect(body.conversation.date).toBe("2026-05-10");
    expect(body.conversation.endedAt).toBeNull();
    expect(body.conversation.tokenCount).toBe(0);
  });

  it("wraps existing active session when creating new", async () => {
    if (skip()) return;

    const { body: first } = await createConversation("2026-05-10");
    const firstId = first.conversation.id;

    const { res, body: second } = await createConversation("2026-05-10");
    expect(res.status).toBe(201);
    expect(second.conversation.id).not.toBe(firstId);

    const rows = await db
      .select()
      .from(schema.conversations)
      .where(sql`id = ${firstId}`);
    expect(rows[0].endedAt).toBeTruthy();
  });

  it("rejects invalid date format", async () => {
    if (skip()) return;

    const res = await app.request("/api/conversations", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ date: "not-a-date" }),
    });

    expect(res.status).toBe(400);
  });

  it("requires auth", async () => {
    if (skip()) return;

    const res = await app.request("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2026-05-10" }),
    });

    expect(res.status).toBe(401);
  });
});

// --- GET /api/conversations/active ---

describe("GET /api/conversations/active", () => {
  it("returns the active conversation", async () => {
    if (skip()) return;

    const { body: created } = await createConversation("2026-05-10");

    const res = await app.request("/api/conversations/active", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.conversation.id).toBe(created.conversation.id);
    expect(body.conversation.endedAt).toBeNull();
  });

  it("returns 404 when no active conversation", async () => {
    if (skip()) return;

    const res = await app.request("/api/conversations/active", {
      headers: authHeaders(),
    });

    expect(res.status).toBe(404);
  });

  it("requires auth", async () => {
    if (skip()) return;

    const res = await app.request("/api/conversations/active");
    expect(res.status).toBe(401);
  });
});

// --- GET /api/conversations/:id/messages ---

describe("GET /api/conversations/:id/messages", () => {
  it("returns messages in chronological order", async () => {
    if (skip()) return;

    const { body: created } = await createConversation();
    const convId = created.conversation.id;

    await app.request(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content: "Hello", role: "user" }),
    });
    await app.request(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content: "Hi there!", role: "assistant" }),
    });

    const res = await app.request(`/api/conversations/${convId}/messages`, {
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toBe("Hello");
    expect(body.messages[1].role).toBe("assistant");
    expect(body.messages[1].content).toBe("Hi there!");
  });

  it("returns empty array for conversation with no messages", async () => {
    if (skip()) return;

    const { body: created } = await createConversation();

    const res = await app.request(
      `/api/conversations/${created.conversation.id}/messages`,
      { headers: authHeaders() }
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.messages).toHaveLength(0);
  });

  it("returns 404 for non-existent conversation", async () => {
    if (skip()) return;

    const res = await app.request(
      `/api/conversations/00000000-0000-0000-0000-000000000000/messages`,
      { headers: authHeaders() }
    );

    expect(res.status).toBe(404);
  });
});

// --- POST /api/conversations/:id/messages ---

describe("POST /api/conversations/:id/messages", () => {
  it("appends a user message and returns conversation state", async () => {
    if (skip()) return;

    const { body: created } = await createConversation();
    const convId = created.conversation.id;

    const res = await app.request(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content: "I ran 5 miles today" }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.message.role).toBe("user");
    expect(body.message.content).toBe("I ran 5 miles today");
    expect(body.conversation.id).toBe(convId);
  });

  it("updates token_count when provided", async () => {
    if (skip()) return;

    const { body: created } = await createConversation();
    const convId = created.conversation.id;

    const res = await app.request(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        content: "Hello",
        role: "assistant",
        tokenCount: 150,
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.conversation.tokenCount).toBe(150);
  });

  it("accumulates token_count across messages", async () => {
    if (skip()) return;

    const { body: created } = await createConversation();
    const convId = created.conversation.id;

    await app.request(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content: "msg1", tokenCount: 100 }),
    });

    const res = await app.request(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content: "msg2", tokenCount: 200 }),
    });

    const body = (await res.json()) as any;
    expect(body.conversation.tokenCount).toBe(300);
  });

  it("rejects message to a wrapped conversation", async () => {
    if (skip()) return;

    const { body: created } = await createConversation();
    const convId = created.conversation.id;

    await app.request(`/api/conversations/${convId}/wrap`, {
      method: "POST",
      headers: authHeaders(),
    });

    const res = await app.request(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content: "too late" }),
    });

    expect(res.status).toBe(400);
  });

  it("rejects empty content", async () => {
    if (skip()) return;

    const { body: created } = await createConversation();

    const res = await app.request(
      `/api/conversations/${created.conversation.id}/messages`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "" }),
      }
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent conversation", async () => {
    if (skip()) return;

    const res = await app.request(
      `/api/conversations/00000000-0000-0000-0000-000000000000/messages`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "hello" }),
      }
    );

    expect(res.status).toBe(404);
  });
});

// --- POST /api/conversations/:id/wrap ---

describe("POST /api/conversations/:id/wrap", () => {
  it("wraps an active conversation", async () => {
    if (skip()) return;

    const { body: created } = await createConversation();
    const convId = created.conversation.id;

    const res = await app.request(`/api/conversations/${convId}/wrap`, {
      method: "POST",
      headers: authHeaders(),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.conversation.endedAt).toBeTruthy();
    expect(body.conversation.id).toBe(convId);
  });

  it("rejects wrapping an already-wrapped conversation", async () => {
    if (skip()) return;

    const { body: created } = await createConversation();
    const convId = created.conversation.id;

    await app.request(`/api/conversations/${convId}/wrap`, {
      method: "POST",
      headers: authHeaders(),
    });

    const res = await app.request(`/api/conversations/${convId}/wrap`, {
      method: "POST",
      headers: authHeaders(),
    });

    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent conversation", async () => {
    if (skip()) return;

    const res = await app.request(
      `/api/conversations/00000000-0000-0000-0000-000000000000/wrap`,
      {
        method: "POST",
        headers: authHeaders(),
      }
    );

    expect(res.status).toBe(404);
  });
});

// --- Auto-wrap on token budget ---

describe("auto-wrap on token budget", () => {
  it("auto-wraps when token_count exceeds threshold", async () => {
    if (skip()) return;

    const { body: created } = await createConversation();
    const convId = created.conversation.id;

    const res = await app.request(`/api/conversations/${convId}/messages`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ content: "big response", tokenCount: 5000 }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.conversation.endedAt).toBeTruthy();

    const activeRes = await app.request("/api/conversations/active", {
      headers: authHeaders(),
    });
    expect(activeRes.status).toBe(404);
  });
});

// --- Only one active session per user ---

describe("session uniqueness", () => {
  it("only one active session per user at a time", async () => {
    if (skip()) return;

    await createConversation("2026-05-08");
    await createConversation("2026-05-09");
    await createConversation("2026-05-10");

    const rows = await db
      .select()
      .from(schema.conversations)
      .where(sql`user_id = ${userId}`);

    const active = rows.filter((r) => r.endedAt === null);
    const wrapped = rows.filter((r) => r.endedAt !== null);

    expect(active).toHaveLength(1);
    expect(wrapped).toHaveLength(2);
    expect(active[0].date).toBe("2026-05-10");
  });
});

// --- Ownership isolation ---

describe("ownership isolation", () => {
  it("cannot access another user's conversation", async () => {
    if (skip()) return;

    const { body: created } = await createConversation();

    const otherRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "other@example.com",
        password: "password123",
      }),
    });
    const otherBody = (await otherRes.json()) as any;
    const otherToken = otherBody.accessToken;

    const res = await app.request(
      `/api/conversations/${created.conversation.id}/messages`,
      {
        headers: {
          Authorization: `Bearer ${otherToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    expect(res.status).toBe(404);
  });
});

// --- Full lifecycle ---

describe("full conversation lifecycle", () => {
  it("create → send messages → wrap → create new → verify old is wrapped", async () => {
    if (skip()) return;

    // 1. Create first conversation
    const { body: first } = await createConversation("2026-05-10");
    const firstId = first.conversation.id;
    expect(firstId).toBeDefined();

    // 2. Send user message
    const msgRes1 = await app.request(
      `/api/conversations/${firstId}/messages`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ content: "I ran today" }),
      }
    );
    expect(msgRes1.status).toBe(201);

    // 3. Send assistant response with token count
    const msgRes2 = await app.request(
      `/api/conversations/${firstId}/messages`,
      {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          content: "Great job! Did you track your distance?",
          role: "assistant",
          tokenCount: 250,
        }),
      }
    );
    expect(msgRes2.status).toBe(201);
    const msg2Body = (await msgRes2.json()) as any;
    expect(msg2Body.conversation.tokenCount).toBe(250);

    // 4. Verify messages in order
    const listRes = await app.request(
      `/api/conversations/${firstId}/messages`,
      { headers: authHeaders() }
    );
    const listBody = (await listRes.json()) as any;
    expect(listBody.messages).toHaveLength(2);
    expect(listBody.messages[0].role).toBe("user");
    expect(listBody.messages[1].role).toBe("assistant");

    // 5. Wrap the session
    const wrapRes = await app.request(
      `/api/conversations/${firstId}/wrap`,
      {
        method: "POST",
        headers: authHeaders(),
      }
    );
    expect(wrapRes.status).toBe(200);
    const wrapBody = (await wrapRes.json()) as any;
    expect(wrapBody.conversation.endedAt).toBeTruthy();

    // 6. Create a new conversation
    const { body: second } = await createConversation("2026-05-11");
    expect(second.conversation.id).not.toBe(firstId);
    expect(second.conversation.date).toBe("2026-05-11");

    // 7. Verify old conversation is still wrapped
    const rows = await db
      .select()
      .from(schema.conversations)
      .where(sql`id = ${firstId}`);
    expect(rows[0].endedAt).toBeTruthy();

    // 8. Verify new is active
    const activeRes = await app.request("/api/conversations/active", {
      headers: authHeaders(),
    });
    const activeBody = (await activeRes.json()) as any;
    expect(activeBody.conversation.id).toBe(second.conversation.id);
  });
});
