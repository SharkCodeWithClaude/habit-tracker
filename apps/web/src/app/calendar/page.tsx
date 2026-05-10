"use client";

import { useState, useEffect, useCallback } from "react";
import type { CalendarDay, HeatmapEntry } from "@habit-tracker/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const HABIT_COLORS = [
  "#e63946", "#f4a261", "#2a9d8f", "#264653", "#e76f51",
  "#6a4c93", "#1982c4", "#8ac926", "#ff595e", "#ffca3a",
  "#6a994e", "#bc4749", "#577590", "#f9844a", "#43aa8b",
];

function getMonthStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  const date = new Date(year, month - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  return (d.getDay() + 6) % 7; // Monday = 0
}

export default function CalendarPage() {
  const [month, setMonth] = useState(() => getMonthStr(new Date()));
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = useCallback(async (m: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/habits/calendar?month=${m}`, { headers });
      if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
      const data = await res.json();
      setDays(data.days);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load calendar");
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHeatmap = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/habits/heatmap?weeks=18`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      setHeatmap(data.heatmap);
    } catch {
      // heatmap is non-critical
    }
  }, []);

  useEffect(() => {
    fetchCalendar(month);
    fetchHeatmap();
  }, [month, fetchCalendar, fetchHeatmap]);

  function prevMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setMonth(getMonthStr(d));
  }

  function nextMonth() {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m, 1);
    setMonth(getMonthStr(d));
  }

  const startOffset = days.length > 0 ? getDayOfWeek(days[0].date) : 0;

  return (
    <div style={styles.container}>
      <nav style={styles.sidebar}>
        <div style={styles.sidebarTitle}>Habits</div>
        <a href="/" style={styles.navLink}>Today</a>
        <a href="/calendar" style={{ ...styles.navLink, ...styles.navLinkActive }}>Calendar</a>
        <a href="/review" style={styles.navLink}>Review</a>
      </nav>

      <main style={styles.main}>
        <header style={styles.header}>
          <button onClick={prevMonth} style={styles.navBtn} aria-label="Previous month">&larr;</button>
          <h1 style={styles.monthTitle}>{getMonthLabel(month)}</h1>
          <button onClick={nextMonth} style={styles.navBtn} aria-label="Next month">&rarr;</button>
        </header>

        {error && <p style={styles.error}>{error}</p>}

        {loading ? (
          <p style={styles.loading}>Loading...</p>
        ) : (
          <section style={styles.gridSection}>
            <div style={styles.weekdayRow}>
              {WEEKDAYS.map((w) => (
                <div key={w} style={styles.weekdayCell}>{w}</div>
              ))}
            </div>
            <div style={styles.grid}>
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} style={styles.emptyCell} />
              ))}
              {days.map((day) => (
                <a
                  key={day.date}
                  href={`/day/${day.date}`}
                  style={styles.dayCell}
                >
                  <span style={styles.dayNumber}>
                    {parseInt(day.date.split("-")[2], 10)}
                  </span>
                  {day.completions.length > 0 && (
                    <div style={styles.dots}>
                      {day.completions.slice(0, 5).map((c, i) => (
                        <span
                          key={c.habitId}
                          style={{
                            ...styles.dot,
                            backgroundColor: HABIT_COLORS[i % HABIT_COLORS.length],
                          }}
                        />
                      ))}
                    </div>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}

        {heatmap.length > 0 && (
          <section style={styles.heatmapSection}>
            <h2 style={styles.heatmapTitle}>Heatmap (18 weeks)</h2>
            {heatmap.map((entry, idx) => (
              <div key={entry.habitId} style={styles.heatmapRow}>
                <div style={styles.heatmapLabel}>
                  {entry.habitEmoji} {entry.habitName}
                </div>
                <div style={styles.heatmapCells}>
                  {generateHeatmapCells(entry.days, HABIT_COLORS[idx % HABIT_COLORS.length])}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function generateHeatmapCells(
  days: { date: string; value: number }[],
  color: string
) {
  const today = new Date();
  const cells: React.ReactNode[] = [];
  const daySet = new Map(days.map((d) => [d.date, d.value]));

  for (let i = 18 * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const value = daySet.get(dateStr);
    cells.push(
      <span
        key={dateStr}
        title={dateStr}
        style={{
          ...styles.heatmapCell,
          backgroundColor: value ? color : "var(--heatmap-empty, #ebedf0)",
          opacity: value ? Math.min(0.4 + value * 0.2, 1) : 1,
        }}
      />
    );
  }
  return cells;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  sidebar: {
    width: "200px",
    padding: "24px 16px",
    borderRight: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  sidebarTitle: {
    fontWeight: 700,
    fontSize: "18px",
    marginBottom: "16px",
  },
  navLink: {
    display: "block",
    padding: "8px 12px",
    borderRadius: "6px",
    textDecoration: "none",
    color: "#374151",
    fontSize: "14px",
  },
  navLinkActive: {
    backgroundColor: "#f3f4f6",
    fontWeight: 600,
  },
  main: {
    flex: 1,
    padding: "24px 32px",
    maxWidth: "800px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  monthTitle: {
    fontSize: "24px",
    fontWeight: 600,
    margin: 0,
    flex: 1,
    textAlign: "center",
  },
  navBtn: {
    background: "none",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: "16px",
  },
  error: {
    color: "#dc2626",
    padding: "12px",
    backgroundColor: "#fef2f2",
    borderRadius: "6px",
  },
  loading: {
    color: "#6b7280",
    textAlign: "center",
    padding: "48px",
  },
  gridSection: {
    marginBottom: "48px",
  },
  weekdayRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
    marginBottom: "8px",
  },
  weekdayCell: {
    textAlign: "center",
    fontSize: "12px",
    fontWeight: 600,
    color: "#6b7280",
    padding: "4px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "4px",
  },
  emptyCell: {
    aspectRatio: "1",
  },
  dayCell: {
    aspectRatio: "1",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "6px",
    border: "1px solid #f3f4f6",
    textDecoration: "none",
    color: "#1f2937",
    gap: "2px",
    padding: "4px",
    transition: "background-color 0.1s",
  },
  dayNumber: {
    fontSize: "14px",
    fontWeight: 500,
  },
  dots: {
    display: "flex",
    gap: "2px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
  },
  heatmapSection: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: "24px",
  },
  heatmapTitle: {
    fontSize: "18px",
    fontWeight: 600,
    marginBottom: "16px",
  },
  heatmapRow: {
    marginBottom: "12px",
  },
  heatmapLabel: {
    fontSize: "13px",
    fontWeight: 500,
    marginBottom: "4px",
  },
  heatmapCells: {
    display: "flex",
    flexWrap: "wrap",
    gap: "2px",
  },
  heatmapCell: {
    width: "10px",
    height: "10px",
    borderRadius: "2px",
  },
};
