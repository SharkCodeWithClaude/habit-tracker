"use client";

import { useRef } from "react";
import { saveNote } from "../actions";

interface NoteTextareaProps {
  defaultValue: string;
  date?: string;
}

export function NoteTextarea({ defaultValue, date }: NoteTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  async function handleBlur() {
    const value = ref.current?.value ?? "";
    await saveNote(value, date);
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
        Best thing today
      </label>
      <textarea
        ref={ref}
        defaultValue={defaultValue}
        onBlur={handleBlur}
        placeholder="What was the best thing about today?"
        rows={3}
        className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
}
