import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    NextResponse: {
      next: vi.fn(() => ({ type: "next" })),
      redirect: vi.fn((url: URL) => ({ type: "redirect", url: url.toString() })),
    },
  };
});

import { middleware, config } from "../middleware";
import { NextResponse } from "next/server";

function makeRequest(path: string, cookies: Record<string, string> = {}): NextRequest {
  const url = new URL(path, "http://localhost:3000");
  const req = new NextRequest(url);
  for (const [k, v] of Object.entries(cookies)) {
    req.cookies.set(k, v);
  }
  return req;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("middleware", () => {
  describe("public routes", () => {
    it("allows /login without auth token", () => {
      const req = makeRequest("/login");
      middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it("allows /register without auth token", () => {
      const req = makeRequest("/register");
      middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it("allows /offline without auth token", () => {
      const req = makeRequest("/offline");
      middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe("protected routes", () => {
    it("redirects unauthenticated users from / to /login", () => {
      const req = makeRequest("/");
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe("/login");
    });

    it("redirects unauthenticated users from /today to /login", () => {
      const req = makeRequest("/today");
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe("/login");
    });

    it("redirects unauthenticated users from /calendar to /login", () => {
      const req = makeRequest("/calendar");
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe("/login");
    });

    it("redirects unauthenticated users from /settings to /login", () => {
      const req = makeRequest("/settings");
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe("/login");
    });

    it("allows authenticated users to access protected routes", () => {
      const req = makeRequest("/today", { access_token: "valid-jwt" });
      middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });

    it("allows authenticated users to access /settings", () => {
      const req = makeRequest("/settings", { access_token: "valid-jwt" });
      middleware(req);
      expect(NextResponse.next).toHaveBeenCalled();
      expect(NextResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe("authenticated users on public routes", () => {
    it("redirects authenticated users from /login to /today", () => {
      const req = makeRequest("/login", { access_token: "valid-jwt" });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe("/today");
    });

    it("redirects authenticated users from /register to /today", () => {
      const req = makeRequest("/register", { access_token: "valid-jwt" });
      middleware(req);
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectUrl = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(redirectUrl.pathname).toBe("/today");
    });
  });

  describe("static assets and API routes", () => {
    it("does not run on _next/static paths (via matcher config)", () => {
      expect(config.matcher).toBeDefined();
      expect(config.matcher).toContain("/((?!_next/static|_next/image|favicon\\.ico|icons/|manifest\\.json|sw\\.js).*)");
    });
  });
});
