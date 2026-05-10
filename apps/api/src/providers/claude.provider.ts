import type { ChatInput, ChatOutput } from "@habit-tracker/shared";
import type { InferenceProvider } from "./inference.provider.js";
import { buildSystemPrompt, buildMessages } from "./system-prompt.js";
import { parseStructuredResponse } from "./parse-response.js";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export class ClaudeProvider implements InferenceProvider {
  constructor(
    private apiKey: string,
    private model: string = DEFAULT_MODEL
  ) {}

  async chat(input: ChatInput): Promise<ChatOutput> {
    const systemPrompt = buildSystemPrompt(input);
    const messages = buildMessages(input);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Claude API error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      content?: { text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.[0]?.text ?? "";
    const tokenCount =
      (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0);

    return parseStructuredResponse(text, tokenCount);
  }
}
