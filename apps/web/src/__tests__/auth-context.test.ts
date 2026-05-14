// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as React from "react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { renderHook, act, cleanup } from "./react-test-utils";
import { AuthProvider, useAuth } from "../lib/auth";

beforeEach(() => {
  mockFetch.mockReset();
  mockPush.mockReset();
  localStorage.clear();
  document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
});

afterEach(() => {
  cleanup();
});

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(AuthProvider, null, children);
}

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
}

describe("useAuth", () => {
  describe("initial state", () => {
    it("resolves with null user and loading=false when no stored token", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      await settle();
      expect(result.current.user).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("sets user and token on successful login", async () => {
      const user = { id: "u1", email: "a@b.com", displayName: "A" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: "jwt-123", user }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await settle();

      await act(async () => {
        await result.current.login("a@b.com", "pass1234");
      });

      expect(result.current.user).toEqual(user);
      expect(result.current.token).toBe("jwt-123");
      expect(localStorage.getItem("access_token")).toBe("jwt-123");
    });

    it("throws on failed login", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Invalid credentials" }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await settle();

      await expect(
        act(async () => {
          await result.current.login("bad@b.com", "wrong");
        })
      ).rejects.toThrow("Invalid credentials");
    });
  });

  describe("register", () => {
    it("sets user and token on successful registration", async () => {
      const user = { id: "u2", email: "new@b.com", displayName: "New" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: "jwt-new", user }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await settle();

      await act(async () => {
        await result.current.register("new@b.com", "pass1234");
      });

      expect(result.current.user).toEqual(user);
      expect(result.current.token).toBe("jwt-new");
    });
  });

  describe("logout", () => {
    it("clears user, token, and redirects to /login", async () => {
      const user = { id: "u1", email: "a@b.com", displayName: "A" };
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accessToken: "jwt-123", user }),
        })
        .mockResolvedValueOnce({ ok: true, status: 204 });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await settle();

      await act(async () => {
        await result.current.login("a@b.com", "pass1234");
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(localStorage.getItem("access_token")).toBeNull();
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  describe("token refresh", () => {
    it("attempts refresh on mount when stored token exists", async () => {
      localStorage.setItem("access_token", "old-jwt");

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: "refreshed-jwt" }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await settle();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/auth/refresh"),
        expect.objectContaining({
          method: "POST",
          credentials: "include",
        })
      );
      expect(result.current.token).toBe("refreshed-jwt");
      expect(result.current.loading).toBe(false);
    });

    it("clears state when refresh fails on mount", async () => {
      localStorage.setItem("access_token", "expired-jwt");

      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const { result } = renderHook(() => useAuth(), { wrapper });
      await settle();

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(localStorage.getItem("access_token")).toBeNull();
    });
  });
});
