# Habit Tracker — PRD

## Goal

A personal, local web app to track daily habits and one free-text "best thing today" note. Runs on the user's laptop via `npm run dev`. Single user. SQLite for storage. Two-day build target for v1.

## Non-goals (v1)

Multi-user accounts, auth, cloud sync, native mobile app, push notifications, habit count/duration tracking, categories, tags, reminders, and editing the schema from the UI are all explicitly out of scope. Habits are yes/no only. Phone access is not a v1 promise (though the dev server can be reached over LAN if needed).

## Users

One user — the owner of the laptop the app runs on. Daily use, one or two minutes per session.

## Core experience

The app opens to **Today**. The user sees a single textarea at the top labeled "Best thing today," followed by a vertical list of active habits, each with a checkbox and a small streak number. Tapping a checkbox toggles the habit's done state for today and saves immediately. The note saves on blur. There is no submit button anywhere.

A header toggle switches between **Today** and **Calendar**. The calendar shows the current month as a grid; each day cell renders a small row of dots, one per active habit, colored when done. Clicking a day opens an editor for that day — the same UI as Today, but parameterized by date — so the user can fill in or correct any past day. Month navigation arrows sit at the top.

A separate **Manage habits** screen (modal or side route) lets the user add a new habit by name and archive an existing one. Archiving hides a habit from Today and from future calendar dots but preserves its history. There is no delete in v1; archive is the eraser.

## Data model

Three SQLite tables. Dates are stored as `YYYY-MM-DD` local-date strings — the app is single-user single-machine, so local time is the right reference and avoids timezone bugs around midnight.

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
  date     TEXT    NOT NULL,         -- YYYY-MM-DD
  done     INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (habit_id, date)
);

CREATE TABLE day_notes (
  date       TEXT PRIMARY KEY,        -- YYYY-MM-DD
  note       TEXT NOT NULL DEFAULT '',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

A row in `habit_logs` means "done." Absence means "not done." Toggle inserts or deletes — no `done = 0` rows. This keeps queries simple and the database small.

## Module design

The architecture honors the deep-module principle: a small surface area hiding real work. There is exactly one boundary that matters in v1.

**`db/storage.ts`** is the only module that knows SQL exists. It exposes a typed API and nothing else escapes:

```ts
getActiveHabits(): Habit[]
createHabit(name: string): Habit
archiveHabit(id: number): void
toggleHabitForDate(habitId: number, date: string): boolean   // returns new done state
getDay(date: string): DayRecord                              // note + per-habit done flags
setDayNote(date: string, note: string): void
getMonth(year: number, month: number): DayRecord[]
getStreak(habitId: number): number                           // consecutive days ending today/yesterday
```

Server actions are thin wrappers over these calls — one per UI verb, no business logic. UI components consume the typed objects and never construct SQL or import the db driver. If a future feature wants to swap SQLite for something else, only `storage.ts` changes.

UI breaks into four components: `TodayView`, `CalendarView`, `HabitManager`, and an `AppShell` that owns the header and the Today/Calendar toggle.

## Tech stack

**Next.js 15 (App Router)** for the framework. One repo, one process, server actions cover the backend without standing up a separate Express server — which would be wasted complexity for a single-user local app. **React 19** for UI. **better-sqlite3** for storage — synchronous, file-based, ideal for this shape of app; the database file lives at `./data/habits.db`. **Tailwind CSS** so we spend zero time on design system plumbing. **TypeScript** end-to-end so the storage module's types reach the UI without drift.

No ORM. At this scale, hand-written SQL inside the deep module is shorter and clearer than configuring Drizzle or Prisma, and the encapsulation is the same.

## Setup

```bash
npx create-next-app@latest habit-tracker --typescript --tailwind --app
cd habit-tracker
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
mkdir data
```

The schema runs on first boot (`db/init.ts` checks for `data/habits.db` and creates it if missing).

## Two-day plan

**Day 1** — scaffolding, schema, `storage.ts` with all functions, Today view fully working (read, toggle, save note), Manage habits screen.

**Day 2** — Calendar view with day-cell editing, streak calculation, view toggle, empty states, README.

## Future (post-v1, in rough order)

JSON export/import, per-habit color and icon, habit categories, markdown in day notes, phone access via LAN with PWA install, then — much later — the ambient-capture pipelines (YouTube history → skills, git activity → projects) that were the original ambition.
