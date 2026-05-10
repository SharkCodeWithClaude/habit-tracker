import { Hono } from "hono";
import {
  createHabitSchema,
  updateHabitSchema,
  toggleHabitSchema,
  setSessionSchema,
} from "@habit-tracker/shared";
import { HabitService, HabitError } from "../services/habit.service.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import type { AuthEnv } from "../middleware/auth.middleware.js";
import type { Database } from "../config/database.js";

export function createHabitRoutes(db: Database) {
  const router = new Hono<AuthEnv>();
  const habitService = new HabitService(db);

  router.use(authMiddleware);

  router.post("/", async (c) => {
    const body = await c.req.json();
    const parsed = createHabitSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        400
      );
    }

    const userId = c.get("userId");
    const habit = await habitService.create(userId, parsed.data);
    return c.json({ habit }, 201);
  });

  router.get("/", async (c) => {
    const userId = c.get("userId");
    const habits = await habitService.list(userId);
    return c.json({ habits });
  });

  router.get("/logs", async (c) => {
    const date = c.req.query("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json({ error: "date query param required (YYYY-MM-DD)" }, 400);
    }
    const userId = c.get("userId");
    const logs = await habitService.getLogsForDate(userId, date);
    return c.json({ logs });
  });

  router.get("/streaks", async (c) => {
    const userId = c.get("userId");
    const today = new Date().toISOString().slice(0, 10);
    const streaks = await habitService.getStreaks(userId, today);
    return c.json({ streaks });
  });

  router.patch("/:id", async (c) => {
    const body = await c.req.json();
    const parsed = updateHabitSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        400
      );
    }

    if (Object.keys(parsed.data).length === 0) {
      return c.json({ error: "No fields to update" }, 400);
    }

    const userId = c.get("userId");
    const habitId = c.req.param("id");

    try {
      const habit = await habitService.update(userId, habitId, parsed.data);
      return c.json({ habit });
    } catch (e) {
      if (e instanceof HabitError) {
        return c.json({ error: e.message }, e.status as 404);
      }
      throw e;
    }
  });

  router.delete("/:id", async (c) => {
    const userId = c.get("userId");
    const habitId = c.req.param("id");

    try {
      const habit = await habitService.archive(userId, habitId);
      return c.json({ habit });
    } catch (e) {
      if (e instanceof HabitError) {
        return c.json({ error: e.message }, e.status as 404);
      }
      throw e;
    }
  });

  router.post("/:id/toggle", async (c) => {
    const body = await c.req.json();
    const parsed = toggleHabitSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        400
      );
    }

    const userId = c.get("userId");
    const habitId = c.req.param("id");

    try {
      const result = await habitService.toggle(userId, habitId, parsed.data.date);
      return c.json(result);
    } catch (e) {
      if (e instanceof HabitError) {
        return c.json({ error: e.message }, e.status as 404);
      }
      throw e;
    }
  });

  router.patch("/:id/sessions", async (c) => {
    const body = await c.req.json();
    const parsed = setSessionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        400
      );
    }

    const userId = c.get("userId");
    const habitId = c.req.param("id");

    try {
      const result = await habitService.setSession(
        userId,
        habitId,
        parsed.data.date,
        parsed.data.value
      );
      return c.json(result);
    } catch (e) {
      if (e instanceof HabitError) {
        return c.json({ error: e.message }, e.status as 404);
      }
      throw e;
    }
  });

  return router;
}
