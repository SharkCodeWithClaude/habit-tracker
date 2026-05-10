import { describe, it, expect } from "vitest";
import { createInferenceProvider } from "../src/providers/provider.factory.js";
import { ClaudeProvider } from "../src/providers/claude.provider.js";
import { GeminiProvider } from "../src/providers/gemini.provider.js";
import { GroqProvider } from "../src/providers/groq.provider.js";
import { OpenAIProvider } from "../src/providers/openai.provider.js";

describe("createInferenceProvider", () => {
  it("returns ClaudeProvider for 'claude' provider", () => {
    const provider = createInferenceProvider({
      provider: "claude",
      apiKey: "sk-ant-test",
    });
    expect(provider).toBeInstanceOf(ClaudeProvider);
  });

  it("returns GeminiProvider for 'gemini' provider", () => {
    const provider = createInferenceProvider({
      provider: "gemini",
      apiKey: "AIza-test",
    });
    expect(provider).toBeInstanceOf(GeminiProvider);
  });

  it("returns GroqProvider for 'groq' provider", () => {
    const provider = createInferenceProvider({
      provider: "groq",
      apiKey: "gsk-test",
    });
    expect(provider).toBeInstanceOf(GroqProvider);
  });

  it("returns OpenAIProvider for 'openai' provider", () => {
    const provider = createInferenceProvider({
      provider: "openai",
      apiKey: "sk-test",
    });
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it("passes model override to provider", () => {
    const provider = createInferenceProvider({
      provider: "claude",
      apiKey: "sk-ant-test",
      modelName: "claude-sonnet-4-20250514",
    });
    expect(provider).toBeInstanceOf(ClaudeProvider);
  });

  it("throws for unknown provider", () => {
    expect(() =>
      createInferenceProvider({
        provider: "unknown" as any,
        apiKey: "key",
      })
    ).toThrow("Unknown provider: unknown");
  });
});
