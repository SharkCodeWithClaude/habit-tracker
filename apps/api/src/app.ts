import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuthRoutes } from "./routes/auth.routes.js";
import { createHabitRoutes } from "./routes/habits.routes.js";
import { createConversationRoutes } from "./routes/conversations.routes.js";
import { createReviewRoutes } from "./routes/reviews.routes.js";
import { createAiConfigRoutes } from "./routes/ai-config.routes.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import type { Database } from "./config/database.js";
import type { AuthEnv } from "./middleware/auth.middleware.js";

export function createApp(db?: Database) {
  const app = new Hono();

  app.use("*", cors({
    origin: "http://localhost:3000",
    credentials: true,
  }));

  app.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  if (db) {
    app.route("/api/auth", createAuthRoutes(db));
    app.route("/api/habits", createHabitRoutes(db));
    app.route("/api/conversations", createConversationRoutes(db));
    app.route("/api/reviews", createReviewRoutes(db));
    app.route("/api/settings/ai", createAiConfigRoutes(db));
  }

  return app;
}

export { authMiddleware };
export type { AuthEnv };
export type AppType = ReturnType<typeof createApp>;
