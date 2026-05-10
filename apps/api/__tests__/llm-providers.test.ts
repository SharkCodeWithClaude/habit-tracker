import { describe, it, expect, vi, beforeEach } from "vitest";
import { ClaudeProvider } from "../src/providers/claude.provider.js";
import { GeminiProvider } from "../src/providers/gemini.provider.js";
import { GroqProvider } from "../src/providers/groq.provider.js";
import { OpenAIProvider } from "../src/providers/openai.provider.js";
import type { ChatInput } from "@habit-tracker/shared";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const sampleInput: ChatInput = {
  messages: [
    { role: "user", content: "I went for a run and meditated" },
  ],
  habits: [
    { id: "h1", name: "Run", aliases: ["run", "ran", "running"] },
    { id: "h2", name: "Meditate", aliases: ["meditate", "meditation"] },
  ],
  date: "2026-05-10",
};

const structuredResponse = JSON.stringify({
  reply: "Great job with your run and meditation!",
  proposals: {
    ticks: {
      h1: { confidence: 0.95, evidence: "went for a run" },
      h2: { confidence: 0.9, evidence: "meditated" },
    },
    newHabits: [],
  },
  shouldWrap: false,
});

function mockSuccessResponse(body: string) {
  return {
    ok: true,
    status: 200,
    json: async () => JSON.parse(body),
    text: async () => body,
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("ClaudeProvider", () => {
  const provider = new ClaudeProvider("sk-ant-test-key", "claude-sonnet-4-20250514");

  it("sends correct request structure to Claude API", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSuccessResponse(
        JSON.stringify({
          content: [{ type: "text", text: structuredResponse }],
          usage: { input_tokens: 100, output_tokens: 50 },
        })
      )
    );

    await provider.chat(sampleInput);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(opts.method).toBe("POST");
    expect(opts.headers["x-api-key"]).toBe("sk-ant-test-key");
    expect(opts.headers["anthropic-version"]).toBeDefined();
    const body = JSON.parse(opts.body);
    expect(body.model).toBe("claude-sonnet-4-20250514");
    expect(body.messages.length).toBeGreaterThan(0);
  });

  it("parses structured response correctly", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSuccessResponse(
        JSON.stringify({
          content: [{ type: "text", text: structuredResponse }],
          usage: { input_tokens: 100, output_tokens: 50 },
        })
      )
    );

    const result = await provider.chat(sampleInput);
    expect(result.reply).toBe("Great job with your run and meditation!");
    expect(result.proposals.ticks).toHaveProperty("h1");
    expect(result.proposals.ticks).toHaveProperty("h2");
    expect(result.tokenCount).toBe(150);
    expect(result.shouldWrap).toBe(false);
  });

  it("falls back gracefully on non-JSON response", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSuccessResponse(
        JSON.stringify({
          content: [{ type: "text", text: "Just a plain text response" }],
          usage: { input_tokens: 50, output_tokens: 20 },
        })
      )
    );

    const result = await provider.chat(sampleInput);
    expect(result.reply).toBe("Just a plain text response");
    expect(result.proposals.ticks).toEqual({});
    expect(result.proposals.newHabits).toEqual([]);
  });

  it("throws on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    await expect(provider.chat(sampleInput)).rejects.toThrow();
  });
});

describe("OpenAIProvider", () => {
  const provider = new OpenAIProvider("sk-openai-test", "gpt-4o");

  it("sends correct request to OpenAI API", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSuccessResponse(
        JSON.stringify({
          choices: [{ message: { content: structuredResponse } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        })
      )
    );

    await provider.chat(sampleInput);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(opts.headers["Authorization"]).toBe("Bearer sk-openai-test");
    const body = JSON.parse(opts.body);
    expect(body.model).toBe("gpt-4o");
  });

  it("parses structured response", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSuccessResponse(
        JSON.stringify({
          choices: [{ message: { content: structuredResponse } }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        })
      )
    );

    const result = await provider.chat(sampleInput);
    expect(result.reply).toBe("Great job with your run and meditation!");
    expect(result.proposals.ticks).toHaveProperty("h1");
    expect(result.tokenCount).toBe(150);
  });
});

describe("GeminiProvider", () => {
  const provider = new GeminiProvider("AIza-test-key", "gemini-2.0-flash");

  it("sends correct request to Gemini API", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSuccessResponse(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: structuredResponse }] } }],
          usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 40 },
        })
      )
    );

    await provider.chat(sampleInput);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(url).toContain("gemini-2.0-flash");
    expect(url).toContain("key=AIza-test-key");
  });

  it("parses structured response", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSuccessResponse(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: structuredResponse }] } }],
          usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 40 },
        })
      )
    );

    const result = await provider.chat(sampleInput);
    expect(result.reply).toBe("Great job with your run and meditation!");
    expect(result.proposals.ticks).toHaveProperty("h1");
    expect(result.tokenCount).toBe(120);
  });
});

describe("GroqProvider", () => {
  const provider = new GroqProvider("gsk-test-key", "llama-3.3-70b-versatile");

  it("sends correct request to Groq API (OpenAI-compatible)", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSuccessResponse(
        JSON.stringify({
          choices: [{ message: { content: structuredResponse } }],
          usage: { prompt_tokens: 90, completion_tokens: 45 },
        })
      )
    );

    await provider.chat(sampleInput);

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(opts.headers["Authorization"]).toBe("Bearer gsk-test-key");
    const body = JSON.parse(opts.body);
    expect(body.model).toBe("llama-3.3-70b-versatile");
  });

  it("parses structured response", async () => {
    mockFetch.mockResolvedValueOnce(
      mockSuccessResponse(
        JSON.stringify({
          choices: [{ message: { content: structuredResponse } }],
          usage: { prompt_tokens: 90, completion_tokens: 45 },
        })
      )
    );

    const result = await provider.chat(sampleInput);
    expect(result.reply).toBe("Great job with your run and meditation!");
    expect(result.proposals.ticks).toHaveProperty("h1");
    expect(result.tokenCount).toBe(135);
  });
});
