"use server";

import { revalidatePath } from "next/cache";
import { storage } from "@/db/storage";
import { getToday } from "./date-utils";

function revalidateAll(date: string) {
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/review");
  revalidatePath(`/day/${date}`);
}

export async function toggleHabit(habitId: number, date?: string) {
  const d = date ?? getToday();
  storage.toggleHabitForDate(habitId, d);
  revalidateAll(d);
}

export async function saveNote(note: string, date?: string) {
  const d = date ?? getToday();
  storage.setDayNote(d, note);
  revalidateAll(d);
}

export async function saveIntention(intention: string, date?: string) {
  const d = date ?? getToday();
  storage.setDayIntention(d, intention);
  revalidateAll(d);
}

export async function createHabitInline(name: string) {
  if (!name?.trim()) return;
  storage.createHabit(name.trim());
  revalidateAll(getToday());
}

export async function updateHabitName(habitId: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    storage.archiveHabit(habitId);
  } else {
    storage.updateHabitName(habitId, trimmed);
  }
  revalidateAll(getToday());
}

export async function archiveHabit(habitId: number) {
  storage.archiveHabit(habitId);
  revalidateAll(getToday());
}

export async function saveReflection(weekEnd: string, reflection: string) {
  storage.saveReflection(weekEnd, reflection);
  revalidatePath("/review");
}
