# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm test             # Run all tests once
npm run test:watch   # Tests in watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npx tsx scripts/seed.ts  # Seed sample habits
```

Run a single test file: `npx vitest run src/db/__tests__/storage.test.ts`

## Architecture

Next.js App Router with SQLite (better-sqlite3). Server components fetch data, client components use React 19 `useOptimistic` for instant UI, server actions (`src/app/actions.ts`) handle mutations and call `revalidatePath()`.

**Data layer** (`src/db/`):
- `init.ts` — Schema, migrations, DB singleton (`getDb()`), WAL mode. Database lives at `data/habits.db` (auto-created, gitignored).
- `storage.ts` — `HabitStorage` class for habit/day CRUD operations. All SQL behind typed methods.
- `metrics.ts` — `HabitMetrics` class for derived computations: streaks, heatmaps, weekly reviews, completion counts. Uses `getStreaks()` for batch streak queries.
- `types.ts` — Shared interfaces (`Habit`, `DayRecord`, `HeatmapDay`, etc.)

**Routes** (`src/app/`):
- `(notebook)/` — Route group sharing `NotebookShell` layout with tab navigation (Today, Calendar, Review). Client-side tab switching via `ViewNav` — no full-page refresh.
- `(notebook)/page.tsx` — Today view (`force-dynamic`)
- `(notebook)/calendar/page.tsx` — Monthly grid + 18-week per-habit heatmap
- `(notebook)/review/page.tsx` — Weekly summary stats and reflection
- `day/[date]/page.tsx` — Edit any past/future day

**Shared utilities** (`src/app/`):
- `date-utils.ts` — `getToday()` for consistent YYYY-MM-DD formatting

**UI components** (`src/app/components/`):
- `InkCheckbox` — Hand-drawn SVG checkbox with seeded jitter for per-instance variation
- `DayView` — Reusable day display (shared between Today and day/[date])
- `AutosaveTextarea` — Generic blur-to-save textarea (used for intentions, notes, reflections)
- `HeatmapSection` — GitHub-style heatmap with pill chip filters

## Key Patterns

- **Habit deletion is archival**: soft delete via `archived_at` timestamp, not row removal.
- **Habit colors**: `habitColor(habitId)` cycles through a 15-color palette in `habit-colors.ts`.
- **Inline habit management**: habits are added/edited/archived directly in the Today view — no separate management page.
- **Styling**: bullet journal aesthetic using CSS variables (`--paper`, `--ink`, `--ink-soft`, `--dot`, `--rule`, `--hl`) defined in `notebook.css`. Fonts: Caveat (handwritten) + Kalam.

## Testing

Vitest with tests colocated in `__tests__/` directories. Use `setupTestDb()` from `src/db/__tests__/test-helpers.ts` for isolated test databases — it handles creation, cleanup, and returns `{ db, storage, cleanup }`. Shared date helpers (`addDays`, `todayStr`) also live there.
