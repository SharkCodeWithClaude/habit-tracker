import { HabitRepository, HabitAliasRepository } from "../repositories/habit.repository.js";
import { HabitLogRepository } from "../repositories/habit-log.repository.js";
import type { Database } from "../config/database.js";
import type { HabitWithAliases, HabitStreak, CalendarDay, HeatmapEntry } from "@habit-tracker/shared";

function toHabitResponse(habit: {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  kind: string;
  sortOrder: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): Omit<HabitWithAliases, "aliases"> {
  return {
    id: habit.id,
    userId: habit.userId,
    name: habit.name,
    emoji: habit.emoji,
    kind: habit.kind as "binary" | "session",
    sortOrder: habit.sortOrder,
    archivedAt: habit.archivedAt?.toISOString() ?? null,
    createdAt: habit.createdAt.toISOString(),
    updatedAt: habit.updatedAt.toISOString(),
  };
}

function calculateStreak(dates: string[], today: string): number {
  if (dates.length === 0) return 0;

  const sorted = [...dates].sort((a, b) => (a > b ? -1 : 1));

  let streak = 0;
  let expected = today;

  for (const date of sorted) {
    if (date === expected) {
      streak++;
      expected = prevDay(expected);
    } else if (date < expected) {
      break;
    }
  }

  return streak;
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export class HabitService {
  private habitRepo: HabitRepository;
  private aliasRepo: HabitAliasRepository;
  private logRepo: HabitLogRepository;

  constructor(db: Database) {
    this.habitRepo = new HabitRepository(db);
    this.aliasRepo = new HabitAliasRepository(db);
    this.logRepo = new HabitLogRepository(db);
  }

  async create(
    userId: string,
    data: { name: string; emoji: string; kind: string; aliases?: string[] }
  ): Promise<HabitWithAliases> {
    const habit = await this.habitRepo.create({
      userId,
      name: data.name,
      emoji: data.emoji,
      kind: data.kind,
    });

    let aliases: string[] = [];
    if (data.aliases && data.aliases.length > 0) {
      const created = await this.aliasRepo.createMany(habit.id, data.aliases);
      aliases = created.map((a) => a.alias);
    }

    return { ...toHabitResponse(habit), aliases };
  }

  async list(userId: string): Promise<HabitWithAliases[]> {
    const habits = await this.habitRepo.listActive(userId);
    const habitIds = habits.map((h) => h.id);
    const allAliases = await this.aliasRepo.findByHabitIds(habitIds);

    return habits.map((h) => {
      const aliases = allAliases
        .filter((a) => a.habitId === h.id)
        .map((a) => a.alias);
      return { ...toHabitResponse(h), aliases };
    });
  }

  async update(
    userId: string,
    habitId: string,
    data: { name?: string; emoji?: string; sortOrder?: number }
  ): Promise<HabitWithAliases> {
    const habit = await this.habitRepo.findByIdAndUser(habitId, userId);
    if (!habit) {
      throw new HabitError("Habit not found", 404);
    }

    const updated = await this.habitRepo.update(habitId, data);
    const aliases = (await this.aliasRepo.findByHabitId(habitId)).map(
      (a) => a.alias
    );

    return { ...toHabitResponse(updated), aliases };
  }

  async archive(userId: string, habitId: string): Promise<HabitWithAliases> {
    const habit = await this.habitRepo.findByIdAndUser(habitId, userId);
    if (!habit) {
      throw new HabitError("Habit not found", 404);
    }

    const archived = await this.habitRepo.archive(habitId);
    const aliases = (await this.aliasRepo.findByHabitId(habitId)).map(
      (a) => a.alias
    );

    return { ...toHabitResponse(archived), aliases };
  }

  async toggle(
    userId: string,
    habitId: string,
    date: string
  ): Promise<{ toggled: boolean }> {
    const habit = await this.habitRepo.findByIdAndUser(habitId, userId);
    if (!habit) {
      throw new HabitError("Habit not found", 404);
    }

    const existing = await this.logRepo.findByHabitAndDate(habitId, date);
    if (existing) {
      await this.logRepo.deleteByHabitAndDate(habitId, date);
      return { toggled: false };
    }

    await this.logRepo.upsert(habitId, date, 1);
    return { toggled: true };
  }

  async setSession(
    userId: string,
    habitId: string,
    date: string,
    value: number
  ): Promise<{ log: { habitId: string; date: string; value: number } | null }> {
    const habit = await this.habitRepo.findByIdAndUser(habitId, userId);
    if (!habit) {
      throw new HabitError("Habit not found", 404);
    }

    if (value === 0) {
      await this.logRepo.deleteByHabitAndDate(habitId, date);
      return { log: null };
    }

    const log = await this.logRepo.upsert(habitId, date, value);
    return { log: { habitId: log.habitId, date: log.date, value: log.value } };
  }

  async getStreaks(userId: string, today: string): Promise<HabitStreak[]> {
    const habits = await this.habitRepo.listActive(userId);

    const streaks: HabitStreak[] = [];
    for (const habit of habits) {
      const logs = await this.logRepo.findByHabitOrderedDesc(habit.id);
      const dates = logs.map((l) => l.date);
      const currentStreak = calculateStreak(dates, today);
      streaks.push({ habitId: habit.id, currentStreak });
    }

    return streaks;
  }

  async getCalendar(userId: string, month: string): Promise<CalendarDay[]> {
    const habits = await this.habitRepo.listActive(userId);
    const habitIds = habits.map((h) => h.id);

    const [year, mon] = month.split("-").map(Number);
    const startDate = `${month}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

    const logs = await this.logRepo.findByHabitIdsAndDateRange(habitIds, startDate, endDate);

    const dayMap = new Map<string, { habitId: string; value: number }[]>();
    for (const log of logs) {
      const existing = dayMap.get(log.date) ?? [];
      existing.push({ habitId: log.habitId, value: log.value });
      dayMap.set(log.date, existing);
    }

    const days: CalendarDay[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const date = `${month}-${String(d).padStart(2, "0")}`;
      days.push({ date, completions: dayMap.get(date) ?? [] });
    }

    return days;
  }

  async getHeatmap(userId: string, weeks: number): Promise<HeatmapEntry[]> {
    const habits = await this.habitRepo.listActive(userId);
    const habitIds = habits.map((h) => h.id);

    const today = new Date();
    const startDate = new Date(today);
    startDate.setUTCDate(startDate.getUTCDate() - weeks * 7 + 1);
    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = today.toISOString().slice(0, 10);

    const logs = await this.logRepo.findByHabitIdsAndDateRange(habitIds, startStr, endStr);

    const habitLogMap = new Map<string, { date: string; value: number }[]>();
    for (const log of logs) {
      const existing = habitLogMap.get(log.habitId) ?? [];
      existing.push({ date: log.date, value: log.value });
      habitLogMap.set(log.habitId, existing);
    }

    return habits.map((h) => ({
      habitId: h.id,
      habitName: h.name,
      habitEmoji: h.emoji,
      days: habitLogMap.get(h.id) ?? [],
    }));
  }
}

export class HabitError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
