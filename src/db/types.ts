export interface Habit {
  id: number;
  name: string;
  created_at: string;
  archived_at: string | null;
  sort_order: number;
}

export interface HabitWithStatus {
  id: number;
  name: string;
  done: boolean;
}

export interface DayRecord {
  date: string;
  note: string;
  intention: string;
  habits: HabitWithStatus[];
}

export interface HeatmapDay {
  date: string;
  done: boolean;
}

export interface HabitHeatmapRow {
  habitId: number;
  habitName: string;
  total30: number;
  bestStreak: number;
  weeks: HeatmapDay[][];
}

export interface WeekDay {
  date: string;
  dayLetter: string;
  dayNum: number;
  isToday: boolean;
}

export interface WeekHabitStat {
  habitId: number;
  habitName: string;
  done: number;
  days: boolean[];
}

export interface WeeklyReviewData {
  days: WeekDay[];
  habits: WeekHabitStat[];
  totalCompletions: number;
  possibleCompletions: number;
  pct: number;
  bestHabit: WeekHabitStat | null;
  worstHabit: WeekHabitStat | null;
  reflection: string;
  weekEndDate: string;
}
