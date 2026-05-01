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
    <div className="notes-block">
      <div className="block-label">
        <span className="prompt-arrow">&rarr;</span> Notes
      </div>
      <textarea
        ref={ref}
        className="notes-input"
        defaultValue={defaultValue}
        onBlur={handleBlur}
        placeholder="anything worth remembering..."
        rows={10}
      />
    </div>
  );
}
