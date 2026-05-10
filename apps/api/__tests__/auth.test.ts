import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { execSync } from "node:child_process";
import { createApp, authMiddleware } from "../src/app.js";
import { Hono } from "hono";
import type { AuthEnv } from "../src/middleware/auth.middleware.js";
import * as schema from "../src/db/schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://habit:habit_dev@localhost:5432/habit_tracker";

let client: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle<typeof schema>>;
let app: ReturnType<typeof createApp>;
let pgAvailable = false;

interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; displayName: string | null };
}

beforeAll(async () => {
  try {
    client = postgres(DATABASE_URL, { connect_timeout: 3 });
    db = drizzle(client, { schema });
    await db.execute(sql`SELECT 1`);
    pgAvailable = true;
  } catch {
    console.warn(
      "⚠ Postgres not available — auth integration tests will be skipped"
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

  const protectedRouter = new Hono<AuthEnv>();
  protectedRouter.use(authMiddleware);
  protectedRouter.get("/", (c) => {
    return c.json({ userId: c.get("userId") });
  });
  app.route("/api/protected", protectedRouter);
});

beforeEach(async () => {
  if (!pgAvailable) return;
  await db.delete(schema.refreshTokens);
  await db.delete(schema.users);
});

afterAll(async () => {
  if (pgAvailable) {
    await client.end();
  }
});

function skip() {
  return !pgAvailable;
}

function extractCookie(res: Response, name: string): string | null {
  const setCookies = res.headers.getSetCookie();
  for (const cookie of setCookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.split("=")[1].split(";")[0];
    }
  }
  return null;
}

async function json<T = any>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe("POST /api/auth/register", () => {
  it("creates user and returns JWT + refresh token cookie", async () => {
    if (skip()) return;

    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "new@example.com",
        password: "password123",
        displayName: "New User",
      }),
    });

    expect(res.status).toBe(201);
    const body = await json<AuthResponse>(res);
    expect(body.accessToken).toBeDefined();
    expect(body.user.email).toBe("new@example.com");
    expect(body.user.displayName).toBe("New User");
    expect(body.user.id).toBeDefined();
    expect(body.user).not.toHaveProperty("passwordHash");

    const cookie = extractCookie(res, "refresh_token");
    expect(cookie).toBeTruthy();
  });

  it("rejects duplicate email", async () => {
    if (skip()) return;

    await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dup@example.com",
        password: "password123",
      }),
    });

    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "dup@example.com",
        password: "password456",
      }),
    });

    expect(res.status).toBe(409);
    const body = await json(res);
    expect(body.error).toBeDefined();
  });

  it("rejects invalid email format", async () => {
    if (skip()) return;

    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-an-email",
        password: "password123",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("rejects short password", async () => {
    if (skip()) return;

    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "short@example.com",
        password: "abc",
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("validates credentials and returns JWT + refresh token", async () => {
    if (skip()) return;

    await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "login@example.com",
        password: "password123",
      }),
    });

    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "login@example.com",
        password: "password123",
      }),
    });

    expect(res.status).toBe(200);
    const body = await json<AuthResponse>(res);
    expect(body.accessToken).toBeDefined();
    expect(body.user.email).toBe("login@example.com");

    const cookie = extractCookie(res, "refresh_token");
    expect(cookie).toBeTruthy();
  });

  it("rejects wrong password", async () => {
    if (skip()) return;

    await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "wrong@example.com",
        password: "password123",
      }),
    });

    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "wrong@example.com",
        password: "wrongpassword",
      }),
    });

    expect(res.status).toBe(401);
  });

  it("rejects non-existent email", async () => {
    if (skip()) return;

    const res = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nobody@example.com",
        password: "password123",
      }),
    });

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/refresh", () => {
  it("rotates refresh token and returns new JWT", async () => {
    if (skip()) return;

    const registerRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "refresh@example.com",
        password: "password123",
      }),
    });

    const oldCookie = extractCookie(registerRes, "refresh_token")!;

    const res = await app.request("/api/auth/refresh", {
      method: "POST",
      headers: { Cookie: `refresh_token=${oldCookie}` },
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.accessToken).toBeDefined();

    const newCookie = extractCookie(res, "refresh_token")!;
    expect(newCookie).toBeTruthy();
    expect(newCookie).not.toBe(oldCookie);
  });

  it("rejects reuse of old refresh token after rotation", async () => {
    if (skip()) return;

    const registerRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "reuse@example.com",
        password: "password123",
      }),
    });

    const oldCookie = extractCookie(registerRes, "refresh_token")!;

    await app.request("/api/auth/refresh", {
      method: "POST",
      headers: { Cookie: `refresh_token=${oldCookie}` },
    });

    const res = await app.request("/api/auth/refresh", {
      method: "POST",
      headers: { Cookie: `refresh_token=${oldCookie}` },
    });

    expect(res.status).toBe(401);
  });

  it("rejects missing refresh token", async () => {
    if (skip()) return;

    const res = await app.request("/api/auth/refresh", {
      method: "POST",
    });

    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("deletes refresh token and clears cookie", async () => {
    if (skip()) return;

    const registerRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "logout@example.com",
        password: "password123",
      }),
    });

    const cookie = extractCookie(registerRes, "refresh_token")!;

    const res = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: `refresh_token=${cookie}` },
    });

    expect(res.status).toBe(204);

    const refreshRes = await app.request("/api/auth/refresh", {
      method: "POST",
      headers: { Cookie: `refresh_token=${cookie}` },
    });

    expect(refreshRes.status).toBe(401);
  });
});

describe("auth middleware", () => {
  it("allows access with valid JWT", async () => {
    if (skip()) return;

    const registerRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "middleware@example.com",
        password: "password123",
      }),
    });

    const { accessToken, user } = await json<AuthResponse>(registerRes);

    const res = await app.request("/api/protected", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.userId).toBe(user.id);
  });

  it("returns 401 without Authorization header", async () => {
    if (skip()) return;

    const res = await app.request("/api/protected");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid JWT", async () => {
    if (skip()) return;

    const res = await app.request("/api/protected", {
      headers: { Authorization: "Bearer invalid-token" },
    });

    expect(res.status).toBe(401);
  });
});

describe("passwords stored securely", () => {
  it("stores bcrypt hash, never plaintext", async () => {
    if (skip()) return;

    await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "secure@example.com",
        password: "password123",
      }),
    });

    const rows = await db
      .select()
      .from(schema.users)
      .where(sql`email = 'secure@example.com'`);

    expect(rows[0].passwordHash).toMatch(/^\$2[ab]\$/);
    expect(rows[0].passwordHash).not.toBe("password123");
  });
});

describe("refresh tokens stored as SHA-256 hashes", () => {
  it("stores hash, not raw token", async () => {
    if (skip()) return;

    const registerRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "hash@example.com",
        password: "password123",
      }),
    });

    const rawToken = extractCookie(registerRes, "refresh_token")!;
    const rows = await db.select().from(schema.refreshTokens);

    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(rawToken);
    expect(rows[0].tokenHash).toHaveLength(64);
  });
});

describe("full auth flow", () => {
  it("register → login → access protected → refresh → access again → logout", async () => {
    if (skip()) return;

    // 1. Register
    const registerRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "flow@example.com",
        password: "password123",
        displayName: "Flow User",
      }),
    });
    expect(registerRes.status).toBe(201);
    const registerBody = await json<AuthResponse>(registerRes);
    let accessToken = registerBody.accessToken;
    let refreshCookie = extractCookie(registerRes, "refresh_token")!;

    // 2. Login
    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "flow@example.com",
        password: "password123",
      }),
    });
    expect(loginRes.status).toBe(200);
    const loginBody = await json<AuthResponse>(loginRes);
    accessToken = loginBody.accessToken;
    refreshCookie = extractCookie(loginRes, "refresh_token")!;

    // 3. Access protected route
    const protectedRes = await app.request("/api/protected", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(protectedRes.status).toBe(200);
    const protectedBody = await json(protectedRes);
    expect(protectedBody.userId).toBe(loginBody.user.id);

    // 4. Refresh
    const refreshRes = await app.request("/api/auth/refresh", {
      method: "POST",
      headers: { Cookie: `refresh_token=${refreshCookie}` },
    });
    expect(refreshRes.status).toBe(200);
    const refreshBody = await json(refreshRes);
    accessToken = refreshBody.accessToken;
    refreshCookie = extractCookie(refreshRes, "refresh_token")!;

    // 5. Access protected route again with new token
    const protectedRes2 = await app.request("/api/protected", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(protectedRes2.status).toBe(200);

    // 6. Logout
    const logoutRes = await app.request("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: `refresh_token=${refreshCookie}` },
    });
    expect(logoutRes.status).toBe(204);

    // 7. Refresh should fail after logout
    const refreshAfterLogout = await app.request("/api/auth/refresh", {
      method: "POST",
      headers: { Cookie: `refresh_token=${refreshCookie}` },
    });
    expect(refreshAfterLogout.status).toBe(401);
  });
});
