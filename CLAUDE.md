# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Monorepo (run from root)
pnpm dev              # Start all apps (web :3000, api :4000)
pnpm build            # Build all apps
pnpm test             # Run all tests
pnpm typecheck        # Type check all packages
pnpm lint             # Lint all packages

# Database (run from root or apps/api)
pnpm --filter @habit-tracker/api db:push       # Push Drizzle schema to Postgres
pnpm --filter @habit-tracker/api db:generate   # Generate migration files
pnpm --filter @habit-tracker/api db:studio     # Open Drizzle Studio GUI

# Infrastructure
docker compose up -d  # Start Postgres 16 (port 5432, user=habit, db=habit_tracker)

# Run a single test file
pnpm --filter @habit-tracker/api exec vitest run __tests__/auth.test.ts
pnpm --filter @habit-tracker/web exec vitest run src/__tests__/api.test.ts
```

## Architecture

pnpm monorepo with Turborepo. Three workspaces:

```
apps/api/       Hono backend (port 4000) — REST API, JWT auth, Drizzle + Postgres
apps/web/       Next.js 16 frontend (port 3000) — App Router, Otter DS, PWA
packages/shared/ Shared TypeScript types, Zod schemas, constants
```

### Backend (`apps/api/src/`)

Layered architecture: **Routes → Services → Repositories → Drizzle/Postgres**

- `routes/` — HTTP handlers. Parse request, validate with Zod, call service, return response. 5 modules: auth, habits, conversations, reviews, ai-config.
- `services/` — Business logic and orchestration. 6 modules: auth, habit, conversation, inference, review, ai-config.
- `repositories/` — Data access via Drizzle ORM. One per domain entity. Services never see SQL.
- `providers/` — AI inference abstraction (Strategy pattern). Implementations: Claude, Gemini, Groq, OpenAI, Local (regex fallback). Factory in `provider.factory.ts`.
- `middleware/` — JWT auth middleware. Extracts Bearer token, attaches `userId` to Hono context.
- `db/schema.ts` — Drizzle schema definitions (10 tables). Migrations via `drizzle-kit`.
- `config/` — Database connection (`database.ts`), environment variables (`env.ts`), AI provider config.
- `lib/` — Auth utilities (JWT signing, bcrypt), encryption (AES-256-GCM for API keys).

### Frontend (`apps/web/src/`)

- `app/` — Next.js App Router pages: today (main dashboard), calendar, settings, login, register, offline fallback.
- `lib/api.ts` — HTTP client wrapping `fetch` with auth headers. Domain-specific functions for habits, conversations, reviews.
- `lib/auth.ts` — React AuthContext. JWT stored in localStorage + cookie. Auto-refresh on load.
- `lib/chat.ts` — Chat logic, proposal extraction from AI responses.
- `otter-ds/` — Notion-inspired design system. Components: Sidebar, DateStrip, Habits, Proposals, Journal, Login, Icon. Styles via CSS variables in `styles/tokens.css`.
- `middleware.ts` — Auth redirect middleware.

### Shared (`packages/shared/src/`)

- `types/` — Domain interfaces: Habit, Conversation, Message, WeeklyReviewStats, ChatInput/Output, AiConfigPublic.
- `schemas/` — Zod validation schemas for all API inputs (auth, habits, conversations, reviews, ai-config).
- `constants/` — AI provider list, default model names.

## Key Patterns

- **SOLID throughout**: Single-responsibility layering, open/closed via provider interfaces, dependency inversion with constructor injection.
- **Strategy + Factory**: AI providers implement `InferenceProvider` interface. `createInferenceProvider(config)` returns correct implementation.
- **Repository pattern**: All data access behind typed repository methods. Services orchestrate, repos query.
- **Soft delete**: Habits archived via `archived_at` timestamp.
- **Conversation sessions**: Auto-wrap when token budget exceeded (4000 tokens) or context shifts. Active session = `ended_at IS NULL`.
- **Privacy-first AI**: Default is LocalProvider (regex, no API call). LLM providers opt-in via BYO API key, encrypted at rest with AES-256-GCM.
- **JWT auth**: 15-min access tokens, 7-day refresh tokens (hashed in DB, rotated on use).

## Database

PostgreSQL 16 via Docker. Schema in `apps/api/src/db/schema.ts` (Drizzle ORM).

10 tables: users, habits, habit_aliases, habit_logs, conversations, messages, weekly_reviews, user_ai_configs, refresh_tokens.

All child entities cascade-delete from users. Habit IDs are integers, user IDs are UUIDs.

## Styling

Otter DS — Notion-inspired design system using CSS custom properties (`--color-*`, `--spacing-*`). Fonts: Inter (sans) + Newsreader (serif). Class prefix: `otr-`. No Tailwind in component code (plain CSS).

## Testing

Vitest across all packages. API tests in `apps/api/__tests__/`, web tests in `apps/web/src/__tests__/`. Integration tests require Docker Postgres (skipped gracefully when unavailable). TDD workflow: red → green → refactor.

## Environment Variables

API requires: `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`. Optional: `BCRYPT_ROUNDS` (default 10), `TOKEN_BUDGET_THRESHOLD` (default 4000), `CORS_ORIGIN`.

Web requires: `NEXT_PUBLIC_API_URL` (default http://localhost:4000).

## Docs

Architecture decisions, database design, and PRD in `docs/v2/`.
