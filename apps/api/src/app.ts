import { Hono } from "hono";
import type { Habit } from "@habit-tracker/shared";

const app = new Hono();

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

export { app };
export type AppType = typeof app;
