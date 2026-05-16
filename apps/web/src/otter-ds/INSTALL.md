# Install — Next.js (App Router)

This is a minimal, end-to-end install guide.

## 1. Copy the package

Copy the entire `otter-ds/` folder into your Next.js project. A common location:

```
your-app/
├── app/
├── public/
└── src/
    └── otter-ds/      ← here
```

Move `otter-ds/public/otter.png` to your project's top-level `public/` so it's served at `/otter.png`. (Or update `brandImgSrc` on the `<Sidebar>` component.)

## 2. Set up the `@/` alias (if you don't have one)

In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## 3. Wire up CSS in `app/layout.tsx`

```tsx
import { Inter, Newsreader } from "next/font/google";
import "@/otter-ds/styles/tokens.css";
import "@/otter-ds/styles/globals.css";
import "@/otter-ds/styles/components.css";

const inter = Inter({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-inter" });
const newsreader = Newsreader({ subsets: ["latin"], weight: ["400","500","600"], variable: "--font-newsreader" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

If you use the `next/font` variables, override the font tokens in your own CSS:

```css
:root {
  --font-sans:  var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-serif: var(--font-newsreader), Georgia, serif;
}
```

## 4. Create the page

`app/today/page.tsx`:

```tsx
import TodayPage from "@/otter-ds/examples/today-page";
export default TodayPage;
```

That's it — visit `/today`.

## 5. (Optional) Bring your own data

Replace `seedLogs` / `SEED_HABITS` with your real data source. The components are pure: they receive `habits` and `logs` and call `setLogs`.

```tsx
const [habits, setHabits] = useState<Habit[]>(await fetchHabits());
const [logs, setLogs]     = useState<LogMap>(await fetchLogs());
```

Persist `logs` and `habits` to your backend on change (e.g. SWR, react-query, or a server action).

## 6. (Optional) Hook up real LLM inference

The `llmInfer` helper looks for `window.claude.complete`. To use OpenAI/Anthropic on the server instead, replace `llmInfer` in `lib/infer.ts` with a `fetch('/api/infer', …)` call to your own route handler that talks to your LLM provider.

## 7. (Optional) Dark mode

Add `data-theme="dark"` to `<html>` (or any ancestor) to flip surfaces. Tokens are already overridden in `tokens.css`.

```tsx
<html data-theme={isDark ? "dark" : "light"}>
```

## Component cheatsheet

```tsx
<Sidebar active="today" onChange={setTab} />

<Login
  layout="centered"             // or "split"
  accent="ink"                  // or "blue"
  headingStyle="serif"          // or "sans"
  onSubmit={async ({ email, password, remember }) => { /* call your API */ }}
  onGoogle={() => signIn('google')}
  onMagicLink={async (email) => { /* send link */ }}
  onForgot={() => router.push('/reset')}
  onSignUp={() => router.push('/signup')}
/>

<DateStrip selectedKey={key} onSelect={setKey} logs={logs} habits={habits} />

<Journal
  value={text}
  onChange={setText}
  onProposals={setProposals}
  habits={habits}
  date={new Date()}
/>

<Proposals
  proposals={proposals}
  habits={habits}
  onConfirmTick={...}
  onDismissTick={...}
  onAddHabit={...}
  onDismissNew={...}
  onClear={...}
/>

<Habits habits={habits} logs={logs} setLogs={setLogs} dateK={key} />
```

All class names are prefixed with `otr-` so they won't collide with your existing styles.
