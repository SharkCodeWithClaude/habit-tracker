"use client";

import * as React from "react";
import Icon from "./Icon";
import { isDone, sessionCount, computeStreak } from "../lib/helpers";
import type { Habit, LogMap } from "../lib/types";

export interface HabitsProps {
  habits: Habit[];
  logs: LogMap;
  setLogs: React.Dispatch<React.SetStateAction<LogMap>>;
  dateK: string;
}

interface RowProps {
  habit: Habit;
  logs: LogMap;
  dateK: string;
  onToggle: (id: number) => void;
  onAddSession: (id: number) => void;
  streak: number;
}

function HabitRow({ habit, logs, dateK, onToggle, onAddSession, streak }: RowProps) {
  const done = isDone(habit, logs, dateK);
  const sessions = sessionCount(habit, logs, dateK);

  return (
    <div className={`otr-habit-row ${done ? "done" : ""}`}>
      <button
        className={`otr-habit-check ${done ? "on" : ""}`}
        onClick={() => onToggle(habit.id)}
        aria-label={done ? "Mark not done" : "Mark done"}
      >
        <Icon.Check style={{ width: 12, height: 12 }} />
      </button>
      <div className="otr-habit-main">
        <span className="otr-habit-emoji">{habit.emoji}</span>
        <span className="otr-habit-name">{habit.name}</span>
      </div>
      {streak > 0 ? (
        <span className="otr-habit-streak">
          <span aria-hidden>🔥</span>
          <span>{streak}</span>
        </span>
      ) : (
        <span className="otr-habit-streak" />
      )}
      {habit.kind === "session" ? (
        <span className="otr-session-counter">
          <span className="otr-count">
            <b>{sessions}</b> session{sessions === 1 ? "" : "s"}
          </span>
          <button className="otr-plus-btn" onClick={() => onAddSession(habit.id)} title="Add a session">
            <Icon.Plus style={{ width: 12, height: 12 }} />
          </button>
        </span>
      ) : (
        <span />
      )}
    </div>
  );
}

export function Habits({ habits, logs, setLogs, dateK }: HabitsProps) {
  const toggle = (hid: number) => {
    setLogs((l) => {
      const k = `${hid}|${dateK}`;
      const next = { ...l };
      const habit = habits.find((h) => h.id === hid);
      if (habit?.kind === "session") {
        if (next[k]) delete next[k];
        else next[k] = 1;
      } else {
        if (next[k]) delete next[k];
        else next[k] = true;
      }
      return next;
    });
  };
  const addSession = (hid: number) => {
    setLogs((l) => {
      const k = `${hid}|${dateK}`;
      return { ...l, [k]: (Number(l[k]) || 0) + 1 };
    });
  };

  const doneCount = habits.filter((h) => isDone(h, logs, dateK)).length;

  return (
    <div className="otr-habits-block">
      <div className="otr-habits-head">
        <h3>Habits</h3>
        <span className="otr-habits-progress">
          <b>{doneCount}</b> of {habits.length} today
        </span>
      </div>
      <div className="otr-habit-list">
        {habits.length === 0 && (
          <div className="otr-empty">
            No habits yet. <b>Write something</b> and Otter will suggest a few.
          </div>
        )}
        {habits.map((h) => (
          <HabitRow
            key={h.id}
            habit={h}
            logs={logs}
            dateK={dateK}
            onToggle={toggle}
            onAddSession={addSession}
            streak={computeStreak(h, logs, dateK)}
          />
        ))}
      </div>
    </div>
  );
}
