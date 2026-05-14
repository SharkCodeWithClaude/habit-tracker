import type { Habit, LogMap } from "otter-ds/lib/types";
import { authFetch, getStoredToken } from "./auth-fetch";

export { getStoredToken } from "./auth-fetch";

export async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const res = await authFetch(path, getStoredToken());
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await authFetch(path, getStoredToken(), { method: "POST", body });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await authFetch(path, getStoredToken(), { method: "PATCH", body });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function apiDelete(path: string): Promise<boolean> {
  try {
    const res = await authFetch(path, getStoredToken(), { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
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

export async function fetchHabits(): Promise<Habit[]> {
  const data = await apiGet<{ habits: ApiHabit[] }>("/api/habits");
  if (!data?.habits) return [];
  return data.habits.map((h) => ({
    id: h.id,
    name: h.name,
    emoji: h.emoji,
    kind: h.kind,
    aliases: h.aliases,
  }));
}

export async function fetchStreaks(): Promise<Record<string, number>> {
  const data = await apiGet<{ streaks: { habitId: string; currentStreak: number }[] }>(
    "/api/habits/streaks"
  );
  if (!data?.streaks) return {};
  const map: Record<string, number> = {};
  for (const s of data.streaks) {
    map[s.habitId] = s.currentStreak;
  }
  return map;
}

export async function fetchLogsForDate(date: string): Promise<ApiLog[]> {
  const data = await apiGet<{ logs: ApiLog[] }>(`/api/habits/logs?date=${date}`);
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
  habitId: string,
  date: string
): Promise<{ toggled: boolean } | null> {
  return apiPost<{ toggled: boolean }>(`/api/habits/${habitId}/toggle`, { date });
}

export async function setSession(
  habitId: string,
  date: string,
  value: number
): Promise<{ log: ApiLog | null } | null> {
  return apiPatch<{ log: ApiLog | null }>(`/api/habits/${habitId}/sessions`, { date, value });
}

interface ApiConversation {
  id: string;
  userId: string;
  date: string;
  startedAt: string;
  endedAt: string | null;
  tokenCount: number;
}

interface ApiMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export async function fetchActiveConversation(): Promise<ApiConversation | null> {
  const data = await apiGet<{ conversation: ApiConversation }>(
    "/api/conversations/active"
  );
  return data?.conversation ?? null;
}

export async function createConversation(date: string): Promise<ApiConversation | null> {
  const data = await apiPost<{ conversation: ApiConversation }>(
    "/api/conversations",
    { date }
  );
  return data?.conversation ?? null;
}

export async function fetchMessages(conversationId: string): Promise<ApiMessage[]> {
  const data = await apiGet<{ messages: ApiMessage[] }>(
    `/api/conversations/${conversationId}/messages`
  );
  return data?.messages ?? [];
}

export async function sendMessage(
  conversationId: string,
  content: string,
  role: "user" | "assistant"
): Promise<ApiMessage | null> {
  const data = await apiPost<{ message: ApiMessage }>(
    `/api/conversations/${conversationId}/messages`,
    { content, role }
  );
  return data?.message ?? null;
}

export async function wrapConversation(conversationId: string): Promise<boolean> {
  const data = await apiPost<{ conversation: unknown }>(
    `/api/conversations/${conversationId}/wrap`,
    {}
  );
  return data !== null;
}

export async function createHabit(
  name: string,
  emoji: string,
  kind: "binary" | "session",
  aliases: string[]
): Promise<Habit | null> {
  const data = await apiPost<{ habit: ApiHabit }>(
    "/api/habits",
    { name, emoji, kind, aliases }
  );
  if (!data?.habit) return null;
  return {
    id: data.habit.id,
    name: data.habit.name,
    emoji: data.habit.emoji,
    kind: data.habit.kind,
    aliases: data.habit.aliases,
  };
}

export interface AiConfig {
  id: string;
  provider: string;
  modelName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function fetchAiConfigs(): Promise<AiConfig[]> {
  const data = await apiGet<{ configs: AiConfig[] }>("/api/settings/ai");
  return data?.configs ?? [];
}

export async function saveAiConfig(
  provider: string,
  apiKey: string,
  modelName?: string
): Promise<AiConfig | null> {
  const data = await apiPost<{ config: AiConfig }>(
    "/api/settings/ai",
    { provider, apiKey, modelName }
  );
  return data?.config ?? null;
}

export async function deleteAiConfig(provider: string): Promise<boolean> {
  return apiDelete(`/api/settings/ai/${provider}`);
}
