# Habit Tracker V2 — Architecture Document

> **Status:** Awaiting approval
> **Date:** 2026-05-09
> **Scope:** Complete redesign — new backend, new frontend, new database

---

## 1. Overview

V2 is a ground-up rebuild of the habit tracker as a production-grade, mobile-ready personal productivity app. The current v1 (Next.js + SQLite, bullet-journal UI) remains untouched. V2 is built alongside it in a monorepo structure.

**Core goals:**
- Deployable as a PWA (iPhone primary, Android secondary)
- PostgreSQL for data persistence
- Separate API backend (Hono) with type-safe RPC
- Otter DS design system (Notion-inspired, calm aesthetic)
- Conversational AI for habit tracking with provider-agnostic abstraction
- SOLID principles and design patterns throughout
- Strict database normalization

**Future scope (not built in V2, but architecture must support):**
- Money tracking and budgeting
- Goal setting and progress tracking
- Multi-user support
- App Store distribution via Capacitor

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js (App Router) | SSR, PWA support, matches Otter DS target |
| Design System | Otter DS | Already built, Notion-inspired, mobile-responsive |
| Backend API | Hono | Lightweight, TypeScript-first, built-in RPC client |
| API Pattern | Hono RPC | End-to-end type safety, no codegen, standard HTTP underneath |
| ORM | Drizzle | SQL-like typed queries, schema-as-code, auto migrations |
| Database | PostgreSQL 16 | Robust, normalized, extensible for future features |
| Auth | JWT (email/password) | Simple, stateless, upgradeable to OAuth later |
| Testing | Vitest | Already in use, fast, monorepo-friendly |
| Package Manager | pnpm | Workspace support, disk efficient |
| Build Orchestration | Turborepo | Parallel builds, caching, monorepo task runner |
| Deployment | Railway | Auto-deploy, managed Postgres, monorepo support, free tier |
| Mobile | PWA | Installable, offline-capable, no App Store needed initially |

---

## 3. Monorepo Structure

```
habit-tracker/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   │   ├── (dashboard)/      # Route group: today, calendar, review
│   │   │   │   ├── auth/             # Login, register pages
│   │   │   │   ├── settings/         # User settings, AI config
│   │   │   │   └── layout.tsx        # Root layout (fonts, Otter CSS)
│   │   │   ├── components/           # App-specific components
│   │   │   ├── hooks/                # Client-side hooks (auth, optimistic UI)
│   │   │   ├── lib/                  # API client (Hono RPC), utilities
│   │   │   └── styles/               # Otter DS tokens, globals, overrides
│   │   ├── public/                   # PWA manifest, icons, otter.png
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                          # Hono backend
│       ├── src/
│       │   ├── routes/               # Route modules
│       │   │   ├── auth.routes.ts
│       │   │   ├── habits.routes.ts
│       │   │   ├── conversation.routes.ts
│       │   │   └── review.routes.ts
│       │   ├── services/             # Business logic
│       │   │   ├── auth.service.ts
│       │   │   ├── habit.service.ts
│       │   │   ├── conversation.service.ts
│       │   │   ├── review.service.ts
│       │   │   └── inference.service.ts
│       │   ├── repositories/         # Data access layer
│       │   │   ├── interfaces/       # Repository contracts
│       │   │   ├── habit.repository.ts
│       │   │   ├── conversation.repository.ts
│       │   │   ├── review.repository.ts
│       │   │   └── user.repository.ts
│       │   ├── providers/            # AI provider implementations
│       │   │   ├── inference.provider.ts   # Interface
│       │   │   ├── claude.provider.ts
│       │   │   ├── gemini.provider.ts
│       │   │   ├── groq.provider.ts
│       │   │   └── local.provider.ts       # Regex fallback
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts
│       │   │   ├── error.middleware.ts
│       │   │   └── logger.middleware.ts
│       │   ├── config/
│       │   │   ├── env.ts            # Environment variables
│       │   │   └── database.ts       # Drizzle + Postgres connection
│       │   ├── db/
│       │   │   └── schema.ts         # Drizzle schema definitions
│       │   └── index.ts              # Hono app entry point
│       ├── drizzle/                  # Generated migrations
│       ├── drizzle.config.ts
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                       # Shared across apps
│       ├── src/
│       │   ├── types/                # Domain types
│       │   │   ├── habit.types.ts
│       │   │   ├── conversation.types.ts
│       │   │   ├── review.types.ts
│       │   │   ├── user.types.ts
│       │   │   └── inference.types.ts
│       │   ├── schemas/              # Zod validation schemas
│       │   │   ├── habit.schema.ts
│       │   │   ├── conversation.schema.ts
│       │   │   └── auth.schema.ts
│       │   └── constants/
│       │       ├── habit-kinds.ts
│       │       └── providers.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docker-compose.yml                # Local dev: Postgres only
├── pnpm-workspace.yaml
├── turbo.json                        # Turborepo pipeline config
├── package.json                      # Root scripts
├── tsconfig.base.json                # Shared TS config
├── docs/
│   └── v2/
│       ├── ARCHITECTURE.md           # This file
│       └── DATABASE.md               # Schema document
├── otter-ds/                         # Design system (existing)
└── src/                              # V1 code (untouched)
```

---

## 4. Backend Architecture (Hono API)

### 4.1 Layered Architecture

```
Request → Route → Service → Repository → Database
                     ↓
                  Provider (AI)
```

| Layer | Responsibility | Depends On |
|-------|---------------|------------|
| **Routes** | Parse request, validate input (Zod), return response | Services |
| **Services** | Business logic, orchestration, domain rules | Repository interfaces, Provider interfaces |
| **Repositories** | Data access via Drizzle, SQL queries | Drizzle client |
| **Providers** | External integrations (AI LLMs) | HTTP clients |
| **Middleware** | Cross-cutting: auth, errors, logging | Config |

### 4.2 SOLID Application

| Principle | How It's Applied |
|-----------|-----------------|
| **Single Responsibility** | Each route file handles one domain. Each service owns one slice of business logic. Repositories only do data access. |
| **Open/Closed** | New AI providers added by implementing the `InferenceProvider` interface — no existing code changes. New route modules added without touching existing routes. |
| **Liskov Substitution** | Any `InferenceProvider` implementation (Claude, Gemini, Groq, Local) is interchangeable. Any repository implementation (Postgres, in-memory for tests) satisfies the same contract. |
| **Interface Segregation** | Repository interfaces are per-domain (`HabitRepository`, `ConversationRepository`), not one giant `DatabaseRepository`. Provider interface has only what's needed: `chat(messages, habits)`. |
| **Dependency Inversion** | Services depend on repository/provider interfaces, not concrete Drizzle queries. Concrete implementations are injected. Tests inject in-memory fakes. |

### 4.3 Design Patterns

| Pattern | Where | Why |
|---------|-------|-----|
| **Repository** | `repositories/` | Abstracts Drizzle behind domain-specific interfaces. Services never see SQL. |
| **Strategy** | `providers/` | AI inference provider selected at runtime based on user config. |
| **Factory** | `providers/` | `createInferenceProvider(config)` returns the correct provider instance. |
| **Middleware Chain** | `middleware/` | Auth, error handling, and logging composed as Hono middleware. |
| **DTO/Schema** | `packages/shared/schemas/` | Zod schemas validate at system boundaries (API input). Internal code uses typed domain objects. |

### 4.4 Route → Service → Repository Example

```
POST /api/habits
  → habits.routes.ts:  parse body with Zod, call habitService.create(userId, data)
  → habit.service.ts:  validate business rules, call habitRepo.insert(habit)
  → habit.repository.ts: db.insert(habits).values(habit).returning()
  → response: 201 { habit }
```

---

## 5. Frontend Architecture (Next.js + Otter DS)

### 5.1 Page Structure

| Route | Component | Data Source |
|-------|-----------|-------------|
| `/` | Redirect to `/today` | — |
| `/today` | Sidebar + DateStrip + Chat + Proposals + Habits | API: GET habits, logs, conversation |
| `/calendar` | Sidebar + MonthGrid + Heatmap | API: GET month data, heatmap |
| `/review` | Sidebar + WeeklyReview | API: GET weekly stats |
| `/settings` | AI config, profile | API: GET/PUT user settings |
| `/auth/login` | Login form | API: POST auth/login |
| `/auth/register` | Register form | API: POST auth/register |

### 5.2 API Client

Hono RPC client initialized in `lib/api.ts`:

```ts
import { hc } from "hono/client";
import type { AppType } from "@habit-tracker/api";

export const api = hc<AppType>(process.env.NEXT_PUBLIC_API_URL!);
```

All API calls are fully typed end-to-end. No manual type definitions for responses.

### 5.3 State Management

- **Server components** fetch data via API client
- **Client components** use React 19 `useOptimistic` for instant UI (same pattern as v1)
- **Auth state** stored in HTTP-only cookie (JWT), validated server-side via middleware
- No global state library — prop drilling + composition is sufficient for this scope

### 5.4 Otter DS Integration

Otter DS files move into `apps/web/src/components/otter/` and `apps/web/src/styles/`. CSS imports in root layout:

```tsx
import "@/styles/tokens.css";
import "@/styles/globals.css";
import "@/styles/components.css";
```

Components imported from the local copy, not an npm package.

---

## 6. Authentication Flow

```
Register: POST /api/auth/register { email, password }
  → hash password (bcrypt)
  → insert user
  → return JWT (access token, 15 min) + refresh token (HTTP-only cookie, 7 days)

Login: POST /api/auth/login { email, password }
  → verify password
  → return JWT + refresh token

Refresh: POST /api/auth/refresh
  → validate refresh token from cookie
  → return new JWT

All other routes:
  → auth middleware extracts JWT from Authorization header
  → attaches userId to request context
  → 401 if invalid/expired
```

---

## 7. Conversational AI Architecture

### 7.1 Overview

Users interact with AI through a chat interface, not a one-way journal. The user describes their day in natural language, AI responds with proposed habit updates, and the user confirms. This is a multi-turn conversation, not a single inference call.

### 7.2 Provider Interface

```ts
interface InferenceProvider {
  chat(input: ChatInput): Promise<ChatOutput>;
}

interface ChatInput {
  messages: { role: 'user' | 'assistant'; content: string }[];
  habits: { id: string; name: string; aliases: string[] }[];
  date: string;
}

interface ChatOutput {
  reply: string;
  proposals: {
    ticks: Record<string, { confidence: number; evidence?: string; sessions?: number }>;
    newHabits: { name: string; emoji?: string; kind?: string; confidence: number; reason?: string }[];
  };
  tokenCount: number;
  shouldWrap: boolean;
}
```

### 7.3 Session Management

```
User opens app
  → Check for active conversation (ended_at IS NULL)
  → If exists AND same date AND token budget OK → resume session, load messages
  → If exists BUT different date → wrap old session, start new
  → If exists BUT token budget exceeded → wrap old session, start new
  → If none exists → start new session

AI can also signal session wrap:
  → ChatOutput.shouldWrap = true when context shift detected
  → App suggests "Start new session?" to user
```

**Auto-wrap triggers:**
1. **Token budget** — `token_count` exceeds threshold (configured per provider). Wrap + start fresh to reduce cost.
2. **Context shift** — AI detects user is talking about a different day or unrelated topic. Returns `shouldWrap: true`.
3. **Idle timeout** — No messages for N minutes (enforced in application logic). Wrap on next user message.

### 7.4 Conversation Flow

```
User: "Ran 5km this morning, read two chapters of Atomic Habits"
  → POST /api/conversations/:id/messages { role: 'user', content: '...' }
  → Load conversation messages from DB
  → Load user's active habits + aliases
  → Send to InferenceProvider.chat()
  → AI responds: "Nice! I see Workout (5km run) and Reading (2 chapters).
                   Want me to update these?"
  → Save both messages to DB
  → Return reply + proposals to frontend
  → Frontend renders reply + proposal cards
  → User confirms → habit_logs updated

User: "Actually I also meditated for 10 minutes"
  → Same conversation, full history sent as context
  → AI: "Got it — adding Meditate too. Updated list: Workout ✅, Reading ✅, Meditate ✅"
```

### 7.5 Provider Selection

```
User has no AI config → LocalProvider (regex matching, no conversation — instant proposals)
User has AI config    → Factory creates provider from config (Claude/Gemini/Groq)
API key invalid       → Fallback to LocalProvider, notify user
```

LocalProvider is non-conversational: it parses the user's message with regex and returns proposals immediately without an AI reply. Chat UI still works but shows proposals without assistant messages.

### 7.6 Privacy Guarantees

- AI chat is opt-in. Default is LocalProvider (no data leaves the server).
- API keys stored encrypted at rest (AES-256-GCM).
- Chat messages sent to LLM only when user has explicitly configured a provider.
- Conversation history stored in DB for session continuity. Users can delete conversations.
- No telemetry, no analytics, no third-party data sharing.

---

## 8. PWA Configuration

| Feature | Implementation |
|---------|---------------|
| Manifest | `public/manifest.json` — app name, icons (192, 512px), theme color (`#ffffff`), background color (`#f7f6f3`) |
| Service Worker | `next-pwa` plugin — precache app shell, offline fallback page |
| iOS Support | `<meta name="apple-mobile-web-app-capable" content="yes">`, apple-touch-icon |
| Install Prompt | Automatic browser prompt on repeated visits |
| Offline | Cached shell + "You're offline" message for API-dependent features |

---

## 9. Local Development

### 9.1 Docker Compose (Postgres only)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: habit
      POSTGRES_PASSWORD: habit_dev
      POSTGRES_DB: habit_tracker
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 9.2 Dev Commands

```bash
pnpm install                  # Install all workspace dependencies
docker compose up -d          # Start Postgres
pnpm db:push                  # Push Drizzle schema to Postgres
pnpm dev                      # Start API (port 4000) + Web (port 3000) via Turborepo
pnpm test                     # Run all tests
pnpm typecheck                # Type check all packages
pnpm lint                     # Lint all packages
```

---

## 10. Deployment (Railway)

### 10.1 Services

| Railway Service | Source | Port |
|----------------|--------|------|
| `web` | `apps/web` | 3000 |
| `api` | `apps/api` | 4000 |
| `postgres` | Railway managed | 5432 |

### 10.2 Environment Variables

**API service:**
```
DATABASE_URL=postgresql://...    # Railway-provided
JWT_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
ENCRYPTION_KEY=<generated>       # For API key encryption
CORS_ORIGIN=https://<web-url>
```

**Web service:**
```
NEXT_PUBLIC_API_URL=https://<api-url>
```

### 10.3 Deploy Flow

```
git push origin main
  → Railway detects changes
  → Builds apps/api and apps/web in parallel
  → Runs Drizzle migrations
  → Deploys both services
```

---

## 11. Testing Strategy

| Layer | Scope | Database | Runner |
|-------|-------|----------|--------|
| **Unit** | Services, utilities, providers | Mocked repositories | `vitest` |
| **Integration** | Repositories, API routes | Real Postgres (Docker) | `vitest` |
| **Component** | React components | None | `vitest` + `jsdom` |

TDD workflow: write test → see it fail → implement → green → refactor.

---

## 12. Implementation Slices (Suggested Order)

| # | Slice | What Ships |
|---|-------|-----------|
| 1 | **Monorepo scaffold** | pnpm workspaces, Turborepo, Docker Compose, empty apps |
| 2 | **Database + schema** | Drizzle schema, migrations, Postgres running |
| 3 | **Auth** | Register, login, JWT middleware, protected routes |
| 4 | **Habits CRUD** | Create, list, archive, toggle habits via API |
| 5 | **Today view** | Otter DS Sidebar + Habits + DateStrip, wired to API |
| 6 | **Chat + AI** | Conversation UI, session management, provider abstraction, local provider |
| 7 | **BYO key config** | Settings page, API key encryption, provider selection |
| 8 | **Calendar + Heatmap** | Month grid, heatmap data from API |
| 9 | **Weekly Review** | Stats, reflection, review view |
| 10 | **PWA** | Manifest, service worker, offline fallback |
| 11 | **Deploy** | Railway setup, CI/CD pipeline |

Each slice is a deployable increment. Slices 1-5 get you to a working app.
