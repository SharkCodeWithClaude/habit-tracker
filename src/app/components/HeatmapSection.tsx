"use client";

import { useState } from "react";
import { habitColor, HEATMAP_FILL } from "../habit-colors";
import type { HabitHeatmapRow } from "@/db/types";

const MONTH_OPTIONS = [2, 3, 4, 6, 9, 12];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function isFuture(dateStr: string, todayStr: string): boolean {
  return dateStr > todayStr;
}

function getMonth(dateStr: string): number {
  return parseInt(dateStr.split("-")[1], 10) - 1;
}

interface HeatmapSectionProps {
  todayDate: string;
  rows: HabitHeatmapRow[];
}

export function HeatmapSection({ todayDate, rows }: HeatmapSectionProps) {
  const [monthsToShow, setMonthsToShow] = useState(4);

  if (rows.length === 0) return null;

  const cols = Math.ceil(monthsToShow * 4.345);

  return (
    <div className="page page-right">
      <div className="block-label" style={{ marginBottom: 10 }}>
        <span className="prompt-arrow">&rarr;</span> Last {monthsToShow} month{monthsToShow !== 1 ? "s" : ""}
        <span className="label-meta">filled = done &middot; empty = missed</span>
      </div>

      <div className="months-filter">
        <span className="months-filter-label">show:</span>
        {MONTH_OPTIONS.map((n) => (
          <button
            key={n}
            className={`months-chip${monthsToShow === n ? " active" : ""}`}
            onClick={() => setMonthsToShow(n)}
          >
            {n}m
          </button>
        ))}
      </div>

      <div className="heatmap-list">
        {rows.map((row) => {
          const visibleWeeks = row.weeks.slice(-cols);
          const monthTicks = visibleWeeks.map((wk) => getMonth(wk[0].date));
          const color = habitColor(row.habitId);

          return (
            <div key={row.habitId} className="heatmap-row">
              <div className="heatmap-row-head">
                <div className="heatmap-name">
                  <span className="cat-dot" style={{ background: color }} />
                  {row.habitName}
                </div>
                <div className="heatmap-stats">
                  <span>
                    <b>{row.total30}</b>
                    <i>/30d</i>
                  </span>
                  <span>
                    <b>{row.bestStreak}</b>
                    <i>best</i>
                  </span>
                </div>
              </div>
              <div className="heatmap-body">
                <div className="heatmap-day-labels">
                  {DAY_LABELS.map((d, i) => (
                    <div key={i} className="hm-day-label">
                      {i % 2 === 1 ? d : ""}
                    </div>
                  ))}
                </div>
                <div className="heatmap-grid-wrap">
                  <div
                    className="heatmap-month-row"
                    style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                  >
                    {monthTicks.map((m, ci) => {
                      const showLabel = ci === 0 || monthTicks[ci - 1] !== m;
                      return (
                        <div key={ci} className="hm-month-tick">
                          {showLabel ? MONTH_SHORT[m] : ""}
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className="heatmap-grid"
                    style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                  >
                    {visibleWeeks.map((week, ci) => (
                      <div key={ci} className="heatmap-col">
                        {week.map((cell, ri) => {
                          const future = isFuture(cell.date, todayDate);
                          const done = cell.done && !future;
                          return (
                            <div
                              key={ri}
                              className={`hm-cell${future ? " future" : ""}${done ? " done" : ""}`}
                              style={done ? { background: HEATMAP_FILL, borderColor: HEATMAP_FILL } : undefined}
                              title={`${cell.date} — ${done ? "done" : future ? "future" : "missed"}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="heatmap-axis">
        <span>~{monthsToShow} month{monthsToShow !== 1 ? "s" : ""} ago</span>
        <span>today &rarr;</span>
      </div>
    </div>
  );
}
