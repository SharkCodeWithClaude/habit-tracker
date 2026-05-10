import { Hono } from "hono";
import { createAuthRoutes } from "./routes/auth.routes.js";
import { createHabitRoutes } from "./routes/habits.routes.js";
import { createConversationRoutes } from "./routes/conversations.routes.js";
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
    app.route("/api/habits", createHabitRoutes(db));
    app.route("/api/conversations", createConversationRoutes(db));
  }

  return app;
}

export { authMiddleware };
export type { AuthEnv };
export type AppType = ReturnType<typeof createApp>;
