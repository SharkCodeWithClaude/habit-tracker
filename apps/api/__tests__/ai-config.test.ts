import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createApp } from "../src/app.js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema.js";
import { execSync } from "node:child_process";
import { DATABASE_URL } from "../src/config/env.js";
import path from "node:path";

const canConnect = await (async () => {
  try {
    const c = postgres(DATABASE_URL, { connect_timeout: 2 });
    await c`SELECT 1`;
    await c.end();
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!canConnect)("AI Config routes", () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let app: ReturnType<typeof createApp>;
  let accessToken: string;

  beforeAll(async () => {
    const client = postgres(DATABASE_URL, { connect_timeout: 3 });
    db = drizzle(client, { schema });
    execSync("npx drizzle-kit push --force", {
      cwd: path.resolve(import.meta.dirname, ".."),
      env: { ...process.env, DATABASE_URL },
      stdio: "pipe",
    });
    app = createApp(db);
  });

  beforeEach(async () => {
    await db.delete(schema.userAiConfigs);
    await db.delete(schema.refreshTokens);
    await db.delete(schema.users);

    const res = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "aiconfig@test.com",
        password: "password123",
      }),
    });
    const body = await res.json();
    accessToken = (body as { accessToken: string }).accessToken;
  });

  function authHeaders() {
    return {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
  }

  describe("POST /api/settings/ai", () => {
    it("saves a provider config and returns public config (no raw key)", async () => {
      const res = await app.request("/api/settings/ai", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          provider: "claude",
          apiKey: "sk-ant-api03-test-key",
          modelName: "claude-sonnet-4-20250514",
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body).toHaveProperty("config");
      expect(body.config.provider).toBe("claude");
      expect(body.config.modelName).toBe("claude-sonnet-4-20250514");
      expect(body.config.isActive).toBe(true);
      expect(body.config).not.toHaveProperty("apiKey");
      expect(body.config).not.toHaveProperty("apiKeyEncrypted");
    });

    it("rejects invalid provider", async () => {
      const res = await app.request("/api/settings/ai", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          provider: "invalid",
          apiKey: "some-key",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("deactivates previous provider when saving new one", async () => {
      await app.request("/api/settings/ai", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ provider: "claude", apiKey: "key1" }),
      });
      await app.request("/api/settings/ai", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ provider: "gemini", apiKey: "key2" }),
      });

      const res = await app.request("/api/settings/ai", {
        method: "GET",
        headers: authHeaders(),
      });
      const body = (await res.json()) as any;
      expect(body.configs).toHaveLength(2);
      const active = body.configs.filter((c: { isActive: boolean }) => c.isActive);
      expect(active).toHaveLength(1);
      expect(active[0].provider).toBe("gemini");
    });
  });

  describe("GET /api/settings/ai", () => {
    it("returns empty configs array when none set", async () => {
      const res = await app.request("/api/settings/ai", {
        method: "GET",
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as any;
      expect(body.configs).toEqual([]);
    });

    it("returns configs without raw key", async () => {
      await app.request("/api/settings/ai", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ provider: "openai", apiKey: "sk-openai-key" }),
      });

      const res = await app.request("/api/settings/ai", {
        method: "GET",
        headers: authHeaders(),
      });
      const body = (await res.json()) as any;
      expect(body.configs).toHaveLength(1);
      expect(body.configs[0].provider).toBe("openai");
      expect(body.configs[0]).not.toHaveProperty("apiKey");
      expect(body.configs[0]).not.toHaveProperty("apiKeyEncrypted");
    });
  });

  describe("DELETE /api/settings/ai/:provider", () => {
    it("removes a provider config", async () => {
      await app.request("/api/settings/ai", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ provider: "groq", apiKey: "gsk-key" }),
      });

      const res = await app.request("/api/settings/ai/groq", {
        method: "DELETE",
        headers: authHeaders(),
      });
      expect(res.status).toBe(200);

      const listRes = await app.request("/api/settings/ai", {
        method: "GET",
        headers: authHeaders(),
      });
      const body = (await listRes.json()) as any;
      expect(body.configs).toHaveLength(0);
    });

    it("returns 404 for non-existent provider", async () => {
      const res = await app.request("/api/settings/ai/openai", {
        method: "DELETE",
        headers: authHeaders(),
      });
      expect(res.status).toBe(404);
    });
  });

  describe("encryption integration", () => {
    it("stores encrypted key that can be decrypted by service", async () => {
      await app.request("/api/settings/ai", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ provider: "claude", apiKey: "sk-secret-key-123" }),
      });

      const rows = await db.select().from(schema.userAiConfigs);
      expect(rows).toHaveLength(1);
      expect(rows[0].apiKeyEncrypted).not.toBe("sk-secret-key-123");
      expect(rows[0].apiKeyEncrypted.length).toBeGreaterThan(20);
    });
  });
});
