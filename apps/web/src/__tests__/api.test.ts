import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  apiGet,
  apiPost,
  apiPatch,
  fetchHabits,
  fetchStreaks,
  fetchLogsForDate,
  toggleHabit,
  setSession,
  buildLogMap,
} from "../lib/api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("apiGet / apiPost / apiPatch", () => {
  it("apiGet sends GET with auth header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: 1 }),
    });
    const result = await apiGet("/api/habits", "tok123");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer tok123",
        }),
      })
    );
    expect(result).toEqual({ data: 1 });
  });

  it("apiPost sends POST with JSON body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ toggled: true }),
    });
    const result = await apiPost("/api/habits/1/toggle", { date: "2026-05-10" }, "tok");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits/1/toggle"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ date: "2026-05-10" }),
      })
    );
    expect(result).toEqual({ toggled: true });
  });

  it("apiGet returns null on non-ok response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    const result = await apiGet("/api/habits", "bad");
    expect(result).toBeNull();
  });

  it("apiGet returns null on network error", async () => {
    mockFetch.mockRejectedValue(new Error("network"));
    const result = await apiGet("/api/habits", "tok");
    expect(result).toBeNull();
  });
});

describe("fetchHabits", () => {
  it("maps API response to Otter DS Habit[]", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        habits: [
          {
            id: "abc-123",
            userId: "user-1",
            name: "Workout",
            emoji: "🏃",
            kind: "binary",
            sortOrder: 0,
            archivedAt: null,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
            aliases: ["workout", "gym"],
          },
          {
            id: "def-456",
            userId: "user-1",
            name: "Read",
            emoji: "📖",
            kind: "session",
            sortOrder: 1,
            archivedAt: null,
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
            aliases: ["read"],
          },
        ],
      }),
    });

    const habits = await fetchHabits("tok");
    expect(habits).toEqual([
      { id: "abc-123", name: "Workout", emoji: "🏃", kind: "binary", aliases: ["workout", "gym"] },
      { id: "def-456", name: "Read", emoji: "📖", kind: "session", aliases: ["read"] },
    ]);
  });

  it("returns empty array on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const habits = await fetchHabits("tok");
    expect(habits).toEqual([]);
  });
});

describe("fetchStreaks", () => {
  it("maps API streaks to Record<habitId, count>", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        streaks: [
          { habitId: "abc-123", currentStreak: 5 },
          { habitId: "def-456", currentStreak: 0 },
        ],
      }),
    });

    const streaks = await fetchStreaks("tok");
    expect(streaks).toEqual({ "abc-123": 5, "def-456": 0 });
  });
});

describe("fetchLogsForDate", () => {
  it("returns raw logs array from API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        logs: [
          { habitId: "abc-123", date: "2026-05-10", value: 1 },
          { habitId: "def-456", date: "2026-05-10", value: 3 },
        ],
      }),
    });

    const logs = await fetchLogsForDate("tok", "2026-05-10");
    expect(logs).toEqual([
      { habitId: "abc-123", date: "2026-05-10", value: 1 },
      { habitId: "def-456", date: "2026-05-10", value: 3 },
    ]);
  });
});

describe("buildLogMap", () => {
  it("converts API logs to Otter DS LogMap for binary habits", () => {
    const habits = [
      { id: "abc-123", name: "Workout", emoji: "🏃", kind: "binary" as const },
    ];
    const logs = [{ habitId: "abc-123", date: "2026-05-10", value: 1 }];
    const map = buildLogMap(logs, habits);
    expect(map).toEqual({ "abc-123|2026-05-10": true });
  });

  it("converts API logs to Otter DS LogMap for session habits", () => {
    const habits = [
      { id: "def-456", name: "Read", emoji: "📖", kind: "session" as const },
    ];
    const logs = [{ habitId: "def-456", date: "2026-05-10", value: 3 }];
    const map = buildLogMap(logs, habits);
    expect(map).toEqual({ "def-456|2026-05-10": 3 });
  });

  it("handles mixed binary and session habits", () => {
    const habits = [
      { id: "a", name: "Run", emoji: "🏃", kind: "binary" as const },
      { id: "b", name: "Read", emoji: "📖", kind: "session" as const },
    ];
    const logs = [
      { habitId: "a", date: "2026-05-10", value: 1 },
      { habitId: "b", date: "2026-05-10", value: 2 },
    ];
    const map = buildLogMap(logs, habits);
    expect(map).toEqual({
      "a|2026-05-10": true,
      "b|2026-05-10": 2,
    });
  });
});

describe("toggleHabit", () => {
  it("calls POST /api/habits/:id/toggle with date", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ toggled: true }),
    });
    const result = await toggleHabit("tok", "abc-123", "2026-05-10");
    expect(result).toEqual({ toggled: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits/abc-123/toggle"),
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("setSession", () => {
  it("calls PATCH /api/habits/:id/sessions with date and value", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ log: { habitId: "def-456", date: "2026-05-10", value: 3 } }),
    });
    const result = await setSession("tok", "def-456", "2026-05-10", 3);
    expect(result).toEqual({ log: { habitId: "def-456", date: "2026-05-10", value: 3 } });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits/def-456/sessions"),
      expect.objectContaining({ method: "PATCH" })
    );
  });
});
