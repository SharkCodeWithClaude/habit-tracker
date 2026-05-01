"use client";

import { useRef } from "react";
import { saveReflection } from "../actions";

interface ReflectionTextareaProps {
  defaultValue: string;
  weekEnd: string;
}

export function ReflectionTextarea({ defaultValue, weekEnd }: ReflectionTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  async function handleBlur() {
    const value = ref.current?.value ?? "";
    await saveReflection(weekEnd, value);
  }

  return (
    <div className="review-prompt">
      <div className="block-label">
        <span className="prompt-arrow">&rarr;</span> Reflection
      </div>
      <textarea
        ref={ref}
        className="notes-input"
        defaultValue={defaultValue}
        onBlur={handleBlur}
        placeholder="what worked? what didn't? what to change next week?"
        rows={5}
      />
    </div>
  );
}
