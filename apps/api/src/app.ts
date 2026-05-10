import { Hono } from "hono";
import { createAuthRoutes } from "./routes/auth.routes.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import type { Database } from "./config/database.js";
import type { AuthEnv } from "./middleware/auth.middleware.js";

export function createApp(db?: Database) {
  const app = new Hono();

  app.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  if (db) {
    app.route("/api/auth", createAuthRoutes(db));
  }

  return app;
}

export { authMiddleware };
export type { AuthEnv };
export type AppType = ReturnType<typeof createApp>;
