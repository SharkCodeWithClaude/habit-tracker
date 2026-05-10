export interface WeeklyReviewStats {
  weekStart: string;
  overallCompletionPercent: number;
  habits: HabitWeekStat[];
  best: HabitWeekStat | null;
  worst: HabitWeekStat | null;
  reflection: string;
}

export interface HabitWeekStat {
  habitId: string;
  name: string;
  emoji: string;
  completedDays: number;
  totalDays: number;
  completionPercent: number;
}
