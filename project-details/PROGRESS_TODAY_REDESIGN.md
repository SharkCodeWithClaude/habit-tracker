# Today View Redesign — Bullet Journal Design (Completed)

**Date:** 2026-05-01
**Commit:** 225ad1e

## What Was Done

### TDD Tests Written First (10 new tests)
- `src/db/__tests__/intention-storage.test.ts`:
  - 7 tests for intention storage (create, update, independence from notes, getMonth inclusion)
  - 3 tests for InkCheckbox jitter determinism (same seed = same value, different seeds = different values, range bounds)

### Schema Changes
- Added `intention TEXT NOT NULL DEFAULT ''` column to `day_notes` table
- Added migration in `init.ts` for existing databases (checks if column exists, adds if not)
- Updated `schema.sql` reference file

### Storage Layer
- Added `setDayIntention(date, intention)` to `HabitStorage`
- Updated `getDay()` to return `intention` field
- Updated `getMonth()` to return `intention` for each day
- Updated `DayRecord` type to include `intention: string`

### Server Actions
- Added `saveIntention(intention, date?)` action

### UI Components (New/Redesigned)
- **InkCheckbox** — hand-drawn SVG checkbox with:
  - Per-instance jitter via seeded sin-based RNG (wobbly box corners)
  - Animated check stroke (strokeDasharray/offset with inkDraw keyframe)
  - Optimistic updates via useOptimistic
- **IntentionTextarea** — "The great thing I will do today" textarea with:
  - Caveat 26px font, dashed bottom border
  - Save on blur via saveIntention action
- **NoteTextarea** — redesigned with:
  - Ruled-line background (linear-gradient)
  - Caveat 22px font, no border
  - Block label with arrow prompt
- **Scribble** — already existed, now used on Today page header

### Today Page Redesign
- **Notebook shell**: dot-grid paper texture, page shadow, paper noise overlay
- **Notebook nav**: pill tabs (Today / Calendar) with year title
- **Page header**: day name (Caveat 44px), date + year (Caveat 20px), scribble underline
- **Intention block**: full-width textarea above habits
- **Two-column layout** (1.05fr / 1fr): Habits | Notes
- **Habit rows**: InkCheckbox + habit name with strikethrough animation + streak chips
- **Streak chips**: highlighter-yellow background, irregular border-radius, slight rotation
- **"+ add another habit..."** placeholder linking to /manage
- **Empty state**: italic message with link to manage page

### Cleanup
- Removed old `HabitCheckbox.tsx` (replaced by InkCheckbox)
- Extracted shared `notebook.css` from calendar-specific styles
- Simplified `globals.css` to design handoff tokens only
- Calendar page now imports shared `notebook.css`

## Test Results
- **41 tests passing** (31 existing + 10 new)
- Build compiles with zero errors
- Today page renders with all design elements
- Calendar page still works correctly

## What's Next
- **Test the Today view visually** — verify it matches the design handoff
- **Slice 6** — Calendar day editing (click day cell to edit, issue #9)
- **Slice 7** — App shell and view toggle with localStorage (issue #10)
- **Slice 8** — Polish and README (issues #11, #12)
