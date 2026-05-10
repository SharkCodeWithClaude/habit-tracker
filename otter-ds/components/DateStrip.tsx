"use client";

import * as React from "react";
import Icon from "./Icon";
import { dateKey, isDone } from "../lib/helpers";
import type { Habit, LogMap } from "../lib/types";

export interface DateStripProps {
  selectedKey: string;
  onSelect: (key: string) => void;
  logs: LogMap;
  habits: Habit[];
  /** how many days back to show */
  past?: number;
  /** how many days forward to show (disabled) */
  future?: number;
}

export function DateStrip({
  selectedKey,
  onSelect,
  logs,
  habits,
  past = 60,
  future = 14,
}: DateStripProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const today = React.useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const days = React.useMemo(() => {
    const out: Date[] = [];
    for (let i = -past; i <= future; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }, [today, past, future]);

  const hasActivity = (d: Date) => {
    const k = dateKey(d);
    return habits.some((h) => isDone(h, logs, k));
  };

  React.useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    const el = t.querySelector<HTMLElement>('[data-today="1"]');
    if (el) {
      const left = el.offsetLeft - t.clientWidth / 2 + el.clientWidth / 2;
      t.scrollTo({ left, behavior: "auto" });
    }
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    trackRef.current?.scrollBy({ left: dir * 280, behavior: "smooth" });
  };

  const monthName = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });

  return (
    <div className="otr-date-strip">
      <button className="otr-date-arrow" onClick={() => scrollBy(-1)} aria-label="earlier">
        <Icon.Chevron style={{ transform: "rotate(180deg)", width: 14, height: 14 }} />
      </button>
      <div className="otr-date-track-wrap">
        <div className="otr-date-track" ref={trackRef}>
          {days.map((d, i) => {
            const k = dateKey(d);
            const isToday = k === todayKey;
            const isSelected = k === selectedKey;
            const isFuture = d > today && !isToday;
            const isFirstOfMonth = d.getDate() === 1 || i === 0;
            return (
              <button
                key={k}
                data-today={isToday ? "1" : "0"}
                data-month={isFirstOfMonth ? monthName(d) : undefined}
                className={[
                  "otr-date-cell",
                  isToday ? "today" : "",
                  isSelected ? "selected" : "",
                  isFuture ? "future" : "",
                  isFirstOfMonth ? "month-edge" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => !isFuture && onSelect(k)}
                disabled={isFuture}
              >
                <span className="otr-dow">
                  {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 3)}
                </span>
                <span className="otr-dom">{d.getDate()}</span>
                <span className={`otr-dot ${hasActivity(d) ? "has" : ""}`} />
              </button>
            );
          })}
        </div>
      </div>
      <button className="otr-date-arrow" onClick={() => scrollBy(1)} aria-label="later">
        <Icon.Chevron style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}
