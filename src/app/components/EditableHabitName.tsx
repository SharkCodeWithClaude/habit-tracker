"use client";

import { useRef, useTransition } from "react";
import { updateHabitName } from "../actions";

interface EditableHabitNameProps {
  habitId: number;
  name: string;
  done: boolean;
}

export function EditableHabitName({ habitId, name, done }: EditableHabitNameProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const originalName = useRef(name);

  function handleBlur() {
    const value = inputRef.current?.value ?? "";
    if (value === originalName.current) return;

    startTransition(async () => {
      await updateHabitName(habitId, value);
      originalName.current = value;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      if (inputRef.current) inputRef.current.value = originalName.current;
      inputRef.current?.blur();
    }
  }

  return (
    <div className="habit-name-wrap">
      <input
        ref={inputRef}
        type="text"
        className="habit-name-input"
        defaultValue={name}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {done && <span className="habit-strikethrough" />}
    </div>
  );
}
