import type { AiProvider } from "@habit-tracker/shared";
import type { InferenceProvider } from "./inference.provider.js";
import { ClaudeProvider } from "./claude.provider.js";
import { GeminiProvider } from "./gemini.provider.js";
import { GroqProvider } from "./groq.provider.js";
import { OpenAIProvider } from "./openai.provider.js";

export interface ProviderConfig {
  provider: AiProvider;
  apiKey: string;
  modelName?: string | null;
}

export function createInferenceProvider(config: ProviderConfig): InferenceProvider {
  const model = config.modelName ?? undefined;

  switch (config.provider) {
    case "claude":
      return new ClaudeProvider(config.apiKey, model);
    case "gemini":
      return new GeminiProvider(config.apiKey, model);
    case "groq":
      return new GroqProvider(config.apiKey, model);
    case "openai":
      return new OpenAIProvider(config.apiKey, model);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
