# Habit Tracker

A privacy-first habit tracking app with optional AI-powered journaling. Built as a pnpm monorepo with a Hono API backend, Next.js frontend, and PostgreSQL database.

## Quick Start

```bash
pnpm install
docker compose up -d          # Start Postgres
pnpm --filter @habit-tracker/api db:push   # Apply schema
pnpm dev                      # API on :4000, Web on :3000
```

## Architecture

```
apps/api/         Hono REST API — JWT auth, Drizzle ORM, AI provider abstraction
apps/web/         Next.js 16 — App Router, Otter DS (Notion-inspired), PWA
packages/shared/  Shared TypeScript types, Zod schemas, constants
```

## Features

- **Daily habit tracking** — Binary (done/not done) and session-based (count) habits
- **Conversational AI** — Chat about your day, habits inferred from conversation
- **Privacy-first** — Default local regex inference (no API calls). BYO API key for Claude, Gemini, Groq, or OpenAI
- **Calendar & heatmap** — Monthly grid view with completion history
- **Weekly review** — Stats and reflection journaling
- **PWA** — Installable, offline-capable
- **JWT auth** — Email/password with refresh token rotation

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Otter DS |
| Backend | Hono, Hono RPC |
| Database | PostgreSQL 16, Drizzle ORM |
| Auth | JWT (access + refresh tokens), bcrypt |
| AI | Claude, Gemini, Groq, OpenAI, Local regex |
| Monorepo | pnpm workspaces, Turborepo |
| Deployment | Railway (auto-deploy) |

## Development

```bash
pnpm dev            # Start all apps
pnpm test           # Run all tests
pnpm typecheck      # Type check
pnpm lint           # Lint
```

### Database

```bash
docker compose up -d                              # Start Postgres
pnpm --filter @habit-tracker/api db:push          # Push schema
pnpm --filter @habit-tracker/api db:generate      # Generate migrations
pnpm --filter @habit-tracker/api db:studio        # Drizzle Studio GUI
```

## Documentation

- [Architecture](docs/v2/ARCHITECTURE.md)
- [Database Design](docs/v2/DATABASE.md)
- [Product Requirements](docs/v2/PRD.md)
