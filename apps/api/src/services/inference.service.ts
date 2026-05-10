import type { Database } from "../config/database.js";
import type { InferenceProvider } from "../providers/inference.provider.js";
import type { ChatOutput } from "@habit-tracker/shared";
import { LocalProvider } from "../providers/local.provider.js";
import { createInferenceProvider } from "../providers/provider.factory.js";
import { HabitRepository, HabitAliasRepository } from "../repositories/habit.repository.js";
import { MessageRepository } from "../repositories/message.repository.js";
import { UserAiConfigRepository } from "../repositories/user-ai-config.repository.js";
import { decrypt } from "../lib/encryption.js";
import { ENCRYPTION_KEY } from "../config/env.js";

export class InferenceService {
  private habitRepo: HabitRepository;
  private aliasRepo: HabitAliasRepository;
  private messageRepo: MessageRepository;
  private aiConfigRepo: UserAiConfigRepository;

  constructor(private db: Database) {
    this.habitRepo = new HabitRepository(db);
    this.aliasRepo = new HabitAliasRepository(db);
    this.messageRepo = new MessageRepository(db);
    this.aiConfigRepo = new UserAiConfigRepository(db);
  }

  async infer(
    userId: string,
    conversationId: string,
    date: string
  ): Promise<ChatOutput> {
    const provider = await this.resolveProvider(userId);

    const habits = await this.habitRepo.listActive(userId);
    const habitIds = habits.map((h) => h.id);
    const allAliases = await this.aliasRepo.findByHabitIds(habitIds);

    const chatHabits = habits.map((h) => ({
      id: h.id,
      name: h.name,
      aliases: allAliases
        .filter((a) => a.habitId === h.id)
        .map((a) => a.alias),
    }));

    const messageRows = await this.messageRepo.listByConversation(conversationId);
    const messages = messageRows.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    return provider.chat({ messages, habits: chatHabits, date });
  }

  private async resolveProvider(userId: string): Promise<InferenceProvider> {
    const config = await this.aiConfigRepo.findActive(userId);
    if (!config) return new LocalProvider();

    try {
      const apiKey = decrypt(config.apiKeyEncrypted, ENCRYPTION_KEY);
      return createInferenceProvider({
        provider: config.provider as any,
        apiKey,
        modelName: config.modelName,
      });
    } catch {
      return new LocalProvider();
    }
  }
}
