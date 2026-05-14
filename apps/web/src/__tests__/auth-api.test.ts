import { describe, it, expect, vi, beforeEach } from "vitest";
import { authFetch, AUTH_EVENTS } from "../lib/auth-fetch";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("authFetch", () => {
  it("adds Authorization header when token is provided", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    await authFetch("/api/habits", "my-token");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/habits"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
        }),
      })
    );
  });

  it("omits Authorization header when token is null", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    await authFetch("/api/habits", null);
    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers.Authorization).toBeUndefined();
  });

  it("returns response directly on success", async () => {
    const mockRes = { ok: true, status: 200, json: async () => ({ data: 1 }) };
    mockFetch.mockResolvedValueOnce(mockRes);
    const res = await authFetch("/api/habits", "tok");
    expect(res).toBe(mockRes);
  });

  describe("401 handling", () => {
    it("attempts token refresh on 401 response", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accessToken: "new-tok" }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: 1 }) });

      const onRefresh = vi.fn();
      const res = await authFetch("/api/habits", "old-tok", { onTokenRefreshed: onRefresh });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("/api/auth/refresh"),
        expect.objectContaining({ method: "POST", credentials: "include" })
      );
      expect(onRefresh).toHaveBeenCalledWith("new-tok");
      expect(res.ok).toBe(true);
    });

    it("retries original request with new token after refresh", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ accessToken: "refreshed-tok" }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

      await authFetch("/api/habits", "old-tok");

      const retryCall = mockFetch.mock.calls[2];
      expect(retryCall[1].headers.Authorization).toBe("Bearer refreshed-tok");
    });

    it("emits unauthorized event when refresh fails", async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({ ok: false, status: 401 });

      const listener = vi.fn();
      AUTH_EVENTS.addEventListener("unauthorized", listener);

      const res = await authFetch("/api/habits", "old-tok");

      expect(listener).toHaveBeenCalled();
      expect(res.ok).toBe(false);

      AUTH_EVENTS.removeEventListener("unauthorized", listener);
    });

    it("does not retry if token is null (no auth)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

      const res = await authFetch("/api/habits", null);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(401);
    });
  });

  it("passes through non-401 errors without refresh", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const res = await authFetch("/api/habits", "tok");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(500);
  });
});
