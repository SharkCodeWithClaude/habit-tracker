"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildCalendarGrid,
  navigateMonth,
  formatYearMonth,
  MONTH_NAMES,
  DAY_LETTERS,
} from "./calendar-utils";
import type { DayRecord } from "@/db/types";
import type { Habit } from "@/db/types";

interface MonthGridProps {
  year: number;
  month: number;
  days: DayRecord[];
  habits: Habit[];
  todayDate: string;
}

export function MonthGrid({ year, month, days, habits, todayDate }: MonthGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [flipDir, setFlipDir] = useState<number>(0);
  const [flipping, setFlipping] = useState(false);

  const grid = buildCalendarGrid(year, month, days);

  const flip = useCallback(
    (dir: 1 | -1) => {
      if (flipping) return;
      setFlipDir(dir);
      setFlipping(true);

      setTimeout(() => {
        const next = navigateMonth(year, month, dir);
        const ym = formatYearMonth(next.year, next.month);
        router.push(`/calendar?ym=${ym}`);
      }, 280);

      setTimeout(() => {
        setFlipping(false);
        setFlipDir(0);
      }, 560);
    },
    [flipping, year, month, router],
  );

  const flipClass = flipping
    ? `flipping flip-${flipDir > 0 ? "next" : "prev"}`
    : "";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="date-big">{MONTH_NAMES[month - 1]}</div>
          <div className="date-small">{year} · monthly view</div>
        </div>
      </div>

      <div className="month-nav">
        <button
          className="month-nav-btn"
          onClick={() => flip(-1)}
          aria-label="Previous month"
        >
          <svg width="22" height="22" viewBox="0 0 22 22">
            <path
              d="M14 5 L7 11 L14 17"
              stroke="var(--ink, #161a2c)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="month-nav-label">flip page</div>
        <button
          className="month-nav-btn"
          onClick={() => flip(1)}
          aria-label="Next month"
        >
          <svg width="22" height="22" viewBox="0 0 22 22">
            <path
              d="M8 5 L15 11 L8 17"
              stroke="var(--ink, #161a2c)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className={`month-paper-wrap ${flipClass}`}>
        <div className="month-paper">
          <div className="month-grid-head">
            {DAY_LETTERS.map((d, i) => (
              <div key={i} className="month-head-cell">
                {d}
              </div>
            ))}
          </div>
          <div className="month-grid">
            {grid.flat().map((cell, i) => {
              if (!cell) {
                return <div key={`pad-${i}`} className="month-cell empty" />;
              }

              const isToday = cell.date === todayDate;
              const isFuture = cell.date > todayDate;

              return (
                <div
                  key={cell.date}
                  className={`month-cell ${isToday ? "is-today" : ""} ${isFuture ? "is-future" : ""}`}
                >
                  <div className="month-cell-num">
                    {parseInt(cell.date.split("-")[2], 10)}
                  </div>
                  {!isFuture && (
                    <div className="month-cell-marks">
                      {cell.habits.map((h) => (
                        <div
                          key={h.id}
                          className={`mc-pip ${h.done ? "done" : ""}`}
                        />
                      ))}
                    </div>
                  )}
                  {isToday && (
                    <svg
                      className="today-circle"
                      viewBox="0 0 60 60"
                      preserveAspectRatio="none"
                    >
                      <ellipse
                        cx="30"
                        cy="30"
                        rx="26"
                        ry="24"
                        fill="none"
                        stroke="var(--ink, #161a2c)"
                        strokeWidth="1.6"
                        strokeDasharray="2 1.5"
                        opacity="0.7"
                      />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="month-legend">
        {habits.map((h) => (
          <div key={h.id} className="legend-item">
            <span className="legend-pip" />
            <span className="legend-name">{h.name}</span>
          </div>
        ))}
      </div>
    </>
  );
}
