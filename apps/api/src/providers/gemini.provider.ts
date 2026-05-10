import type { ChatInput, ChatOutput } from "@habit-tracker/shared";
import type { InferenceProvider } from "./inference.provider.js";
import { buildSystemPrompt, buildMessages } from "./system-prompt.js";
import { parseStructuredResponse } from "./parse-response.js";

const DEFAULT_MODEL = "gemini-2.0-flash";

export class GeminiProvider implements InferenceProvider {
  constructor(
    private apiKey: string,
    private model: string = DEFAULT_MODEL
  ) {}

  async chat(input: ChatInput): Promise<ChatOutput> {
    const systemPrompt = buildSystemPrompt(input);
    const messages = buildMessages(input);

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const tokenCount =
      (data.usageMetadata?.promptTokenCount ?? 0) +
      (data.usageMetadata?.candidatesTokenCount ?? 0);

    return parseStructuredResponse(text, tokenCount);
  }
}
