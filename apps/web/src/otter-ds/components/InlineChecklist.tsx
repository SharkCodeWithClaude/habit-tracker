"use client";

import * as React from "react";
import Icon from "./Icon";
import type { Habit } from "../lib/types";

interface CreatedItem {
  id: string;
  name: string;
  emoji: string;
}

export interface InlineChecklistProps {
  onCreateHabit: (name: string) => Promise<Habit | null>;
}

export function InlineChecklist({ onCreateHabit }: InlineChecklistProps) {
  const [items, setItems] = React.useState<CreatedItem[]>([]);
  const [value, setValue] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const submit = React.useCallback(async () => {
    const name = value.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    setValue("");
    const habit = await onCreateHabit(name);
    if (habit) {
      setItems((prev) => [...prev, { id: habit.id, name: habit.name, emoji: habit.emoji }]);
    }
    setSubmitting(false);
    inputRef.current?.focus();
  }, [value, submitting, onCreateHabit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  const handleBlur = () => {
    if (value.trim()) {
      submit();
    }
  };

  return (
    <div className="otr-inline-checklist">
      {items.map((item) => (
        <div key={item.id} className="otr-habit-row" data-testid="inline-created-row">
          <div className="otr-habit-check on">
            <Icon.Check style={{ width: 12, height: 12 }} />
          </div>
          <div className="otr-habit-main">
            <span className="otr-habit-emoji">{item.emoji}</span>
            <span className="otr-habit-name">{item.name}</span>
          </div>
        </div>
      ))}
      <div className="otr-habit-row otr-inline-input-row">
        <div className="otr-habit-check">
          <Icon.Check style={{ width: 12, height: 12 }} />
        </div>
        <input
          ref={inputRef}
          data-testid="inline-habit-input"
          className="otr-inline-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Add a habit..."
          disabled={submitting}
        />
      </div>
    </div>
  );
}
