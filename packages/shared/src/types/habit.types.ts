export interface Habit {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  kind: "binary" | "session";
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HabitWithAliases extends Habit {
  aliases: string[];
}

export interface HabitStreak {
  habitId: string;
  currentStreak: number;
}
