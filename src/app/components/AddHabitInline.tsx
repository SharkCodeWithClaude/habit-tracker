"use client";

import { useState, useRef, useTransition } from "react";
import { createHabitInline } from "../actions";

export function AddHabitInline() {
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSubmit() {
    const value = inputRef.current?.value?.trim();
    if (!value) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await createHabitInline(value);
      if (inputRef.current) inputRef.current.value = "";
      setEditing(false);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <div className="add-habit-row" onClick={handleClick} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}>
        <span className="prompt-arrow" style={{ opacity: 0.4 }}>+</span>
        <span style={{ opacity: 0.5, fontStyle: "italic", cursor: "pointer" }}>
          add another habit...
        </span>
      </div>
    );
  }

  return (
    <div className="add-habit-row editing">
      <span className="prompt-arrow" style={{ opacity: 0.4 }}>+</span>
      <input
        ref={inputRef}
        type="text"
        className="add-habit-input"
        placeholder="habit name..."
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    </div>
  );
}
