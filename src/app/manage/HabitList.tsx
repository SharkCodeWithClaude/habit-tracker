"use client";

import { useTransition } from "react";
import { archiveHabit } from "../actions";
import type { Habit } from "@/db/types";

interface HabitListProps {
  habits: Habit[];
}

export function HabitList({ habits }: HabitListProps) {
  const [isPending, startTransition] = useTransition();

  function handleArchive(id: number) {
    startTransition(async () => {
      await archiveHabit(id);
    });
  }

  if (habits.length === 0) {
    return (
      <p className="text-gray-400 text-center py-8">
        No active habits. Add one above!
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {habits.map((habit) => (
        <li
          key={habit.id}
          className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800"
        >
          <span className="text-lg">{habit.name}</span>
          <button
            onClick={() => handleArchive(habit.id)}
            disabled={isPending}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
          >
            Archive
          </button>
        </li>
      ))}
    </ul>
  );
}
