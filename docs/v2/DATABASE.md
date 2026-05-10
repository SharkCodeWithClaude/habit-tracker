# Habit Tracker V2 — Database Schema

> **Status:** Awaiting approval
> **Date:** 2026-05-09
> **Engine:** PostgreSQL 16
> **ORM:** Drizzle
> **Normalization:** 3NF (Third Normal Form)

---

## Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌───────────────┐
│  users   │──1:N──│   habits     │──1:N──│  habit_logs   │
└──────────┘       └──────────────┘       └───────────────┘
     │                    │
     │               1:N  │
     │              ┌─────┘
     │              ▼
     │       ┌──────────────┐
     │       │ habit_aliases│
     │       └──────────────┘
     │
     ├──1:N──┌──────────────────┐       ┌──────────────┐
     │       │ conversations    │──1:N──│  messages    │
     │       └──────────────────┘       └──────────────┘
     │
     ├──1:N──┌──────────────────┐
     │       │ weekly_reviews   │
     │       └──────────────────┘
     │
     ├──1:N──┌──────────────────┐
     │       │ user_ai_configs  │
     │       └──────────────────┘
     │
     └──1:N──┌──────────────────┐
             │ refresh_tokens   │
             └──────────────────┘
```

---

## Tables

### 1. `users`

Stores registered user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unique user identifier |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | Login email |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | bcrypt hash |
| `display_name` | `VARCHAR(100)` | `NULL` | Optional display name |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Account creation time |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Last profile update |

**Indexes:**
- `users_email_idx` — `UNIQUE` on `email` (implicit from constraint)

---

### 2. `habits`

Stores habit definitions. Each habit belongs to one user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unique habit identifier |
| `user_id` | `UUID` | `NOT NULL`, `FK → users(id) ON DELETE CASCADE` | Owning user |
| `name` | `VARCHAR(200)` | `NOT NULL` | Habit display name |
| `emoji` | `VARCHAR(10)` | `NOT NULL`, `DEFAULT '✅'` | Habit icon emoji |
| `kind` | `VARCHAR(10)` | `NOT NULL`, `DEFAULT 'binary'`, `CHECK (kind IN ('binary', 'session'))` | Tracking type |
| `sort_order` | `INTEGER` | `NOT NULL`, `DEFAULT 0` | Display ordering |
| `archived_at` | `TIMESTAMPTZ` | `NULL` | Soft delete timestamp |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Creation time |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Last modification |

**Indexes:**
- `habits_user_active_idx` — on `(user_id, archived_at)` WHERE `archived_at IS NULL` (partial index for active habits)
- `habits_user_sort_idx` — on `(user_id, sort_order)`

**Notes:**
- `kind = 'binary'`: habit is done or not done (e.g., "Meditate")
- `kind = 'session'`: habit tracks count per day (e.g., "Glasses of water")
- Archival is soft delete — `archived_at IS NULL` means active

---

### 3. `habit_aliases`

Lowercase keywords for AI inference matching. Normalized out of habits to support multiple aliases per habit.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unique alias identifier |
| `habit_id` | `UUID` | `NOT NULL`, `FK → habits(id) ON DELETE CASCADE` | Parent habit |
| `alias` | `VARCHAR(100)` | `NOT NULL` | Lowercase keyword (e.g., "ran", "running", "jog") |

**Indexes:**
- `habit_aliases_habit_idx` — on `(habit_id)`
- `habit_aliases_unique_idx` — `UNIQUE` on `(habit_id, alias)`

**Notes:**
- All aliases stored lowercase for case-insensitive matching
- Used by both LocalProvider (regex) and LLM providers (included in prompt context)

---

### 4. `habit_logs`

Records habit completions per day. One row per habit per day.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unique log identifier |
| `habit_id` | `UUID` | `NOT NULL`, `FK → habits(id) ON DELETE CASCADE` | Logged habit |
| `date` | `DATE` | `NOT NULL` | Day of completion |
| `value` | `INTEGER` | `NOT NULL`, `DEFAULT 1` | 1 for binary done, N for session count |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | When logged |

**Indexes:**
- `habit_logs_habit_date_idx` — `UNIQUE` on `(habit_id, date)` (one log per habit per day)
- `habit_logs_date_idx` — on `(date)` (for date-range queries: heatmap, review)

**Notes:**
- For `binary` habits: `value` is always 1 (row exists = done, no row = not done)
- For `session` habits: `value` is the session count (e.g., 3 glasses of water)
- Toggle logic: INSERT if not exists, DELETE if exists (binary) or UPDATE value (session)

---

### 5. `conversations`

Chat sessions between user and AI. Each conversation is scoped to a date and auto-wraps when idle or context shifts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unique conversation identifier |
| `user_id` | `UUID` | `NOT NULL`, `FK → users(id) ON DELETE CASCADE` | Owning user |
| `date` | `DATE` | `NOT NULL` | Which day this session is about |
| `started_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Session start time |
| `ended_at` | `TIMESTAMPTZ` | `NULL` | Session end time (NULL = active) |
| `token_count` | `INTEGER` | `NOT NULL`, `DEFAULT 0` | Running token usage for budget tracking |

**Indexes:**
- `conversations_user_active_idx` — on `(user_id)` WHERE `ended_at IS NULL` (find active session)
- `conversations_user_date_idx` — on `(user_id, date)` (list sessions for a day)

**Notes:**
- `ended_at IS NULL` = active session. Only one active session per user at a time (enforced in application logic).
- New session auto-starts when: (1) no active session exists, (2) token budget exceeded, (3) context shifted (different day or topic detected by AI).
- When a new session starts, the previous active session is wrapped (`ended_at = now()`).
- `token_count` updated after each AI response. Used to decide when to wrap for token budget reasons.

---

### 6. `messages`

Individual messages within a conversation. Stores the full chat history for context.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unique message identifier |
| `conversation_id` | `UUID` | `NOT NULL`, `FK → conversations(id) ON DELETE CASCADE` | Parent conversation |
| `role` | `VARCHAR(10)` | `NOT NULL`, `CHECK (role IN ('user', 'assistant'))` | Message sender |
| `content` | `TEXT` | `NOT NULL` | Message text |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | When sent |

**Indexes:**
- `messages_conversation_idx` — on `(conversation_id, created_at)` (load chat history in order)

**Notes:**
- Messages are append-only. No edits, no deletes (except cascade from conversation/user deletion).
- AI responses include structured proposals (habit ticks, new habits) embedded in the message. Proposals are parsed client-side for UI rendering.
- Chat history from the active conversation is sent as context to the AI provider on each user message.

---

### 8. `weekly_reviews`

Weekly reflection text. One review per user per week.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unique review identifier |
| `user_id` | `UUID` | `NOT NULL`, `FK → users(id) ON DELETE CASCADE` | Owning user |
| `week_start` | `DATE` | `NOT NULL` | Monday of the review week |
| `reflection` | `TEXT` | `NOT NULL`, `DEFAULT ''` | Review reflection text |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | First created |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Last edit |

**Indexes:**
- `weekly_reviews_user_week_idx` — `UNIQUE` on `(user_id, week_start)` (one review per user per week)

**Notes:**
- `week_start` is always a Monday (enforced in application logic)
- Stats (completion %, best/worst habit) are computed at query time, not stored
- Upsert on save: INSERT ON CONFLICT (user_id, week_start) DO UPDATE

---

### 9. `user_ai_configs`

Stores user's AI provider configuration. BYO Key model.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unique config identifier |
| `user_id` | `UUID` | `NOT NULL`, `FK → users(id) ON DELETE CASCADE` | Owning user |
| `provider` | `VARCHAR(50)` | `NOT NULL`, `CHECK (provider IN ('claude', 'gemini', 'groq', 'openai'))` | AI provider name |
| `api_key_encrypted` | `TEXT` | `NOT NULL` | AES-256-GCM encrypted API key |
| `model_name` | `VARCHAR(100)` | `NULL` | Optional model override (e.g., "claude-sonnet-4-6") |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT true` | Whether this config is the active provider |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Config creation time |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Last modified |

**Indexes:**
- `user_ai_configs_user_provider_idx` — `UNIQUE` on `(user_id, provider)` (one config per provider per user)
- `user_ai_configs_active_idx` — on `(user_id)` WHERE `is_active = true` (quick lookup of active provider)

**Notes:**
- Only one config should be `is_active = true` per user (enforced in application logic)
- `api_key_encrypted` uses AES-256-GCM with a server-side encryption key
- When user sets a provider, any previously active config is set to `is_active = false`
- If no config exists, LocalProvider (regex) is used — no row needed

---

### 10. `refresh_tokens`

Stores hashed refresh tokens for JWT auth rotation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | `PK`, `DEFAULT gen_random_uuid()` | Unique token identifier |
| `user_id` | `UUID` | `NOT NULL`, `FK → users(id) ON DELETE CASCADE` | Token owner |
| `token_hash` | `VARCHAR(255)` | `NOT NULL` | SHA-256 hash of the refresh token |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Token expiration (7 days from creation) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT now()` | Token creation time |

**Indexes:**
- `refresh_tokens_hash_idx` — on `(token_hash)` (lookup on refresh)
- `refresh_tokens_user_idx` — on `(user_id)` (revoke all tokens for a user)
- `refresh_tokens_expires_idx` — on `(expires_at)` (cleanup expired tokens)

**Notes:**
- Raw token sent to client in HTTP-only cookie; only the hash is stored
- On refresh: validate hash, check expiry, issue new access token + rotate refresh token
- On logout: delete the token row
- Periodic cleanup: DELETE WHERE expires_at < now()

---

## Normalization Compliance (3NF)

| Rule | Compliance |
|------|-----------|
| **1NF** — Atomic values, no repeating groups | All columns are atomic. Aliases normalized to separate table instead of array column. |
| **2NF** — No partial dependencies | All non-key columns depend on the full primary key (all PKs are single-column UUIDs). |
| **3NF** — No transitive dependencies | No column depends on a non-key column. Stats (streaks, completion %) are computed, not stored. |

---

## Cascade Behavior

| Parent | Child | On Delete |
|--------|-------|-----------|
| `users` | `habits` | `CASCADE` — delete user deletes all their habits |
| `users` | `conversations` | `CASCADE` |
| `users` | `weekly_reviews` | `CASCADE` |
| `users` | `user_ai_configs` | `CASCADE` |
| `users` | `refresh_tokens` | `CASCADE` |
| `habits` | `habit_logs` | `CASCADE` — archive/delete habit removes logs |
| `habits` | `habit_aliases` | `CASCADE` — delete habit removes aliases |
| `conversations` | `messages` | `CASCADE` — delete conversation deletes all messages |

---

## Key Queries (Expected Access Patterns)

| Query | Tables | Index Used |
|-------|--------|-----------|
| Get active habits for user | `habits` | `habits_user_active_idx` |
| Get today's logs for user | `habit_logs` JOIN `habits` | `habit_logs_habit_date_idx` |
| Get active conversation | `conversations` | `conversations_user_active_idx` |
| Load chat history | `messages` | `messages_conversation_idx` |
| Get conversations for date | `conversations` | `conversations_user_date_idx` |
| Get weekly review | `weekly_reviews` | `weekly_reviews_user_week_idx` |
| Compute streak | `habit_logs` | `habit_logs_habit_date_idx` (range scan) |
| Heatmap (N weeks) | `habit_logs` JOIN `habits` | `habit_logs_date_idx` + `habits_user_active_idx` |
| Get active AI provider | `user_ai_configs` | `user_ai_configs_active_idx` |
| Refresh token lookup | `refresh_tokens` | `refresh_tokens_hash_idx` |
| Aliases for inference | `habit_aliases` JOIN `habits` | `habit_aliases_habit_idx` |

---

## SQL DDL (Reference)

```sql
-- 1. Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Habits
CREATE TABLE habits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    emoji           VARCHAR(10) NOT NULL DEFAULT '✅',
    kind            VARCHAR(10) NOT NULL DEFAULT 'binary'
                    CHECK (kind IN ('binary', 'session')),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    archived_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX habits_user_active_idx ON habits (user_id, archived_at)
    WHERE archived_at IS NULL;
CREATE INDEX habits_user_sort_idx ON habits (user_id, sort_order);

-- 3. Habit Aliases
CREATE TABLE habit_aliases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id        UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    alias           VARCHAR(100) NOT NULL,
    UNIQUE (habit_id, alias)
);

CREATE INDEX habit_aliases_habit_idx ON habit_aliases (habit_id);

-- 4. Habit Logs
CREATE TABLE habit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id        UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    value           INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (habit_id, date)
);

CREATE INDEX habit_logs_date_idx ON habit_logs (date);

-- 5. Conversations
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at        TIMESTAMPTZ,
    token_count     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX conversations_user_active_idx ON conversations (user_id)
    WHERE ended_at IS NULL;
CREATE INDEX conversations_user_date_idx ON conversations (user_id, date);

-- 6. Messages
CREATE TABLE messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id   UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role              VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content           TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_conversation_idx ON messages (conversation_id, created_at);

-- 7. Weekly Reviews
CREATE TABLE weekly_reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start      DATE NOT NULL,
    reflection      TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, week_start)
);

-- 8. User AI Configs
CREATE TABLE user_ai_configs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(50) NOT NULL
                        CHECK (provider IN ('claude', 'gemini', 'groq', 'openai')),
    api_key_encrypted   TEXT NOT NULL,
    model_name          VARCHAR(100),
    is_active           BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, provider)
);

CREATE INDEX user_ai_configs_active_idx ON user_ai_configs (user_id)
    WHERE is_active = true;

-- 9. Refresh Tokens
CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX refresh_tokens_hash_idx ON refresh_tokens (token_hash);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_expires_idx ON refresh_tokens (expires_at);
```

---

## Future Tables (Not Built Now)

These tables will be added when the app expands. Listed here to confirm the schema design accommodates them without restructuring:

| Table | Purpose | Relation |
|-------|---------|----------|
| `categories` | Organize habits, transactions, goals | `users` 1:N |
| `transactions` | Income/expense records | `users` 1:N, `categories` N:1 |
| `budgets` | Monthly budget targets per category | `users` 1:N, `categories` N:1 |
| `goals` | Long-term goals with milestones | `users` 1:N |
| `goal_milestones` | Progress checkpoints within a goal | `goals` 1:N |

No structural changes to existing tables will be needed — these are additive.
