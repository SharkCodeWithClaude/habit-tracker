import { z } from "zod";

export const aiProviderSchema = z.enum(["claude", "gemini", "groq", "openai"]);

export const saveAiConfigSchema = z.object({
  provider: aiProviderSchema,
  apiKey: z.string().min(1),
  modelName: z.string().max(100).optional(),
});

export type SaveAiConfigInput = z.infer<typeof saveAiConfigSchema>;
