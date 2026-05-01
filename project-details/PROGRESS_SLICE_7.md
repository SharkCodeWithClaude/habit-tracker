# Slice 7: Smooth View Toggle (Completed)

**Date:** 2026-05-01

## What Was Done

### TDD Tests (8 new tests)
- `src/app/__tests__/view-persistence.test.ts`:
  - `getLastView` defaults to "today" when nothing saved
  - `getLastView` returns "calendar" when saved as calendar
  - `getLastView` returns "today" when saved as today
  - `getLastView` returns "today" for invalid saved value
  - `viewToPath` maps today→"/" and calendar→"/calendar"
  - `pathToView` maps "/" to today
  - `pathToView` maps "/calendar" and "/calendar?ym=..." to calendar
  - `pathToView` maps unknown paths to today

### View Persistence Module
- `src/app/view-persistence.ts` — deep module exposing `getLastView`, `saveLastView`, `viewToPath`, `pathToView`

### Shared Layout (Route Group)
- Created `(notebook)` route group with `layout.tsx` that renders `NotebookShell`
- `NotebookShell` component wraps all notebook pages with desk surface, notebook container, and nav
- Moved `page.tsx` → `(notebook)/page.tsx` (Today view, no duplicate shell)
- Moved `calendar/page.tsx` → `(notebook)/calendar/page.tsx` (Calendar view, no duplicate shell)
- `/day/[date]` page updated to use `NotebookShell` component directly

### ViewNav Client Component
- `src/app/components/ViewNav.tsx` — client component using `usePathname` to highlight active tab
- Saves current view to localStorage on every navigation via `useEffect`
- Shared by all pages through the layout/shell

### CSS Transitions
- Added `fadeIn` keyframe animation (opacity + translateY) for content swap
- Applied to all notebook children except the nav bar

### Cleanup
- Removed duplicate nav markup from Today page, Calendar page, and Day page
- Removed old `calendar/page.tsx` (now served from route group)
- Fixed pre-existing TypeScript error in calendar-utils tests (missing `intention` field)
- Installed `jsdom` for view-persistence tests

## Test Results
- **60 tests passing** (52 existing + 8 new)
- Build clean, no TypeScript errors

## What's Next — Slice 9: GitHub-Style Heatmap
- Per-habit calendar heatmap showing done/not-done over time
- 18-week grid per habit with stats
- Design reference in `design_handoff_habit_tracker/calendar-view.jsx`
