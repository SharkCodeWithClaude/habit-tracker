# Slice 9: GitHub-Style Heatmap (Completed)

**Date:** 2026-05-01

## What Was Done

### TDD Tests (14 new tests)
- `src/db/__tests__/heatmap-storage.test.ts`:
  - `getHabitLogs`: returns empty array, filters by day range, sorted ascending
  - `getCompletionCount`: returns 0 when empty, counts within range only
  - `getBestStreak`: returns 0 when empty, 1 for single day, finds longest consecutive run, handles non-contiguous days
  - `getHeatmapData`: one row per active habit (excludes archived), correct week count, 7 days per week, marks done days, includes total30 and bestStreak stats

### Storage Layer (4 new methods)
- `getHabitLogs(habitId, days)` — returns date strings for logged days within range
- `getCompletionCount(habitId, days)` — count of completions in last N days
- `getBestStreak(habitId)` — longest consecutive streak across all history
- `getHeatmapData(weeks)` — returns `HabitHeatmapRow[]` with 18-week grids, 30-day counts, and best streaks per active habit

### New Types
- `HeatmapDay { date, done }` — single cell in the heatmap grid
- `HabitHeatmapRow { habitId, habitName, total30, bestStreak, weeks }` — one row per habit

### UI Components
- **InkDot** — SVG dot with seeded wobble jitter (matches design handoff `checkbox.jsx`)
- **HeatmapSection** — server component rendering the right page of the two-page spread: habit rows with name, cat-dot, /30d count, best streak stat, 18×7 heatmap grid with InkDot for done days and faded empty dots for missed days

### Calendar Page Changes
- Calendar now renders as a two-page spread (`calendar-spread` class)
- Left page: month grid (existing MonthGrid component)
- Right page: heatmap section (new HeatmapSection component)
- Center divider line via CSS pseudo-element
- Responsive: stacks vertically on mobile (< 880px)

### CSS
- Two-page spread styles: `.calendar-spread`, `.page-left`, `.page-right`, center divider
- Heatmap styles: `.heatmap-list`, `.heatmap-row`, `.heatmap-row-head`, `.heatmap-name`, `.cat-dot`, `.heatmap-stats`, `.heatmap-grid`, `.heatmap-col`, `.hm-cell`, `.hm-empty-dot`, `.heatmap-axis`
- Responsive breakpoints for mobile

## Test Results
- **74 tests passing** (60 existing + 14 new)
- Build clean, no TypeScript errors

## What's Next — Slice 10: Weekly Review View
- Summary cards (completion %, total checks, most consistent, needs love)
- Day-by-day strip, per-habit bars
- Reflection textarea
- Needs `weekly_reviews` table (week_start TEXT PK, reflection TEXT)
- Design reference in `design_handoff_habit_tracker/review-view.jsx`
