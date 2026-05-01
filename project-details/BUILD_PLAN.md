# Vertical Build Plan — Habit Tracker

## Why vertical

Horizontal builds — "all the schema first, then all the storage, then all the UI" — feel productive but produce nothing usable until the last layer lands. They also hide integration bugs until they're expensive to find.

Vertical slices flip this: each slice is a thin end-to-end column through schema → storage → server action → UI. After every slice, the app *works*, just with less in it. Bugs surface immediately, in the running app, where they can be reproduced with a click. The agent can be told "this slice is broken, here is what I did, here is what I saw" — concrete, falsifiable, fixable.

The eight slices below replace the twelve issues in `ISSUES.md`. Use whichever lens works better — the issues are good as a backlog tracker on GitHub, the slices are better as a build sequence and as prompts to an agent.

## How to drive this with an LLM agent

For each slice in order:

1. Give the agent the **PRD**, the **slice spec below**, and the **current codebase** (or branch).
2. Tell it: *"Build this slice. Do not work on anything outside its scope."*
3. Run the **acceptance test** manually — every slice has one, and every test is two or three clicks plus optionally a SQLite query.
4. If the test passes, commit and merge. Move to the next slice.
5. If it fails, give the agent a **bug report** in this exact format:

   > Slice N is failing.
   > **What I did:** [exact click sequence]
   > **What I expected:** [pulled from the slice spec]
   > **What I saw:** [actual behavior; include a screenshot or console output]
   > Fix only this. Do not refactor unrelated code.

   Keep the loop tight: one symptom, one fix, one re-test.

Slices are ordered. Slice N assumes slices 1..N-1 are merged. Within a slice, the schema/storage/UI deltas can be done in any order the agent prefers — that's an internal implementation detail. The slice as a whole is the unit of feedback.

---

## Slice 1 — See habits and toggle them for today

**User can:** open `localhost:3000`, see a seeded list of habits, click checkboxes to toggle done state for today, refresh the page, see state preserved.

**Schema delta:** create `habits` and `habit_logs` tables per PRD.

**Storage delta (`db/storage.ts`):** `getActiveHabits()`, `toggleHabitForDate(habitId, date)`, `getHabitsForDate(date)` returning `{id, name, done}[]`.

**Server actions:** `toggleHabit(habitId)` (uses today's local date implicitly).

**UI delta:** `/` route. Server component fetches habits-for-today. Client checkbox component calls the server action with optimistic update.

**Seed:** `scripts/seed.ts` inserts three habits ("read", "exercise", "no phone in bed") so there's something to look at before slice 3 lands. Run via `npx tsx scripts/seed.ts`.

**Acceptance test:**
- Delete `data/habits.db` if it exists. Run seed. Run dev server.
- Open `/` — three unchecked habits visible.
- Check two of them.
- Refresh — both still checked.
- `sqlite3 data/habits.db "SELECT * FROM habit_logs"` — two rows, both with today's date.

**Out of scope:** day notes, calendar, manage screen, streaks, archiving, view toggle.

---

## Slice 2 — Day note

**User can:** write a "best thing today" note in a textarea above the habit list. It saves on blur. Refresh preserves it.

**Schema delta:** add `day_notes` table.

**Storage delta:** `getDayNote(date)`, `setDayNote(date, note)`. Extend the today-view fetch to also return the note.

**Server actions:** `saveNote(note)`.

**UI delta:** uncontrolled textarea at the top of `/`, `defaultValue` from server, `onBlur` triggers action.

**Acceptance test:**
- Type "shipped slice 1" in the textarea, click elsewhere.
- Refresh — text is still there.
- `sqlite3 data/habits.db "SELECT * FROM day_notes"` — one row with today's date.

---

## Slice 3 — Add and archive habits

**User can:** go to `/manage`, add a new habit by name, archive an existing habit. Today view reflects changes immediately.

**Storage delta:** `createHabit(name)`, `archiveHabit(id)`. Confirm `getActiveHabits()` filters out archived.

**Server actions:** thin wrappers around the storage calls.

**UI delta:** `/manage` route with a form and a list of active habits, each with an Archive button. Header link from `/` to `/manage`.

**Acceptance test:**
- Add habit "meditate" on `/manage` — appears on `/`.
- Toggle it on `/`, then archive on `/manage`.
- "meditate" gone from `/`. `sqlite3 data/habits.db "SELECT * FROM habit_logs"` — old log row still exists.

---

## Slice 4 — Streaks

**User can:** see a small number next to each habit on Today showing its current consecutive-done streak.

**Storage delta:** `getStreak(habitId)`. **Yesterday-tolerant rule:** if today is not yet done, count consecutive done days ending yesterday. If today is done, count ending today. This prevents the streak from visibly dropping every morning before the user has logged anything.

**UI delta:** badge next to each habit name on `/`.

**Acceptance test:**
- Pick a habit. Manually insert 3 prior-day rows via SQLite, plus today.
- Streak reads 4. Uncheck today — still reads 3 (yesterday-tolerant). Delete yesterday's row — drops to 0.

---

## Slice 5 — Calendar month view

**User can:** open `/calendar`, see the current month as a 7-column grid. Each day cell shows a row of small dots, one per active habit, filled if done that day. `< >` arrows navigate months and update `?ym=YYYY-MM` so refresh preserves the month.

**Storage delta:** `getMonth(year, month)` returning `{date, habits: {id, name, done}[]}[]` for every day in the month.

**UI delta:** `/calendar` route. Day cells are not yet clickable — that's slice 6.

**Acceptance test:** toggles from slices 1, 2, 4 show up as filled dots on the right days.

---

## Slice 6 — Edit any day from the calendar

**User can:** click any day cell on `/calendar`, see the Today UI but for that date, edit checkboxes and the note, see the calendar reflect the changes when navigating back.

**Refactor:** the today component becomes `<DayView date={...} />`. `/` is `<DayView date={today} />`. The day-edit can be a route like `/day/2026-04-15` or a modal — either is fine.

**Server actions:** `toggleHabit` and `saveNote` now accept a date parameter (default today).

**Acceptance test:** click three days ago, check a habit, write a note, navigate to `/calendar`, see the dot. Navigate back to that day — note still there.

---

## Slice 7 — View toggle and last-view persistence

**User can:** toggle between Today and Calendar via a header. App opens to whichever was last used.

**UI delta:** `AppShell` layout with header containing app name and toggle. Last view written to `localStorage` on change; on root visit, if `localStorage` says calendar, redirect.

**Acceptance test:** switch to calendar, close tab, reopen `localhost:3000` → lands on calendar.

---

## Slice 8 — Polish and README

Empty state when no habits exist on `/` (CTA linking to `/manage`). `Cmd+Enter` (or `Ctrl+Enter`) blurs the textarea to trigger save. Favicon, sensible page title, README with install/run/backup/phone-access instructions.

**Acceptance test:** fresh `git clone`, follow only the README, app running and usable inside five minutes.

---

## Slice dependency map

```
1 ──► 2 ──► 3 ──► 4
              │
              └──► 5 ──► 6 ──► 7 ──► 8
```

Slices 4 and 5 both depend on 3 (need real habit CRUD to test meaningfully), but are independent of each other — useful if you ever want to parallelize, see below.

## Branch strategy

One branch per slice (`slice/1-toggle`, `slice/2-note`, ...). Merge to `main` only when the slice's acceptance test passes. This keeps `main` always shippable and gives you clean rollback points if a slice goes sideways.
