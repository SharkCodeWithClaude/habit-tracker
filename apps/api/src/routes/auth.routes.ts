import { Hono } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { registerSchema, loginSchema } from "@habit-tracker/shared";
import { AuthService, AuthError } from "../services/auth.service.js";
import { REFRESH_TOKEN_EXPIRES_IN } from "../config/env.js";
import type { Database } from "../config/database.js";

function setRefreshCookie(c: any, token: string) {
  setCookie(c, "refresh_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_EXPIRES_IN,
  });
}

export function createAuthRoutes(db: Database) {
  const router = new Hono();
  const authService = new AuthService(db);

  router.post("/register", async (c) => {
    const body = await c.req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, 400);
    }

    try {
      const { user, accessToken, refreshToken } = await authService.register(
        parsed.data.email,
        parsed.data.password,
        parsed.data.displayName
      );

      setRefreshCookie(c, refreshToken);
      return c.json({ accessToken, user }, 201);
    } catch (e) {
      if (e instanceof AuthError) {
        return c.json({ error: e.message }, e.status as 409);
      }
      throw e;
    }
  });

  router.post("/login", async (c) => {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, 400);
    }

    try {
      const { user, accessToken, refreshToken } = await authService.login(
        parsed.data.email,
        parsed.data.password
      );

      setRefreshCookie(c, refreshToken);
      return c.json({ accessToken, user }, 200);
    } catch (e) {
      if (e instanceof AuthError) {
        return c.json({ error: e.message }, e.status as 401);
      }
      throw e;
    }
  });

  router.post("/refresh", async (c) => {
    const rawToken = getCookie(c, "refresh_token");
    if (!rawToken) {
      return c.json({ error: "Missing refresh token" }, 401);
    }

    try {
      const { accessToken, refreshToken } = await authService.refresh(rawToken);

      setRefreshCookie(c, refreshToken);
      return c.json({ accessToken }, 200);
    } catch (e) {
      if (e instanceof AuthError) {
        return c.json({ error: e.message }, e.status as 401);
      }
      throw e;
    }
  });

  router.post("/logout", async (c) => {
    const rawToken = getCookie(c, "refresh_token");
    if (rawToken) {
      await authService.logout(rawToken);
    }

    deleteCookie(c, "refresh_token", { path: "/api/auth" });
    return c.body(null, 204);
  });

  return router;
}
