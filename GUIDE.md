# GUIDE.md

Project walkthrough for developers coming from Angular/.NET/Python backgrounds.

---

## The Big Picture: How This Compares

| Concept | Angular / .NET | This Project (Next.js) |
|---|---|---|
| Entry point | `main.ts` + `index.html` | `src/app/layout.tsx` (the root HTML shell) |
| Routing | `app-routing.module.ts` with route configs | **File-based** — folder structure IS the routing |
| Components | `.ts` + `.html` + `.css` per component | Single `.tsx` file (TypeScript + JSX together) |
| Services / DI | Injectable services via constructor DI | Direct imports — no DI container |
| API controllers | `[ApiController]` classes in .NET | **Server Actions** in `actions.ts` (`"use server"`) |
| Database layer | EF Core / Dapper / raw ADO.NET | `better-sqlite3` with raw SQL in `storage.ts` |
| Repository pattern | DbContext + repositories | `HabitStorage` class (CRUD) + `HabitMetrics` class (queries) |
| State management | Signals / BehaviorSubject / NgRx | React `useState`, `useOptimistic` — no global store |
| Pipes | `{{ value \| datePipe }}` | Plain functions called inline: `habitColor(id)`, `getToday()` |
| Decorators | `@Component`, `@Injectable`, `@Input` | None — React uses props and `"use client"` / `"use server"` directives |
| Template syntax | `*ngIf`, `*ngFor`, `[ngClass]` | JSX: `{condition && <Tag/>}`, `.map()`, `className={...}` |
| Dependency injection | Built-in DI container | No DI — modules import what they need directly |
| LINQ queries | `.Where().Select().ToList()` | Raw SQL via `db.prepare("SELECT ...").all()` |

---

## How the App Starts (The Angular `main.ts` Equivalent)

In Angular, `main.ts` bootstraps `AppModule`, which loads `AppComponent`, which has `<router-outlet>`.

Here, it's **layout nesting**:

```
src/app/layout.tsx          ← The "index.html" — <html>, <body>, fonts, metadata
  └── src/app/(notebook)/layout.tsx   ← The "AppComponent" — notebook shell + nav tabs
        ├── page.tsx                  ← Route: /          (Today view)
        ├── calendar/page.tsx         ← Route: /calendar  (Calendar view)
        └── review/page.tsx           ← Route: /review    (Weekly Review)
```

**`layout.tsx` (root)** = Your `index.html` + `AppComponent` combined:
- Sets up `<html>` and `<body>` tags
- Loads Google Fonts (Caveat, Kalam) — like adding fonts in `angular.json`
- Sets metadata (title, description) — like `<title>` in `index.html`
- `{children}` is like `<router-outlet>` — whatever route matches gets rendered here

**`(notebook)/layout.tsx`** = A nested layout (like a parent route with its own `<router-outlet>`):
- Wraps pages in `NotebookShell` (the notebook UI with tab navigation)
- The `(notebook)` folder name with parentheses is a **route group** — it groups pages under a shared layout WITHOUT adding to the URL. So `/calendar` is the URL, not `/notebook/calendar`

---

## Routing: File System = Route Config

In Angular, you define routes in an array:
```typescript
// Angular
const routes: Routes = [
  { path: '', component: TodayComponent },
  { path: 'calendar', component: CalendarComponent },
  { path: 'day/:date', component: DayComponent },
];
```

In Next.js, the file system IS the route config:

```
src/app/
  (notebook)/
    page.tsx              →  /
    calendar/page.tsx     →  /calendar
    review/page.tsx       →  /review
  day/[date]/page.tsx     →  /day/2026-05-03  (dynamic param, like :date in Angular)
```

- Every `page.tsx` file = a routable page (like an Angular component registered in routes)
- `[date]` folder = dynamic route parameter (Angular's `:date`)
- `layout.tsx` = wraps child routes (Angular's parent route with `<router-outlet>`)
- `(notebook)/` = groups routes under a shared layout without affecting the URL

---

## Components: The Angular Component Equivalent

### Angular Component Structure
```
my-component/
  my-component.component.ts      ← Logic + decorator
  my-component.component.html    ← Template
  my-component.component.css     ← Styles
```

### React/Next.js Component Structure
```
components/
  InkCheckbox.tsx    ← Logic + Template + Styles all in one file
```

Everything lives in a single `.tsx` file. The JSX (what you'd put in `.html`) is the return value of the function. Example:

```tsx
// InkCheckbox.tsx — compare to an Angular component
export function InkCheckbox({ habitId, done, date, size = 26 }: InkCheckboxProps) {
  // ↑ Props = Angular's @Input() properties
  
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  // ↑ State = Angular's signal() or BehaviorSubject
  
  function handleToggle() { /* ... */ }
  // ↑ Methods = Angular's component methods
  
  return (
    <button onClick={handleToggle}>   {/* ← Template = Angular's .html file */}
      <svg>...</svg>
    </button>
  );
}
```

### Key Difference: Server Components vs Client Components

Angular components always run in the browser. Next.js has TWO types:

| | Server Component (default) | Client Component (`"use client"`) |
|---|---|---|
| Runs where | Server only — never sent to browser | Browser (like Angular components) |
| Can do | Database queries, file I/O | useState, onClick, browser APIs |
| Angular analogy | Like a .NET Razor page that renders HTML | Like an Angular component |
| Examples | `DayView.tsx`, `page.tsx` files | `InkCheckbox.tsx`, `ViewNav.tsx` |

**How to tell**: If the file starts with `"use client"`, it runs in the browser. Otherwise, it runs on the server.

`DayView.tsx` is a **server component** — it calls `storage.getDay(date)` directly (hits SQLite on the server), then passes data down to client components like `InkCheckbox` via props.

This is like a .NET controller that fetches data and passes it to a Razor view, except the "view" is React components.

---

## Server Actions = Your .NET API Controllers

In .NET, you'd write:
```csharp
[ApiController]
[Route("api/habits")]
public class HabitController : ControllerBase
{
    [HttpPost("toggle")]
    public IActionResult Toggle(int habitId, string date) {
        _storage.ToggleHabitForDate(habitId, date);
        return Ok();
    }
}
```

In Next.js, the equivalent is a **Server Action** in `actions.ts`:

```typescript
"use server";  // ← This directive makes every export a server-side function

export async function toggleHabit(habitId: number, date?: string) {
  const d = date ?? getToday();
  storage.toggleHabitForDate(habitId, d);
  revalidateAll(d);  // ← Tell Next.js to re-render affected pages
}
```

- `"use server"` = Like `[ApiController]` — marks these as server-side endpoints
- No HTTP verbs or routes — React calls them directly as functions
- `revalidatePath()` = Tells Next.js to re-fetch data for pages (like SignalR pushing updates to Angular)
- Client components call them like regular functions: `await toggleHabit(habitId, date)`

**The flow:**
```
Browser (InkCheckbox) → toggleHabit() → storage.toggleHabitForDate() → SQLite
                       ↑ server action    ↑ repository method            ↑ database
```

Compare to .NET:
```
Browser (Angular) → POST /api/habits/toggle → HabitController.Toggle() → _repo.Toggle() → PostgreSQL
```

Same layered architecture, fewer ceremony.

---

## Database Layer = Your Repository + EF Core

### Schema (`init.ts`)

Like a .NET migration or EF Core `OnModelCreating`:

```typescript
// init.ts — schema creation (like a DbContext migration)
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS habits (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,  -- Like [Key] in EF Core
    name        TEXT NOT NULL,
    archived_at DATETIME NULL,                       -- Soft delete, not hard delete
    sort_order  INTEGER NOT NULL DEFAULT 0
  );
  
  CREATE TABLE IF NOT EXISTS habit_logs (
    habit_id INTEGER NOT NULL REFERENCES habits(id), -- Foreign key
    date     TEXT NOT NULL,
    PRIMARY KEY (habit_id, date)                      -- Composite primary key
  );
`;
```

- `getDb()` = Singleton pattern, like `DbContext` lifetime in .NET DI (Scoped → Singleton here)
- `getDbForPath()` = Used in tests to create isolated databases (like using InMemory provider in EF Core tests)
- WAL mode enabled = Like setting `PRAGMA journal_mode = WAL` for better concurrent reads

### Storage Class (`storage.ts`) = Repository Pattern

```typescript
// storage.ts — compare to a .NET repository
export class HabitStorage {
  private db: Database.Database;    // ← Like injecting DbContext
  
  constructor(db?: Database.Database) {
    this.db = db ?? getDb();        // ← Poor man's DI (no container, just default fallback)
  }
  
  getActiveHabits(): Habit[] {
    return this.db
      .prepare("SELECT * FROM habits WHERE archived_at IS NULL ORDER BY sort_order, id")
      .all() as Habit[];
    // ↑ Like: _context.Habits.Where(h => h.ArchivedAt == null).OrderBy(h => h.SortOrder).ToList()
  }
  
  toggleHabitForDate(habitId: number, date: string): boolean {
    const existing = this.db
      .prepare("SELECT 1 FROM habit_logs WHERE habit_id = ? AND date = ?")
      .get(habitId, date);
    // ↑ Parameterized query — ? prevents SQL injection (like @p0 in EF Core)
    
    if (existing) {
      this.db.prepare("DELETE FROM habit_logs WHERE ...").run(habitId, date);
      return false;
    } else {
      this.db.prepare("INSERT INTO habit_logs ...").run(habitId, date);
      return true;
    }
  }
}
```

**LINQ vs Raw SQL comparison:**

| .NET LINQ | This project |
|---|---|
| `_ctx.Habits.Where(h => h.ArchivedAt == null).ToList()` | `db.prepare("SELECT * FROM habits WHERE archived_at IS NULL").all()` |
| `_ctx.HabitLogs.Count(l => l.HabitId == id && l.Date >= start)` | `db.prepare("SELECT COUNT(*) FROM habit_logs WHERE habit_id = ? AND date >= ?").get(id, start)` |
| `_ctx.Habits.Add(new Habit { Name = name })` | `db.prepare("INSERT INTO habits (name) VALUES (?)").run(name)` |
| `_ctx.SaveChanges()` | Not needed — `better-sqlite3` is synchronous, writes happen immediately |

### Metrics Class (`metrics.ts`) = Query Service

Like a separate .NET service that does complex read queries:

```typescript
// metrics.ts — like a .NET IHabitMetricsService
export class HabitMetrics {
  getStreak(habitId: number): number { /* walks backward through dates */ }
  getStreaks(habitIds: number[]): Record<number, number> { /* batch version */ }
  getBestStreak(habitId: number): number { /* scans all logs */ }
  getHeatmapData(weeks: number): HabitHeatmapRow[] { /* builds heatmap grid */ }
  getWeeklyReview(endDate: string): WeeklyReviewData { /* computes weekly stats */ }
}
```

Split from `HabitStorage` for the same reason you'd split `IHabitRepository` (CRUD) from `IHabitAnalyticsService` (complex queries) in .NET.

---

## State Management: Signals → useOptimistic / useState

| Angular | React (this project) | Purpose |
|---|---|---|
| `signal(false)` | `useState(false)` | Local component state |
| `computed(() => ...)` | Derived in render: `const x = habits.filter(...)` | Computed values |
| `BehaviorSubject` | `useOptimistic(done)` | Optimistic UI updates |
| `@Output() EventEmitter` | Callback props: `onSave={(value) => ...}` | Child-to-parent communication |
| `localStorage` service | `view-persistence.ts` — direct `localStorage` calls | Persisting UI state |

**`useOptimistic` is the key React 19 pattern here.** When you toggle a checkbox:
1. UI updates instantly (optimistic) — like Angular's `signal.set(!signal())`
2. Server action runs in the background
3. If it fails, React reverts automatically

No need for loading spinners or manual rollback.

---

## Styling: Angular's `styleUrls` → CSS Files

| Angular | This project |
|---|---|
| `styles.css` (global) | `globals.css` — CSS variables, Tailwind import |
| Component `.css` files (scoped) | `notebook.css` — shared styles, `calendar.css`, `review.css` |
| `angular.json` fonts config | `layout.tsx` — Google Fonts loaded via `next/font` |
| SCSS variables | CSS custom properties: `--paper`, `--ink`, `--dot`, etc. |

Design tokens in `globals.css`:
```css
:root {
  --paper: #fafaf3;     /* Background color */
  --ink: #161a2c;       /* Text color */
  --ink-soft: rgba(22, 26, 44, 0.6);  /* Muted text */
  --dot: rgba(22, 26, 44, 0.16);      /* Grid dots */
  --rule: rgba(22, 26, 44, 0.12);     /* Lines */
  --hl: #f4d75c;        /* Highlights */
}
```

---

## Testing: Jasmine/Karma → Vitest

| Angular | This project |
|---|---|
| Jasmine + Karma (or Jest) | Vitest (faster, Vite-native) |
| `TestBed.configureTestingModule()` | `setupTestDb()` from `test-helpers.ts` |
| `fixture.detectChanges()` | Not needed — testing storage layer directly |
| `HttpClientTestingModule` | Real SQLite with temp DB files |
| `*.spec.ts` files | `__tests__/*.test.ts` files |

Test pattern — very similar to what you'd write in .NET with xUnit:

```typescript
// .NET xUnit style:                    // This project's Vitest style:
// [Fact]                               it("creates a habit", () => {
// public void CreatesHabit() {           const habit = storage.createHabit("Read");
//   var habit = _repo.Create("Read");    expect(habit.name).toBe("Read");
//   Assert.Equal("Read", habit.Name);  });
// }
```

---

## Utility Functions = Angular Pipes

Angular pipes transform data in templates: `{{ date | dateFormat }}`.

Here, plain functions do the same thing:

```typescript
// habit-colors.ts — like an Angular Pipe
const PALETTE = ["#e06c75", "#61afef", ...];
export function habitColor(habitId: number): string {
  return PALETTE[(habitId - 1) % PALETTE.length];
}

// Used in JSX (like using a pipe in a template):
<span style={{ background: habitColor(h.habitId) }} />
```

Other utility "pipes":
- `getToday()` in `date-utils.ts` — formats current date as `YYYY-MM-DD`
- `parseYearMonth()` in `calendar-utils.ts` — parses URL params
- `buildCalendarGrid()` — transforms flat day array into 2D grid

---

## Complete Request Flow

Here's a full request traced through the system, compared to .NET:

**User checks a habit checkbox on the Today page:**

```
┌─────────────────────────────────────────────────────────────┐
│ .NET Flow                                                   │
│                                                             │
│ Angular Component → HTTP POST /api/habits/toggle            │
│   → HabitController.Toggle()                                │
│     → _habitService.Toggle()                                │
│       → _context.HabitLogs.Add/Remove()                     │
│         → _context.SaveChanges()                            │
│           → PostgreSQL                                      │
│ ← 200 OK                                                   │
│ Angular Component ← manually refresh data or use SignalR    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ This Project's Flow                                         │
│                                                             │
│ InkCheckbox (client component)                              │
│   → useOptimistic: instantly flip the checkbox UI           │
│   → toggleHabit() server action (in actions.ts)             │
│     → storage.toggleHabitForDate() (in storage.ts)          │
│       → db.prepare("DELETE/INSERT ...").run()               │
│         → SQLite (data/habits.db)                           │
│     → revalidatePath("/") — tells Next.js to re-render      │
│ ← Page automatically re-renders with fresh data             │
└─────────────────────────────────────────────────────────────┘
```

---

## File-by-File Map

### Config Files (Root)
| File | Angular Equivalent | Purpose |
|---|---|---|
| `package.json` | `package.json` | Dependencies and npm scripts |
| `tsconfig.json` | `tsconfig.json` | TypeScript config — strict mode, `@/*` path alias |
| `next.config.ts` | `angular.json` | Framework config — marks `better-sqlite3` as server-only |
| `vitest.config.ts` | `karma.conf.js` | Test runner config |
| `postcss.config.mjs` | — | Tailwind CSS integration |
| `eslint.config.mjs` | `.eslintrc` | Linting rules |

### Data Layer (`src/db/`)
| File | .NET Equivalent | Purpose |
|---|---|---|
| `init.ts` | EF Core Migration / `DbContext.OnModelCreating` | Schema, DB singleton, WAL mode |
| `storage.ts` | `IHabitRepository` | CRUD operations: create/archive/toggle/get habits |
| `metrics.ts` | `IHabitAnalyticsService` | Read-only queries: streaks, heatmaps, weekly reviews |
| `types.ts` | DTOs / Entity models | `Habit`, `DayRecord`, `HeatmapDay`, `WeeklyReviewData` |

### App Layer (`src/app/`)
| File | Angular Equivalent | Purpose |
|---|---|---|
| `layout.tsx` | `index.html` + `AppComponent` | Root HTML shell, fonts, metadata |
| `(notebook)/layout.tsx` | Parent route component with `<router-outlet>` | Notebook shell wrapper for main pages |
| `(notebook)/page.tsx` | `TodayComponent` + route `/` | Today view |
| `(notebook)/calendar/page.tsx` | `CalendarComponent` + route `/calendar` | Calendar + heatmap view |
| `(notebook)/review/page.tsx` | `ReviewComponent` + route `/review` | Weekly review + reflection |
| `day/[date]/page.tsx` | `DayComponent` + route `/day/:date` | Past day detail view (read-only) |
| `actions.ts` | `HabitController.cs` (API endpoints) | Server-side mutation functions |
| `date-utils.ts` | `DatePipe` or utility service | `getToday()` date formatter |
| `habit-colors.ts` | Angular Pipe | Maps habit ID to color |
| `view-persistence.ts` | `localStorage` service | Remembers last active tab |
| `globals.css` | `styles.css` | Design tokens, Tailwind setup |
| `notebook.css` | Component styles | Notebook-wide UI styles |

### Components (`src/app/components/`)
| Component | Angular Equivalent | Purpose |
|---|---|---|
| `NotebookShell.tsx` | `AppComponent` template | Outer notebook container |
| `ViewNav.tsx` | `NavComponent` with `routerLinkActive` | Tab navigation (Today/Calendar/Review) |
| `DayView.tsx` | Smart component (fetches own data) | Day layout — server component, calls storage directly |
| `InkCheckbox.tsx` | Custom form control component | Hand-drawn SVG checkbox with optimistic toggle |
| `EditableHabitName.tsx` | Inline edit component | Click-to-edit habit name input |
| `AddHabitInline.tsx` | Inline form component | "+" row to add new habits |
| `AutosaveTextarea.tsx` | Custom textarea with `(blur)` handler | Saves on blur — used for intention, notes, reflection |
| `HeatmapSection.tsx` | Data visualization component | GitHub-style heatmap grid per habit |
| `MonthGrid.tsx` | Calendar component | Monthly calendar with page-flip animation |
| `Scribble.tsx` | Decorative SVG component | Hand-drawn decoration element |
| `InkDot.tsx` | Decorative component | Small ink dot element |
