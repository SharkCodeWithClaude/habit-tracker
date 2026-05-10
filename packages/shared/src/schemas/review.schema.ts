import { z } from "zod";

const weekDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const getWeeklyReviewSchema = z.object({
  week: weekDateSchema,
});

export const upsertReflectionSchema = z.object({
  week: weekDateSchema,
  reflection: z.string().max(5000),
});

export type GetWeeklyReviewInput = z.infer<typeof getWeeklyReviewSchema>;
export type UpsertReflectionInput = z.infer<typeof upsertReflectionSchema>;
