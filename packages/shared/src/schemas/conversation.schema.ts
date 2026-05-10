import { z } from "zod";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createConversationSchema = z.object({
  date: dateStringSchema,
});

export const createMessageSchema = z.object({
  content: z.string().min(1),
  role: z.enum(["user", "assistant"]).default("user"),
  tokenCount: z.number().int().min(0).optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
