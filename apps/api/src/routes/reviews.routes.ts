import { Hono } from "hono";
import { getWeeklyReviewSchema, upsertReflectionSchema } from "@habit-tracker/shared";
import { ReviewService } from "../services/review.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import type { AuthEnv } from "../middleware/auth.middleware.js";
import type { Database } from "../config/database.js";

export function createReviewRoutes(db: Database) {
  const router = new Hono<AuthEnv>();
  const reviewService = new ReviewService(db);

  router.use(authMiddleware);

  router.get("/weekly", async (c) => {
    const week = c.req.query("week");
    const parsed = getWeeklyReviewSchema.safeParse({ week });
    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        400
      );
    }

    const userId = c.get("userId");
    const stats = await reviewService.getWeeklyStats(userId, parsed.data.week);
    return c.json(stats);
  });

  router.put("/weekly", async (c) => {
    const body = await c.req.json();
    const parsed = upsertReflectionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        400
      );
    }

    const userId = c.get("userId");
    const result = await reviewService.upsertReflection(
      userId,
      parsed.data.week,
      parsed.data.reflection
    );
    return c.json(result);
  });

  return router;
}
