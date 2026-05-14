import type { Habit, LogMap } from "./types";

export const SEED_HABITS: Habit[] = [
  { id: "1", name: "Workout",         emoji: "🏃", kind: "binary",  aliases: ["workout","run","ran","running","gym","exercise","lifted","training"] },
  { id: "2", name: "Read",            emoji: "📖", kind: "session", aliases: ["read","reading","pages","chapter","book"] },
  { id: "4", name: "Meditate",        emoji: "🧘", kind: "session", aliases: ["meditate","meditation","mindfulness","breath","sat"] },
  { id: "5", name: "Journal",         emoji: "✒️", kind: "binary",  aliases: ["journal","wrote","journaling","reflection"] },
  { id: "6", name: "No phone in bed", emoji: "🌙", kind: "binary",  aliases: ["no phone","phone free","off phone","left phone","no screen"] },
];

export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isDone = (habit: Habit, logs: LogMap, key: string): boolean => {
  const v = logs[`${habit.id}|${key}`];
  if (habit.kind === "session") return Number(v) > 0;
  return !!v;
};

export const sessionCount = (habit: Habit, logs: LogMap, key: string): number =>
  Number(logs[`${habit.id}|${key}`]) || 0;

export const computeStreak = (habit: Habit, logs: LogMap, fromKey: string): number => {
  const [y, m, d] = fromKey.split("-").map(Number);
  const cursor = new Date(y, m - 1, d);
  let s = 0;
  for (let i = 0; i < 365; i++) {
    if (isDone(habit, logs, dateKey(cursor))) {
      s++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return s;
};

/** Seed 60 days of plausible logs — useful for demos. */
export const seedLogs = (habits: Habit[]): LogMap => {
  const logs: LogMap = {};
  const today = new Date();
  habits.forEach((h, idx) => {
    const baseRate = [0.85, 0.72, 0.55, 0.7, 0.62][idx % 5];
    let streak = 0;
    for (let i = 60; i >= 1; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = dateKey(d);
      const stickiness = streak > 3 ? 0.1 : 0;
      if (Math.random() < baseRate + stickiness) {
        if (h.kind === "session") {
          logs[`${h.id}|${k}`] = Math.random() < 0.3 ? 2 : 1;
        } else {
          logs[`${h.id}|${k}`] = true;
        }
        streak++;
      } else streak = 0;
    }
  });
  return logs;
};
