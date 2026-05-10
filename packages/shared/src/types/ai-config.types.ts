import type { AiProvider } from "../constants/providers.js";

export interface AiConfigPublic {
  id: string;
  provider: AiProvider;
  modelName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
