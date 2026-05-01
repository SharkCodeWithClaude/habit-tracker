"use client";

import { useOptimistic, useTransition } from "react";
import { toggleHabit } from "../actions";

interface HabitCheckboxProps {
  habitId: number;
  name: string;
  done: boolean;
  date?: string;
  streak?: number;
}

export function HabitCheckbox({ habitId, name, done, date, streak }: HabitCheckboxProps) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const [, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      setOptimisticDone(!optimisticDone);
      await toggleHabit(habitId, date);
    });
  }

  return (
    <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
      <input
        type="checkbox"
        checked={optimisticDone}
        onChange={handleToggle}
        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
      />
      <span className={`text-lg flex-1 ${optimisticDone ? "line-through text-gray-400" : ""}`}>
        {name}
      </span>
      {streak !== undefined && streak > 0 && (
        <span className="text-sm font-medium text-orange-500 tabular-nums">
          {streak}d
        </span>
      )}
    </label>
  );
}
