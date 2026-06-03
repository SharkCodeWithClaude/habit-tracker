"use client";

import * as React from "react";
import Icon from "./Icon";

export interface InlineChecklistProps {
  onCreateHabit: (name: string) => Promise<unknown>;
}

export function InlineChecklist({ onCreateHabit }: InlineChecklistProps) {
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    await onCreateHabit(trimmed);
    setName("");
    setSaving(false);
    setAdding(false);
  };

  if (!adding) {
    return (
      <button className="otr-inline-add" onClick={() => setAdding(true)}>
        <Icon.Plus style={{ width: 14, height: 14 }} />
        <span>New habit</span>
      </button>
    );
  }

  return (
    <form className="otr-inline-add-form" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className="otr-inline-add-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Habit name…"
        disabled={saving}
        onKeyDown={(e) => { if (e.key === "Escape") setAdding(false); }}
      />
      <button type="submit" className="otr-btn-sm" disabled={!name.trim() || saving}>
        Add
      </button>
      <button type="button" className="otr-btn-sm otr-btn-ghost" onClick={() => setAdding(false)}>
        Cancel
      </button>
    </form>
  );
}
