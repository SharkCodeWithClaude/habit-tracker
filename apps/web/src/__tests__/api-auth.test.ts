import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockLocalStorage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
  removeItem: (key: string) => { delete mockLocalStorage[key]; },
  clear: () => { for (const k of Object.keys(mockLocalStorage)) delete mockLocalStorage[k]; },
});

import {
  apiGet,
  apiPost,
  apiPatch,
  apiDelete,
  fetchHabits,
  fetchStreaks,
  fetchLogsForDate,
  toggleHabit,
  setSession,
  fetchActiveConversation,
  createConversation,
  fetchMessages,
  sendMessage,
  wrapConversation,
  createHabit,
  fetchAiConfigs,
  saveAiConfig,
  deleteAiConfig,
  getStoredToken,
} from "../lib/api";
import { AUTH_EVENTS } from "../lib/auth-fetch";

beforeEach(() => {
  mockFetch.mockReset();
  localStorage.clear();
});

describe("getStoredToken", () => {
  it("returns token from localStorage when present", () => {
    localStorage.setItem("access_token", "jwt-123");
    expect(getStoredToken()).toBe("jwt-123");
  });

  it("returns null when no token stored", () => {
    expect(getStoredToken()).toBeNull();
  });
});

describe("auto-token retrieval", () => {
  it("apiGet automatically includes stored token in Authorization header", async () => {
    localStorage.setItem("access_token", "auto-tok");
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: 1 }) });

    await apiGet("/api/habits");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer auto-tok",
        }),
      })
    );
  });

  it("apiPost automatically includes stored token", async () => {
    localStorage.setItem("access_token", "auto-tok");
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });

    await apiPost("/api/habits/1/toggle", { date: "2026-05-14" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits/1/toggle"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer auto-tok",
        }),
      })
    );
  });

  it("apiPatch automatically includes stored token", async () => {
    localStorage.setItem("access_token", "auto-tok");
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) });

    await apiPatch("/api/habits/1/sessions", { date: "2026-05-14", value: 3 });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits/1/sessions"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer auto-tok",
        }),
      })
    );
  });

  it("apiDelete automatically includes stored token", async () => {
    localStorage.setItem("access_token", "auto-tok");
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    await apiDelete("/api/settings/ai/claude");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/settings/ai/claude"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer auto-tok",
        }),
      })
    );
  });

  it("works without stored token (no Authorization header)", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: 1 }) });

    await apiGet("/api/habits");

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });
});

describe("higher-level functions use auto-token (no token param)", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "jwt-auto");
  });

  it("fetchHabits sends token automatically", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ habits: [] }),
    });

    await fetchHabits();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-auto",
        }),
      })
    );
  });

  it("fetchStreaks sends token automatically", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ streaks: [] }),
    });

    await fetchStreaks();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits/streaks"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-auto",
        }),
      })
    );
  });

  it("fetchLogsForDate sends token automatically", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ logs: [] }),
    });

    await fetchLogsForDate("2026-05-14");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits/logs"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-auto",
        }),
      })
    );
  });

  it("toggleHabit sends token automatically", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ toggled: true }),
    });

    await toggleHabit("h1", "2026-05-14");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits/h1/toggle"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-auto",
        }),
      })
    );
  });

  it("setSession sends token automatically", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ log: null }),
    });

    await setSession("h1", "2026-05-14", 3);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits/h1/sessions"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-auto",
        }),
      })
    );
  });

  it("createHabit sends token automatically", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ habit: { id: "h1", name: "Walk", emoji: "🚶", kind: "binary", aliases: ["walk"] } }),
    });

    await createHabit("Walk", "🚶", "binary", ["walk"]);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-auto",
        }),
      })
    );
  });

  it("fetchActiveConversation sends token automatically", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ conversation: null }),
    });

    await fetchActiveConversation();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/conversations/active"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-auto",
        }),
      })
    );
  });

  it("sendMessage sends token automatically", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: { id: "m1" } }),
    });

    await sendMessage("conv-1", "hello", "user");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/conversations/conv-1/messages"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-auto",
        }),
      })
    );
  });

  it("deleteAiConfig sends token automatically", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    await deleteAiConfig("claude");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/settings/ai/claude"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer jwt-auto",
        }),
      })
    );
  });
});

describe("401 auto-refresh via authFetch", () => {
  beforeEach(() => {
    localStorage.setItem("access_token", "expired-tok");
  });

  it("apiGet retries with refreshed token on 401", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: "new-tok" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: "refreshed" }),
      });

    const result = await apiGet<{ data: string }>("/api/habits");

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/auth/refresh"),
      expect.objectContaining({ method: "POST", credentials: "include" })
    );
    expect(result).toEqual({ data: "refreshed" });
  });

  it("apiPost retries with refreshed token on 401", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: "new-tok" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ toggled: true }),
      });

    const result = await apiPost<{ toggled: boolean }>("/api/habits/1/toggle", { date: "2026-05-14" });

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result).toEqual({ toggled: true });
  });

  it("emits unauthorized event when refresh fails", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: false, status: 401 });

    const listener = vi.fn();
    AUTH_EVENTS.addEventListener("unauthorized", listener);

    const result = await apiGet("/api/habits");

    expect(listener).toHaveBeenCalled();
    expect(result).toBeNull();

    AUTH_EVENTS.removeEventListener("unauthorized", listener);
  });

  it("updates stored token after successful refresh", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: "refreshed-jwt" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 1 }),
      });

    await apiGet("/api/habits");

    expect(localStorage.getItem("access_token")).toBe("refreshed-jwt");
  });
});

describe("apiDelete", () => {
  it("sends DELETE request with correct path", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    await apiDelete("/api/settings/ai/claude");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/settings/ai/claude"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("returns true on success", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    const result = await apiDelete("/api/settings/ai/claude");
    expect(result).toBe(true);
  });

  it("returns false on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const result = await apiDelete("/api/settings/ai/claude");
    expect(result).toBe(false);
  });
});
