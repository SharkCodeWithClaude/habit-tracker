import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import { JWT_SECRET } from "../config/env.js";

export type AuthEnv = {
  Variables: {
    userId: string;
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid authorization header" }, 401);
  }

  const token = authHeader.substring(7);
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    c.set("userId", payload.sub as string);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});
