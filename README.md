# Habit Tracker

A personal daily habit tracker styled as a hand-drawn bullet journal. Runs locally on your machine with SQLite storage.

## Features

- **Today view** -- daily intention, habit checklist with hand-drawn ink checkboxes, streak badges, and freeform notes
- **Calendar view** -- monthly grid with per-day completion dots, page-flip navigation, and an 18-week GitHub-style heatmap per habit with /30d counts and best streak stats
- **Weekly Review** -- summary cards (completion %, total checks, most/least consistent habits), day-by-day strip, per-habit bar chart, and a reflection textarea
- **Inline habit management** -- add habits with the "+" row, edit names by clicking, archive by clearing the name. No separate management screen
- **Smooth navigation** -- client-side tab switching between Today, Calendar, and Review with no full-page refresh

## Tech Stack

- Next.js 15 (App Router, server components, server actions)
- React 19 with `useOptimistic` for instant UI feedback
- better-sqlite3 (synchronous, file-based SQLite)
- TypeScript end-to-end
- Tailwind CSS 4
- Vitest (87 tests)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed sample habits

```bash
npx tsx scripts/seed.ts
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |

## Project Structure

```
src/
  db/
    init.ts          -- schema, migrations, DB singleton
    storage.ts       -- deep module: all SQL behind typed functions
    types.ts         -- shared TypeScript interfaces
  app/
    (notebook)/      -- route group with shared notebook shell
      page.tsx       -- Today view
      calendar/      -- Calendar + heatmap view
      review/        -- Weekly Review view
    day/[date]/      -- Edit any past day
    components/      -- shared UI components
    actions.ts       -- server actions
    view-persistence.ts -- localStorage view toggle
    notebook.css     -- bullet journal design tokens and styles
```

## Design

The UI follows a bullet journal aesthetic with:
- Caveat and Kalam Google Fonts for a handwritten feel
- Dot-grid paper texture with paper noise overlay
- Hand-drawn SVG checkboxes with seeded jitter for per-instance variation
- Ink-style design tokens (`--paper`, `--ink`, `--ink-soft`, `--dot`, `--rule`, `--hl`)
- Page-flip 3D animation for calendar month navigation

Data is stored in `data/habits.db` (auto-created on first run, gitignored).
