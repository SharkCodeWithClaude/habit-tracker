export const AI_PROVIDERS = ["claude", "gemini", "groq", "openai"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];
