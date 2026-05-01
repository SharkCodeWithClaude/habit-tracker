# Issues

Twelve issues, ordered by dependency. Each is small enough to finish in well under a day. Paste each into GitHub as a separate issue; titles are imperative and ready as-is.

---

### #1 — Scaffold Next.js project

Run `create-next-app` with `--typescript --tailwind --app`. Add `better-sqlite3` and `@types/better-sqlite3`. Confirm `npm run dev` serves the default page. Add `data/` to `.gitignore`. Commit.

**Done when:** `npm run dev` works and the repo has a clean initial commit.

---

### #2 — Define SQLite schema and init

Create `db/schema.sql` with the three tables (`habits`, `habit_logs`, `day_notes`) per the PRD. Create `db/init.ts` that opens `data/habits.db` and runs the schema if the tables don't exist. Export a singleton `db` instance for the rest of the app to import.

**Done when:** importing `db` from anywhere creates the file on first run and is a no-op afterward.

---

### #3 — Build the storage module

Implement `db/storage.ts` with all eight functions from the PRD: `getActiveHabits`, `createHabit`, `archiveHabit`, `toggleHabitForDate`, `getDay`, `setDayNote`, `getMonth`, `getStreak`. Use prepared statements. Export `Habit` and `DayRecord` types. Write a tiny script (`scripts/smoke.ts`) that exercises each function — keep it as a manual sanity check, no test framework needed for v1.

**Done when:** smoke script runs end-to-end without errors and produces the expected output.

---

### #4 — Today view: render

Create the `/` route as a server component. Fetch `getDay(today)`. Render a textarea for the note (uncontrolled, `defaultValue`) and a list of habits with disabled checkboxes (display only). No interaction yet.

**Done when:** habits and note for today render correctly. Empty state shows when no habits exist.

---

### #5 — Today view: toggle and save

Add server actions `toggleHabit(habitId, date)` and `saveNote(date, note)` in `app/actions.ts`. Wire the checkboxes (optimistic update via `useOptimistic` or local state), and save the note on textarea blur. Confirm changes survive a page refresh.

**Done when:** toggling and editing both persist to the database.

---

### #6 — Habit manager

Add a `/manage` route (or a modal — your call). Form to add a new habit by name. List of active habits with an "Archive" button next to each. Server actions `createHabit(name)` and `archiveHabit(id)`.

**Done when:** new habits appear on Today after creation; archived habits disappear from Today and from future calendar rendering.

---

### #7 — Streak calculation

Implement `getStreak(habitId)` in `storage.ts`. The streak is the number of consecutive done-days ending today, or ending yesterday if today isn't done yet (so an unchecked today doesn't visually break a streak before bedtime). Show the number next to each habit on Today.

**Done when:** streaks render correctly across day boundaries and respect the "yesterday-tolerant" rule.

---

### #8 — Calendar view: month grid

Add a `/calendar` route. Render the current month as a 7-column grid. Each day cell shows a row of small colored dots, one per active habit, filled if done that day. Use `getMonth(year, month)`. Add `<` `>` arrows for month navigation; track the displayed month in URL search params (`?ym=2026-04`) so it survives refresh.

**Done when:** any month can be navigated to and shows accurate per-habit dots.

---

### #9 — Calendar view: day editing

Clicking a day cell opens an editor for that date — same component as Today view, parameterized by date. Server actions already accept a date, so no new actions needed. Style past/future days distinctly from today.

**Done when:** any day in any month can be edited and changes persist.

---

### #10 — App shell and view toggle

Add a header with the app name and a Today / Calendar toggle. Persist the last-selected view in `localStorage` so the app opens to whatever was last used. Make sure the header is the only navigation — keep the surface minimal.

**Done when:** toggle works, choice persists across reloads.

---

### #11 — Polish

Empty states (no habits → "Add your first habit" CTA linking to /manage). `Cmd/Ctrl+Enter` saves the note from the textarea. Subtle visual feedback on checkbox toggle (no janky spinners — the writes are fast). Sensible favicon and page title.

**Done when:** the app feels finished enough to actually use daily.

---

### #12 — README

Document install, run, where the database lives (`data/habits.db`), how to back it up (just copy the file), and how to access from a phone on the same network if desired (`next dev -H 0.0.0.0` and visit `http://<laptop-ip>:3000`).

**Done when:** a fresh clone can be running in under five minutes following only the README.
