import { z } from "zod";

export const habitKindSchema = z.enum(["binary", "session"]);

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const createHabitSchema = z.object({
  name: z.string().min(1).max(200),
  emoji: z.string().max(10).default("✅"),
  kind: habitKindSchema.default("binary"),
  aliases: z.array(z.string().min(1).max(100)).optional(),
});

export const updateHabitSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  emoji: z.string().max(10).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const toggleHabitSchema = z.object({
  date: dateStringSchema,
});

export const setSessionSchema = z.object({
  date: dateStringSchema,
  value: z.number().int().min(0),
});

export const calendarQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Must be YYYY-MM format"),
});

export const heatmapQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(52).default(18),
});

export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type ToggleHabitInput = z.infer<typeof toggleHabitSchema>;
export type SetSessionInput = z.infer<typeof setSessionSchema>;
export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>;
export type HeatmapQueryInput = z.infer<typeof heatmapQuerySchema>;
