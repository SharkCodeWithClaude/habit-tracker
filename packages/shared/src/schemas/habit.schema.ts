import { z } from "zod";

export const habitKindSchema = z.enum(["binary", "session"]);

export const createHabitSchema = z.object({
  name: z.string().min(1).max(200),
  emoji: z.string().max(10).default("✅"),
  kind: habitKindSchema.default("binary"),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
