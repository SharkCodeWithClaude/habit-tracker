"use client";

import { useRef } from "react";
import { saveIntention } from "../actions";

interface IntentionTextareaProps {
  defaultValue: string;
  date?: string;
}

export function IntentionTextarea({ defaultValue, date }: IntentionTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  async function handleBlur() {
    const value = ref.current?.value ?? "";
    await saveIntention(value, date);
  }

  return (
    <div className="intention-block">
      <div className="block-label">
        <span className="prompt-arrow">&rarr;</span> The great thing I will do today
      </div>
      <textarea
        ref={ref}
        className="intention-input"
        defaultValue={defaultValue}
        onBlur={handleBlur}
        placeholder="write your one intention here..."
        rows={2}
      />
    </div>
  );
}
