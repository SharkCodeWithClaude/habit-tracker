import type { Database } from "../config/database.js";
import type { AiProvider, AiConfigPublic } from "@habit-tracker/shared";
import { UserAiConfigRepository } from "../repositories/user-ai-config.repository.js";
import { encrypt, decrypt } from "../lib/encryption.js";
import { ENCRYPTION_KEY } from "../config/env.js";

export class AiConfigService {
  private repo: UserAiConfigRepository;

  constructor(private db: Database) {
    this.repo = new UserAiConfigRepository(db);
  }

  async getConfigs(userId: string): Promise<AiConfigPublic[]> {
    const rows = await this.repo.listByUser(userId);
    return rows.map(toPublic);
  }

  async getActiveConfig(userId: string) {
    return this.repo.findActive(userId);
  }

  async saveConfig(
    userId: string,
    provider: AiProvider,
    apiKey: string,
    modelName?: string
  ): Promise<AiConfigPublic> {
    await this.repo.deactivateAll(userId);
    const apiKeyEncrypted = encrypt(apiKey, ENCRYPTION_KEY);
    const row = await this.repo.upsert({
      userId,
      provider,
      apiKeyEncrypted,
      modelName,
    });
    return toPublic(row);
  }

  async deleteConfig(userId: string, provider: AiProvider): Promise<boolean> {
    const deleted = await this.repo.deleteByUserAndProvider(userId, provider);
    return deleted !== null;
  }

  async decryptKey(encryptedKey: string): Promise<string> {
    return decrypt(encryptedKey, ENCRYPTION_KEY);
  }
}

function toPublic(row: {
  id: string;
  provider: string;
  modelName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AiConfigPublic {
  return {
    id: row.id,
    provider: row.provider as AiProvider,
    modelName: row.modelName,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
