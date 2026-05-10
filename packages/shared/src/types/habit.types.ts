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
