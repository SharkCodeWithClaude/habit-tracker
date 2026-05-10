import type { ChatInput, ChatOutput } from "@habit-tracker/shared";

export interface InferenceProvider {
  chat(input: ChatInput): Promise<ChatOutput>;
}
