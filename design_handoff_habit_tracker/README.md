# Handoff: Habit Tracker (Bullet Journal)

## Overview
A pen-on-paper habit tracker styled like a bullet journal. The user logs a daily intention, checks off habits with hand-drawn ink marks, leaves freeform notes, browses history through a monthly calendar + per-habit heatmap, and reviews their week on a dedicated review page.

## About the Design Files
The files in this bundle (`Habit Tracker.html` + the `.jsx` modules) are **design references created in HTML** — a working prototype showing the intended look, layout, and behavior. They are **not** production code to copy directly.

Your task is to **recreate these designs in the target codebase's existing environment** (e.g. React + your design system, Next.js, React Native, SwiftUI, etc.) using its established patterns, component primitives, routing, and state management. If the project has no framework yet, pick the most appropriate one and implement there.

## Fidelity
**High-fidelity.** The mocks have final colors, typography, spacing, animations, and interactions. Recreate pixel-faithfully against the design tokens listed below — but apply your codebase's existing component primitives (Button, Tabs, Textarea, etc.) where they exist, rather than re-implementing chrome from scratch.

## Architecture (3 views, top-level tabs)

A persistent top nav (centered tabs in a pill, on a dot-grid notebook page) switches between three views:

1. **Today** — the focused daily page (default)
2. **Calendar** — month grid + per-habit GitHub-style heatmap
3. **Weekly review** — last 7 days summary, per-habit bars, reflection prompt

The week strip and weekly review are intentionally **NOT** on the Today page — they live only on the Weekly Review tab so the daily page stays distraction-free.

---

## Screens

### 1. Today

**Layout** — single notebook page (max-width 1280px), header on top, then daily intention full-width, then a 2-column split (1.05fr / 1fr) for Habits | Notes.

- **Header**: Day name + date + handwritten scribble underline; right side is empty (nav lives at the top of the notebook).
- **Daily intention** (full width, label `→ The great thing I will do today`): a 2-row textarea, transparent background, dashed bottom border, 26px Caveat handwriting font.
- **Habits column**:
  - Label `→ Habits   <count> / <total>` (count right-aligned, italic 13px Kalam)
  - Habit rows: `[InkCheckbox] [habit name + animated ink strikethrough when done] [category color dot] [highlighter streak chip]`
  - Each row separated by a 1px solid `--rule` divider, 10px vertical padding
  - Streak chip: highlighter-yellow background `rgba(244,215,92,0.45)`, irregular border-radius `4px 12px 4px 10px`, rotated -1.5°, shows `<num>d`
  - "+ add another habit…" placeholder row at the bottom (italic 50% opacity)
- **Notes column**: 22px Caveat textarea on ruled lines (`linear-gradient(to bottom, transparent 27px, var(--rule) 27px, var(--rule) 28px, transparent 28px)` with `28px` row height — matches the line-height exactly).

### 2. Calendar

**Layout** — two-page spread (left: month grid, right: heatmap).

- **Left page**:
  - Month name + year + scribble
  - Page-flip nav: `[◀ circular button] flip page [▶ circular button]`
  - Month grid: 7-col grid with 1px gap on `--rule` background (so cells look like graph-paper squares). Each cell:
    - Day number top-left (Caveat 18px)
    - Bottom: 3-col grid of 6×6 dot pips, one per habit, filled with ink if done that day, empty circle (1px border `ink + '55'`) otherwise
    - Today cell: hand-drawn dashed ellipse circling it (SVG, `stroke-dasharray: 2 1.5`)
    - Future cells dimmed to 40% opacity
  - Below grid: legend listing all habits in 2 columns
  - **Page-flip animation** on month change: 3D rotateY transform, 0.55s, with the paper flipping to the side and snapping back. Two keyframes (`flipNext` / `flipPrev`) — 0% rotate(0), 50% rotate(-90°)+translate(-30px), 51% rotate(90°)+translate(30px), 100% rotate(0). State: lock during flip, swap month at 280ms, unlock at 560ms.

- **Right page**:
  - Header `→ Last 18 weeks   heatmap by habit`
  - Per-habit row: name + category dot on the left, stats `<n>/30d  <n>best` on the right
  - Heatmap: 18 columns × 7 rows of cells. Each cell is an aspect-1 square — done days render an ink dot (slightly wobbly SVG circle, see `InkDot` in `checkbox.jsx`); empty days render a 4px gray dot
  - Axis labels under: `~4 months ago` … `today`

### 3. Weekly review

**Layout** — single notebook page.

- Header: "Weekly review" + "last 7 days · ending <date>" + scribble.
- **4-up summary cards** at top — each is a `border: 1.5px solid var(--ink)` box with a slight rotation (-0.3°, 0.4°, -0.2°, 0.5°) for hand-pasted feel:
  1. Overall completion % (huge Caveat number + small `%`)
  2. Total checks `n / total` (Caveat)
  3. Most consistent habit name + `<n>/7`
  4. Needs-love habit name + `<n>/7`
- **2-column section**:
  - Left: "This week, day by day" — 7 day columns, each with day-letter + date number + a vertical track of tiny check svgs (10×10) per habit, or a 4px gray dot if undone. Today's column has a yellow highlighter background.
  - Right: "Per habit" — for each habit, a row: `[name + cat dot] [7-cell bar with hand-drawn ink-block fills for completed days] [n/7]`. The fills use a quadrilateral SVG path with slight vertical jitter to look like uneven ink.
- **Reflection prompt** at the bottom — same ruled textarea pattern as Notes.

---

## Interactions

- **Tap habit checkbox**: animates an ink check stroke (SVG path with `stroke-dasharray: 60` → `0`, 0.35s ease-out). Habit name gets a hand-drawn strikethrough that scales-in horizontally (`transform: scaleX(0)→1 rotate(-1deg)`, 0.3s).
- **Type in intention/note/reflection**: persists immediately; updates `day_notes.updated_at`.
- **Tab switch**: hard swap, no transition. The persistent top nav stays in place.
- **Calendar prev/next**: triggers `flipNext` / `flipPrev` keyframe animation; month state changes mid-animation so the new month appears as the page rotates back in.
- **Tweaks panel** (bottom-right floating): single tweak — ink color. Picker + 6 preset swatches (Black / Blue / Teal / Sepia / Crimson / Forest). The selected color cascades to every stroke, dot, rule line, and divider via CSS variables (see `--ink` / `--ink-soft` / `--dot` / `--rule`). Apply this in code with a small color-derive effect that splits hex → rgb and writes the four variables.

---

## State / Data Model

The user's authoritative SQL schema:

```sql
CREATE TABLE habits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  archived_at DATETIME NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE habit_logs (
  habit_id INTEGER NOT NULL REFERENCES habits(id),
  date     TEXT    NOT NULL,         -- YYYY-MM-DD (local date, not UTC)
  done     INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (habit_id, date)
);

CREATE TABLE day_notes (
  date       TEXT PRIMARY KEY,        -- YYYY-MM-DD
  note       TEXT NOT NULL DEFAULT '',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Recommended additions** (the prototype assumes these):

1. Add an `intention TEXT NOT NULL DEFAULT ''` column to `day_notes`. The "great thing I will do today" is conceptually distinct from end-of-day notes.
2. Add `category TEXT` and `color TEXT` columns to `habits` for the category dots/colors.
3. Add a `weekly_reviews(week_start TEXT PRIMARY KEY, reflection TEXT, updated_at DATETIME)` table to persist the reflection on the Weekly Review tab.

**Date keying — IMPORTANT**: always key by **local** date `YYYY-MM-DD`, never `toISOString().slice(0,10)` (which drifts by ±1 day in non-UTC timezones). Use a helper like:
```js
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
```

**Client state shape used in prototype**:
- `habits[]` — sorted by `sort_order`, filter out `archived_at != null`
- `habit_logs` — `{ "<habitId>|<date>": true }` (presence = done)
- `day_notes` — `{ "<date>": { note, intention, updated_at } }`

**Streak calculation**: walk backwards day-by-day from today; count consecutive `done` days. If today is undone, skip today and start at yesterday (don't penalize a streak before the day is over).

---

## Design Tokens

```css
--paper:        #fafaf3;   /* notebook page */
--paper-shade:  #f3f1e4;
--paper-edge:   #e8e3cf;
--ink:          #161a2c;   /* default; user-tweakable */
--ink-soft:     rgba(ink, 0.6);
--dot:          rgba(ink, 0.16);   /* dot-grid dots */
--rule:         rgba(ink, 0.12);   /* ruled lines, dividers */
--hl:           #f4d75c;   /* highlighter accent */

/* Desk surface */
background: radial-gradient(ellipse at top, #e6dfc8, #cfc6ad 80%);

/* Category colors */
body:        #b8423a (red)
mind:        #2d5a8a (blue)
soul:        #5a7a3a (green)
discipline:  #8a5a2d (sepia)
```

**Ink presets** (Tweaks): Black `#161a2c`, Blue `#1d3a7a`, Teal `#1a4d4a`, Sepia `#5a3a1f`, Crimson `#7a1f2a`, Forest `#2a4a2a`.

**Typography**:
- Caveat (Google Fonts) — handwriting display: 400/500/600/700
- Kalam (Google Fonts) — body / labels: 300/400/700
- Use Caveat for: dates, headings, numbers, intention/note textareas, streak chips, day letters
- Use Kalam for: habit names, small labels, helper text

**Type scale**:
- Date big: 44px Caveat 700
- Section labels: 22px Caveat 600
- Habit name: 19px Kalam 400
- Stat number: 42px Caveat 700
- Body / label-meta: 13px Kalam 300 italic

**Spacing**: 4 / 6 / 8 / 12 / 14 / 18 / 22 / 28 / 32 / 36 / 44 / 48px (used throughout — no formal scale, but stays in this bracket).

**Borders / radii**:
- Pages: 4px radius, deep multi-layer shadow `0 1px 0 rgba(255,255,255,0.6) inset, 0 30px 60px -20px rgba(0,0,0,0.35), 0 8px 20px -8px rgba(0,0,0,0.2)`
- Pill buttons / nav tabs: 999px
- Streak chip: irregular `4px 12px 4px 10px` (looks hand-drawn)
- Stat cards: 6px radius

**Paper texture**: dot-grid via `radial-gradient(circle at 1px 1px, var(--dot) 1px, transparent 1.5px)` at `22px 22px`. SVG noise overlay at 50% opacity, `multiply` blend mode (see CSS).

**Spine shadow** (calendar view, two-page spread only): vertical gradient overlay at the center of the spread.

---

## Hand-drawn elements (re-implement these as components)

- **InkCheckbox** (`checkbox.jsx`): SVG box with per-instance jitter via a seeded sin-based RNG (every corner offset by ±0.8px); when checked, draws a quadratic-curve check path with `strokeDasharray: 60 / strokeDashoffset: 60 → 0` animation.
- **InkDot**: SVG circle with seeded jitter and a smaller secondary "ink pool" circle at high intensity for variety.
- **Scribble**: a wavy SVG underline using 9 sine-based points — used under page headers.
- **Strikethrough**: pseudo-element bar that scales horizontally with a slight `rotate(-1deg)`.

These give the design its character — don't replace them with plain checkboxes/dots/lines.

---

## Responsive

- `>880px`: full layout as described.
- `≤880px`: collapse all 2-column sections to 1 column. Calendar 2-page spread becomes stacked. 4-up review summary becomes 2-up. Notebook nav stacks (title above tabs).
- `≤480px`: tighter spacing, smaller weekday letters and review-row columns. Nav-tab font 16px.

---

## Files in this bundle

- `Habit Tracker.html` — entry point with all CSS, top nav, view switching, tweaks panel
- `data.jsx` — seeded data + normalized state shape + `dateKey` / `logKey` helpers
- `checkbox.jsx` — `InkCheckbox`, `InkDot`, `Scribble` components
- `list-view.jsx` — Today page
- `calendar-view.jsx` — Calendar page (month grid + heatmap + page-flip)
- `review-view.jsx` — Weekly review page
- `tweaks-panel.jsx` — floating tweaks panel (you can drop this — it's prototype chrome, not part of the product)

When recreating, pull these into your codebase as proper components/routes; treat the JSX in this bundle as reference for structure and styling, not as files to import directly.
