# v2 Update — Heatmap upgrade + months filter

This patch updates the Calendar view's GitHub-style heatmap.

## What changed
- Heatmap cells are now **filled solid square boxes** (rounded 2px) — done = ink-filled, missed = faint outlined.
- **Day-of-week labels** (M, W, F) on the **left** of each habit's grid.
- **Month ticks** (Jan, Feb, …) along the **top** of each row.
- **NEW: Months filter** — pill chips above the heatmap let you choose **2m / 3m / 4m / 6m / 9m / 12m**. The grid, month ticks, and "X months ago" axis label all update reactively. Default is 4 months.
- Cells scale up 25% on hover with a tooltip showing the date + status.

## Files in this patch
- `calendar-view.jsx` — replaces the previous file
- `Habit Tracker.html` — replaces the previous file (added `.months-filter`, `.months-chip` CSS + reworked heatmap CSS)

No other files changed.

## Where to put these
**Overwrite in place** in your existing `design_handoff_habit_tracker/` folder. One canonical handoff folder = no ambiguity for Claude Code about which version is current. Commit with a message like `design: heatmap filter + filled box cells`.
