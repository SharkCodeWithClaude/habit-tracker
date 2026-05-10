import type { ChatInput, ChatOutput } from "@habit-tracker/shared";
import type { InferenceProvider } from "./inference.provider.js";
import { buildSystemPrompt, buildMessages } from "./system-prompt.js";
import { parseStructuredResponse } from "./parse-response.js";

const DEFAULT_MODEL = "gpt-4o";

export class OpenAIProvider implements InferenceProvider {
  constructor(
    private apiKey: string,
    private model: string = DEFAULT_MODEL
  ) {}

  async chat(input: ChatInput): Promise<ChatOutput> {
    const systemPrompt = buildSystemPrompt(input);
    const messages = [
      { role: "system", content: systemPrompt },
      ...buildMessages(input),
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    const tokenCount =
      (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0);

    return parseStructuredResponse(text, tokenCount);
  }
}
