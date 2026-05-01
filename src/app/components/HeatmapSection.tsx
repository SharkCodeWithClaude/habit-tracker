"use client";

import { useState } from "react";
import { InkDot } from "./InkDot";
import { habitColor } from "../habit-colors";
import type { HabitHeatmapRow } from "@/db/types";

const FILTERS = [
  { label: "1m", weeks: 4 },
  { label: "2m", weeks: 9 },
  { label: "3m", weeks: 13 },
  { label: "6m", weeks: 26 },
  { label: "9m", weeks: 39 },
  { label: "12m", weeks: 52 },
];

function isFuture(dateStr: string, todayStr: string): boolean {
  return dateStr > todayStr;
}

interface HeatmapSectionProps {
  todayDate: string;
  rows: HabitHeatmapRow[];
}

export function HeatmapSection({ todayDate, rows }: HeatmapSectionProps) {
  const [selectedWeeks, setSelectedWeeks] = useState(13);

  if (rows.length === 0) return null;

  const activeFilter = FILTERS.find((f) => f.weeks === selectedWeeks) ?? FILTERS[2];

  return (
    <div className="page page-right">
      <div className="block-label" style={{ marginBottom: 6 }}>
        <span className="prompt-arrow">&rarr;</span> Heatmap
        <span className="label-meta">by habit</span>
      </div>

      <div className="heatmap-filters">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            className={`heatmap-filter-btn${f.weeks === selectedWeeks ? " active" : ""}`}
            onClick={() => setSelectedWeeks(f.weeks)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="heatmap-list">
        {rows.map((row, hi) => {
          const visibleWeeks = row.weeks.slice(-selectedWeeks);
          return (
            <div key={row.habitId} className="heatmap-row">
              <div className="heatmap-row-head">
                <div className="heatmap-name">
                  <span className="cat-dot" style={{ background: habitColor(row.habitId) }} />
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
              <div className="heatmap-grid">
                {visibleWeeks.map((week, ci) => (
                  <div key={ci} className="heatmap-col">
                    {week.map((cell, ri) => {
                      const future = isFuture(cell.date, todayDate);
                      return (
                        <div
                          key={ri}
                          className={`hm-cell${future ? " future" : ""}${cell.done ? " done" : ""}`}
                        >
                          {!future && cell.done && (
                            <InkDot size={11} seed={hi * 7 + ci * 3 + ri} color={habitColor(row.habitId)} />
                          )}
                          {!future && !cell.done && (
                            <div className="hm-empty-dot" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="heatmap-axis">
        <span>~{activeFilter.label} ago</span>
        <span>today</span>
      </div>
    </div>
  );
}
