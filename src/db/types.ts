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
  habits: HabitWithStatus[];
}
