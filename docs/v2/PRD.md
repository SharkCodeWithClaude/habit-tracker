# Habit Tracker V2 — Product Requirements Document

> **Status:** Approved
> **Date:** 2026-05-10
> **Scope:** Ground-up rebuild as production-grade PWA with conversational AI

---

## Problem Statement

The current habit tracker (V1) is a single-user, local-only SQLite app with no authentication, no mobile support, and no AI assistance. Users must manually tap checkboxes to track habits — there's no way to describe your day naturally and have the app figure out what you did. V1 cannot be deployed, shared, or used on a phone.

## Solution

Rebuild as a production-grade PWA with a conversational AI interface. Instead of tapping checkboxes, users chat with an AI assistant: "Ran 5km, read two chapters, skipped meditation." The AI responds with proposed habit updates, and the user confirms. Sessions auto-manage themselves — wrapping when idle, when token budget is exceeded, or when context shifts — so the user never thinks about token costs.

The app ships as a monorepo with a separate Hono API backend and Next.js frontend using the Otter DS design system (Notion-inspired, calm aesthetic). PostgreSQL replaces SQLite. JWT authentication enables multi-device access. PWA makes it installable on iPhone and Android without an app store.

---

## User Stories

### Authentication
1. As a new user, I want to register with email and password, so that I have a personal account.
2. As a returning user, I want to log in with my credentials, so that I can access my habits.
3. As a logged-in user, I want my session to persist across browser restarts, so that I don't re-login daily.
4. As a user on a shared device, I want to log out, so that others can't see my data.
5. As a user with an expired session, I want my token to silently refresh, so that I'm not interrupted.

### Habit Management
6. As a user, I want to create a new habit with a name and emoji, so that I can track it daily.
7. As a user, I want to see my active habits listed on the Today view, so that I know what to track.
8. As a user, I want to toggle a habit as done for today, so that I can track completion manually.
9. As a user, I want to archive a habit I no longer track, so that it disappears without losing history.
10. As a user, I want to reorder my habits, so that the most important ones appear first.
11. As a user, I want to define aliases for a habit (e.g., "ran", "running", "jog" for Workout), so that AI can match my natural language to habits.
12. As a user, I want to track session-based habits (e.g., "3 glasses of water"), so that I can count occurrences, not just done/not-done.
13. As a user, I want to see my current streak for each habit, so that I'm motivated to maintain it.

### Conversational AI
14. As a user, I want to type what I did today in a chat interface, so that the AI can figure out which habits I completed.
15. As a user, I want the AI to respond with proposed habit updates, so that I can confirm or adjust before anything is saved.
16. As a user, I want to continue a conversation to add more details ("also meditated for 10 min"), so that I don't have to say everything in one message.
17. As a user, I want the AI to detect negations ("didn't run today"), so that it doesn't falsely tick habits.
18. As a user, I want the AI to suggest new habits it detects in my text, so that I can add them without leaving the chat.
19. As a user, I want conversations to auto-wrap after idle time, so that stale context doesn't confuse the AI.
20. As a user, I want a new session to start automatically when I come back the next day, so that yesterday's context doesn't leak.
21. As a user, I want the app to start a new session when token budget is exceeded, so that I don't pay for unnecessarily large contexts.
22. As a user, I want the AI to suggest a new session when I shift topics, so that context stays relevant.
23. As a user without an AI provider configured, I want regex-based matching as a fallback, so that the app still works without an API key.

### AI Provider Configuration
24. As a user, I want to bring my own API key (Claude, Gemini, Groq, or OpenAI), so that I control my AI costs.
25. As a user, I want my API key encrypted at rest, so that it's secure even if the database is compromised.
26. As a user, I want to switch between AI providers, so that I can try different models.
27. As a user, I want the app to fall back to regex matching if my API key is invalid, so that the app still works.
28. As a user who hasn't configured any provider, I want the app to default to local regex inference, so that no data leaves the server.

### Calendar & Heatmap
29. As a user, I want to see a monthly calendar grid with completion dots per day, so that I can visualize my consistency.
30. As a user, I want to navigate between months, so that I can review past performance.
31. As a user, I want to see a GitHub-style heatmap per habit, so that I can spot patterns over weeks.
32. As a user, I want to click a past day to view what I did, so that I can review my history.

### Weekly Review
33. As a user, I want to see weekly stats (completion %, best/worst habit), so that I can reflect on my progress.
34. As a user, I want to write a weekly reflection, so that I can capture lessons learned.

### PWA & Mobile
35. As a mobile user, I want to install the app to my home screen, so that it feels like a native app.
36. As a user on a flaky connection, I want an offline fallback page, so that the app doesn't break.
37. As an iPhone user, I want the app to respect iOS safe areas and gestures, so that it feels native.

### Data & Privacy
38. As a user, I want to delete a conversation, so that I can remove chat history I don't want stored.
39. As a user, I want no telemetry or analytics, so that my habit data stays private.
40. As a user, I want AI inference to be opt-in only, so that my data never leaves the server unless I choose.

---

## Implementation Decisions

### Monorepo Structure
- pnpm workspaces + Turborepo for build orchestration.
- `apps/web` (Next.js frontend), `apps/api` (Hono backend), `packages/shared` (types, Zod schemas, constants).
- V1 code in root `src/` stays untouched.

### Backend Architecture (Hono API)
- Layered: Route → Service → Repository → Database. Providers for AI.
- SOLID throughout. Repository pattern for data access. Strategy + Factory for AI providers. Middleware chain for auth/errors/logging.
- Services depend on repository/provider interfaces, not implementations. Tests inject in-memory fakes.
- Hono RPC for end-to-end type safety with the frontend — no codegen, no manual type definitions.

### Database (PostgreSQL 16 + Drizzle)
- 10 tables: `users`, `habits`, `habit_aliases`, `habit_logs`, `conversations`, `messages`, `weekly_reviews`, `user_ai_configs`, `refresh_tokens`.
- 3NF normalized. UUIDs for all PKs. Partial indexes for active-record queries.
- `conversations` + `messages` replace the original `journal_entries` design. Chat is multi-turn, not a single text blob.
- Soft delete for habits via `archived_at`. Hard delete for conversations (user can delete chat history).
- All cascade deletes flow from `users` downward.

### Conversational AI (replaces one-shot journal inference)
- Multi-turn chat, not single-shot inference. User messages and AI responses stored in `messages` table.
- Session lifecycle managed by `conversations` table: `ended_at IS NULL` = active session.
- Three auto-wrap triggers: token budget exceeded, context shift detected by AI (`shouldWrap: true`), idle timeout.
- Provider interface: `chat(input: ChatInput): Promise<ChatOutput>`. All providers implement this.
- LocalProvider (regex) is the default — no API call, no data leaves server. Works without assistant reply messages.
- BYO key model: user stores encrypted API key, factory creates the right provider at runtime.

### Authentication
- JWT access tokens (15 min) + refresh tokens (7 days, HTTP-only cookie).
- Refresh tokens stored as SHA-256 hashes. Rotated on each refresh.
- bcrypt for password hashing.

### Frontend
- Next.js App Router with Otter DS (Notion-inspired design system, already built).
- Server components fetch data, client components use React 19 `useOptimistic` for instant UI.
- Otter DS components copied into `apps/web/`, not installed as npm package.
- Chat component replaces Journal component from Otter DS.

### Deployment
- Railway: managed Postgres, auto-deploy on push, parallel builds for api + web.
- Docker Compose for local dev (Postgres only).

### Implementation Slices (build order)
1. Monorepo scaffold
2. Database + schema
3. Auth
4. Habits CRUD
5. Today view (Otter DS wired to API)
6. Chat + AI (conversation UI, session management, provider abstraction, local provider)
7. BYO key config (settings page, API key encryption, provider selection)
8. Calendar + Heatmap
9. Weekly Review
10. PWA
11. Deploy

---

## Deep Modules

| Module | Interface | Hides |
|--------|-----------|-------|
| **Auth** | `register`, `login`, `refresh`, `authMiddleware` | bcrypt hashing, JWT signing/verification, token rotation, cookie management |
| **Habit** | `create`, `list`, `archive`, `toggle`, `getStreaks`, `getHeatmap` | SQL queries, streak calculation math, date range logic, sort ordering |
| **Conversation** | `getOrCreateSession`, `sendMessage`, `wrapSession` | Session lifecycle, auto-wrap trigger evaluation, token counting, message persistence |
| **Inference** | `chat(input): ChatOutput` | Provider selection, prompt construction, regex fallback, confidence scoring, structured output parsing |
| **Review** | `getWeeklyStats`, `saveReflection` | Aggregation queries, completion % calculation, week boundary logic |

---

## Testing Decisions

### What makes a good test
Tests verify external behavior through the module's public interface. They do not test implementation details (private methods, internal state, SQL queries). A test should break only when the module's contract changes, not when its internals are refactored.

### Modules under test

| Module | Test Type | Database | What's Tested |
|--------|-----------|----------|---------------|
| **Auth** | Integration | Real Postgres | Register → login → refresh → protected route flow |
| **Habit** | Integration | Real Postgres | CRUD lifecycle, toggle idempotency, streak math across date boundaries |
| **Conversation** | Unit + Integration | Mocked repos (unit), Real Postgres (integration) | Session auto-wrap triggers, token budget enforcement, message ordering |
| **Inference** | Unit | None | Each provider tested independently. LocalProvider regex matching. LLM providers tested with mocked HTTP responses. |
| **Review** | Integration | Real Postgres | Weekly stats accuracy, reflection upsert, week boundary edge cases |

### Prior art
V1 has 87 Vitest tests using `setupTestDb()` for isolated test databases. Same pattern applies to V2 with Postgres instead of SQLite. Test helpers provide `{ db, repos, cleanup }`.

TDD workflow: write test → see it fail → implement → green → refactor.

---

## Out of Scope

- **Money tracking / budgeting** — future feature, schema designed to accommodate it.
- **Goal setting / progress tracking** — future feature.
- **Multi-user collaboration** — V2 supports multiple accounts but no shared data between users.
- **App Store distribution (Capacitor)** — PWA first, native wrapper later.
- **OAuth / social login** — email/password only in V2, upgradeable later.
- **Push notifications** — not in V2 scope.
- **Offline-first with sync** — PWA shows offline fallback, but does not queue mutations offline.
- **Voice dictation** — Otter DS has the hook, but not wired in V2 scope (can add later).
- **V1 migration** — no data migration from SQLite to Postgres. V1 stays untouched.

---

## Further Notes

- Otter DS is already built and lives at `otter-ds/` in the repo. It includes Sidebar, DateStrip, Journal (to be adapted to Chat), Proposals, and Habits components. The Journal component's textarea + inference pattern becomes the Chat component's message input + conversational flow.
- The `packages/shared` workspace ensures domain types and Zod schemas are shared between frontend and backend without duplication.
- Privacy is a core constraint: AI is opt-in, no telemetry, API keys encrypted at rest, LocalProvider is the default.
- Architecture must support future expansion (money, goals, multi-user) without restructuring existing tables — all future tables are additive.
