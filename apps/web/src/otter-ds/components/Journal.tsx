"use client";

import * as React from "react";
import Icon from "./Icon";
import { llmInfer } from "../lib/infer";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import type { Habit, ProposalsData } from "../lib/types";

export interface JournalProps {
  value: string;
  onChange: (v: string) => void;
  onProposals: (p: ProposalsData) => void;
  habits: Habit[];
  date: Date;
  /** ms debounce before running inference */
  inferDebounceMs?: number;
}

export function Journal({
  value,
  onChange,
  onProposals,
  habits,
  date,
  inferDebounceMs = 1100,
}: JournalProps) {
  const [thinking, setThinking] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  const runInfer = async (text: string) => {
    if (!text.trim() || text.trim().length < 12) {
      onProposals({ ticks: {}, newHabits: [] });
      return;
    }
    setThinking(true);
    try {
      const res = await llmInfer(text, habits);
      onProposals(res);
    } finally {
      setThinking(false);
    }
  };

  const handleChange = (v: string) => {
    onChange(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runInfer(v), inferDebounceMs);
  };

  const onVoiceFinal = (txt: string) => {
    const sep = value && !value.endsWith(" ") && !value.endsWith("\n") ? " " : "";
    handleChange(value + sep + txt);
  };
  const { recording, interim, start, stop } = useVoiceRecorder(onVoiceFinal);

  React.useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 480) + "px";
  }, [value]);

  const dateLabel = date.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="otr-journal">
      <div className="otr-journal-prompt">
        <span>{dateLabel}</span>
        {thinking && (
          <span className="otr-thinking">
            <span className="otr-thinking-dot" /> reading your entry…
          </span>
        )}
      </div>
      <textarea
        ref={taRef}
        className="otr-journal-area"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="What did you do today? Type or speak — Otter will pick out the habits."
        spellCheck
      />
      {recording && interim && <div className="otr-interim">{interim}</div>}
      <div className="otr-journal-foot">
        <div className="otr-foot-left">
          <span>{value.length} chars</span>
          <span>Press <kbd>⌘ ⏎</kbd> to save</span>
        </div>
        <button
          className={`otr-mic-btn ${recording ? "recording" : ""}`}
          onClick={() => (recording ? stop() : start())}
          title={recording ? "Stop dictation" : "Dictate"}
        >
          {recording ? <span className="otr-mic-pulse" /> : <Icon.Mic style={{ width: 14, height: 14 }} />}
          <span>{recording ? "Listening…" : "Dictate"}</span>
        </button>
      </div>
    </div>
  );
}
