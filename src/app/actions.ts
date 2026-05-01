"use server";

import { revalidatePath } from "next/cache";
import { storage } from "@/db/storage";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export async function toggleHabit(habitId: number, date?: string) {
  const d = date ?? getToday();
  storage.toggleHabitForDate(habitId, d);
  revalidatePath("/");
}

export async function saveNote(note: string, date?: string) {
  const d = date ?? getToday();
  storage.setDayNote(d, note);
  revalidatePath("/");
}

export async function createHabit(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name?.trim()) return;
  storage.createHabit(name.trim());
  revalidatePath("/");
  revalidatePath("/manage");
}

export async function archiveHabit(habitId: number) {
  storage.archiveHabit(habitId);
  revalidatePath("/");
  revalidatePath("/manage");
}
