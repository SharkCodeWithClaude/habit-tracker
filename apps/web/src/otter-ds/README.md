# Otter Design System

A self-contained design system for the Otter habit-journal app. Drop into a Next.js (App Router) project.

## What's inside

```
otter-ds/
├── styles/
│   ├── tokens.css        — CSS custom properties (colors, type, spacing, radii)
│   ├── globals.css       — base resets + body
│   └── components.css    — all component styles
├── lib/
│   ├── tokens.ts         — TS mirror of CSS tokens for JS access
│   ├── types.ts          — Habit, LogMap, Proposals types
│   ├── helpers.ts        — dateKey, isDone, computeStreak, etc.
│   └── infer.ts          — LLM/local journal inference
├── components/
│   ├── Icon.tsx          — icon set (16×16 SVG)
│   ├── Sidebar.tsx
│   ├── DateStrip.tsx
│   ├── Journal.tsx
│   ├── Proposals.tsx
│   ├── Habits.tsx
│   └── index.ts          — barrel export
├── hooks/
│   └── useVoiceRecorder.ts
├── public/
│   └── otter.png         — logo (replace as needed)
└── examples/
    └── today-page.tsx    — example Next.js app/today/page.tsx
```

## Install

1. Copy the `otter-ds/` folder into your Next.js project (e.g. `src/otter-ds/`).
2. Move `otter-ds/public/otter.png` into your project's `public/` folder.
3. In `app/layout.tsx`, import the CSS in this order:

```tsx
import "@/otter-ds/styles/tokens.css";
import "@/otter-ds/styles/globals.css";
import "@/otter-ds/styles/components.css";
```

4. Add the Inter font (already loaded via `next/font` if you use it, or via `<link>` in `<head>`):

```tsx
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], weight: ["400","500","600","700"] });
```

## Use

Drop the example page into `app/today/page.tsx`:

```tsx
import TodayPage from "@/otter-ds/examples/today-page";
export default TodayPage;
```

Or compose your own:

```tsx
"use client";
import { Sidebar, DateStrip, Journal, Proposals, Habits } from "@/otter-ds/components";
```

## Notes

- All interactive components are client components (`"use client"`).
- The journal calls `window.claude.complete` if available, else falls back to a regex-based local inference.
- Voice dictation uses the Web Speech API — Chrome/Safari only; gracefully degrades.
- Theme is light/Notion-simple by default. Tokens are in `tokens.css` — override `--accent`, `--bg`, `--ink` etc. to reskin.
