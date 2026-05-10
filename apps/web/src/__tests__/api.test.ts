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
  fetchActiveConversation,
  createConversation,
  fetchMessages,
  sendMessage,
  wrapConversation,
  createHabit,
  fetchAiConfigs,
  saveAiConfig,
  deleteAiConfig,
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

describe("fetchActiveConversation", () => {
  it("returns active conversation on success", async () => {
    const conv = {
      id: "conv-1",
      userId: "user-1",
      date: "2026-05-10",
      startedAt: "2026-05-10T08:00:00Z",
      endedAt: null,
      tokenCount: 100,
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ conversation: conv }),
    });
    const result = await fetchActiveConversation("tok");
    expect(result).toEqual(conv);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/conversations/active"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("returns null when no active conversation", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const result = await fetchActiveConversation("tok");
    expect(result).toBeNull();
  });
});

describe("createConversation", () => {
  it("creates a new conversation with date", async () => {
    const conv = {
      id: "conv-2",
      userId: "user-1",
      date: "2026-05-10",
      startedAt: "2026-05-10T08:00:00Z",
      endedAt: null,
      tokenCount: 0,
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ conversation: conv }),
    });
    const result = await createConversation("tok", "2026-05-10");
    expect(result).toEqual(conv);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/conversations"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ date: "2026-05-10" }),
      })
    );
  });

  it("returns null on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const result = await createConversation("tok", "2026-05-10");
    expect(result).toBeNull();
  });
});

describe("fetchMessages", () => {
  it("returns messages array for a conversation", async () => {
    const messages = [
      { id: "m1", conversationId: "conv-1", role: "user", content: "I ran today", createdAt: "2026-05-10T08:01:00Z" },
      { id: "m2", conversationId: "conv-1", role: "assistant", content: "Great job!", createdAt: "2026-05-10T08:01:01Z" },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ messages }),
    });
    const result = await fetchMessages("tok", "conv-1");
    expect(result).toEqual(messages);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/conversations/conv-1/messages"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("returns empty array on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const result = await fetchMessages("tok", "conv-1");
    expect(result).toEqual([]);
  });
});

describe("sendMessage", () => {
  it("sends user message to conversation", async () => {
    const msg = { id: "m3", conversationId: "conv-1", role: "user", content: "Did yoga", createdAt: "2026-05-10T09:00:00Z" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: msg }),
    });
    const result = await sendMessage("tok", "conv-1", "Did yoga", "user");
    expect(result).toEqual(msg);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/conversations/conv-1/messages"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "Did yoga", role: "user" }),
      })
    );
  });

  it("returns null on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400 });
    const result = await sendMessage("tok", "conv-1", "test", "user");
    expect(result).toBeNull();
  });
});

describe("wrapConversation", () => {
  it("wraps an active conversation", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ conversation: { id: "conv-1", endedAt: "2026-05-10T10:00:00Z" } }),
    });
    const result = await wrapConversation("tok", "conv-1");
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/conversations/conv-1/wrap"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns false on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const result = await wrapConversation("tok", "conv-1");
    expect(result).toBe(false);
  });
});

describe("createHabit", () => {
  it("creates a new habit", async () => {
    const habit = {
      id: "hab-new",
      name: "Walk",
      emoji: "🚶",
      kind: "binary",
      aliases: ["walk", "walking"],
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ habit }),
    });
    const result = await createHabit("tok", "Walk", "🚶", "binary", ["walk", "walking"]);
    expect(result).toEqual({ id: "hab-new", name: "Walk", emoji: "🚶", kind: "binary", aliases: ["walk", "walking"] });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Walk", emoji: "🚶", kind: "binary", aliases: ["walk", "walking"] }),
      })
    );
  });

  it("returns null on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    const result = await createHabit("tok", "Walk", "🚶", "binary", []);
    expect(result).toBeNull();
  });
});

describe("fetchAiConfigs", () => {
  it("returns configs array", async () => {
    const configs = [
      { id: "cfg-1", provider: "claude", modelName: null, isActive: true, createdAt: "2026-05-10T00:00:00Z", updatedAt: "2026-05-10T00:00:00Z" },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ configs }),
    });
    const result = await fetchAiConfigs("tok");
    expect(result).toEqual(configs);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/settings/ai"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("returns empty array on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    const result = await fetchAiConfigs("tok");
    expect(result).toEqual([]);
  });
});

describe("saveAiConfig", () => {
  it("saves provider config", async () => {
    const config = { id: "cfg-1", provider: "openai", modelName: "gpt-4o", isActive: true, createdAt: "2026-05-10T00:00:00Z", updatedAt: "2026-05-10T00:00:00Z" };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ config }),
    });
    const result = await saveAiConfig("tok", "openai", "sk-key", "gpt-4o");
    expect(result).toEqual(config);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/settings/ai"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ provider: "openai", apiKey: "sk-key", modelName: "gpt-4o" }),
      })
    );
  });

  it("returns null on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 400 });
    const result = await saveAiConfig("tok", "openai", "bad", undefined);
    expect(result).toBeNull();
  });
});

describe("deleteAiConfig", () => {
  it("deletes a provider config", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ deleted: true }) });
    const result = await deleteAiConfig("tok", "claude");
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/settings/ai/claude"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("returns false on failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });
    const result = await deleteAiConfig("tok", "groq");
    expect(result).toBe(false);
  });
});
