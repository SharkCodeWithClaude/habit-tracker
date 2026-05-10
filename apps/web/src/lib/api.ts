import type { Habit, LogMap } from "@/otter-ds/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function apiGet<T>(path: string, token?: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface ApiHabit {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  kind: "binary" | "session";
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  aliases: string[];
}

interface ApiLog {
  habitId: string;
  date: string;
  value: number;
}

export async function fetchHabits(token?: string): Promise<Habit[]> {
  const data = await apiGet<{ habits: ApiHabit[] }>("/api/habits", token);
  if (!data?.habits) return [];
  return data.habits.map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    kind: h.kind,
    aliases: h.aliases,
  }));
}

export async function fetchStreaks(token?: string): Promise<Record<string, number>> {
  const data = await apiGet<{ streaks: { habitId: string; currentStreak: number }[] }>(
    "/api/habits/streaks",
    token
  );
  if (!data?.streaks) return {};
  const map: Record<string, number> = {};
  for (const s of data.streaks) {
    map[s.habitId] = s.currentStreak;
  }
  return map;
}

export async function fetchLogsForDate(
  token: string | undefined,
  date: string
): Promise<ApiLog[]> {
  const data = await apiGet<{ logs: ApiLog[] }>(`/api/habits/logs?date=${date}`, token);
  return data?.logs ?? [];
}

export function buildLogMap(
  logs: ApiLog[],
  habits: Habit[]
): LogMap {
  const map: LogMap = {};
  const kindMap = new Map(habits.map((h) => [h.id, h.kind]));
  for (const log of logs) {
    const kind = kindMap.get(log.habitId);
    const key = `${log.habitId}|${log.date}`;
    map[key] = kind === "session" ? log.value : true;
  }
  return map;
}

export async function toggleHabit(
  token: string | undefined,
  habitId: string,
  date: string
): Promise<{ toggled: boolean } | null> {
  return apiPost<{ toggled: boolean }>(`/api/habits/${habitId}/toggle`, { date }, token);
}

export async function setSession(
  token: string | undefined,
  habitId: string,
  date: string,
  value: number
): Promise<{ log: ApiLog | null } | null> {
  return apiPatch<{ log: ApiLog | null }>(`/api/habits/${habitId}/sessions`, { date, value }, token);
}
