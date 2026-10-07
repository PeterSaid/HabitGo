# HabitGo — Architecture & Project Structure

## Stack decision (spec §67, §80)

| Requirement | Choice | Why |
|---|---|---|
| Cross-platform app | **React 18 + TS + Vite in Capacitor 6** | The execution environment had Node only (no Flutter/Java/Android toolchain preinstalled). Capacitor ships a real native Android shell (WebView + plugins) from the same codebase; the web build is itself fully testable on any phone browser. Flutter/RN were not installable here without multi-GB toolchains; Capacitor needed only the SDK that was added during this build. |
| Backend | **Node.js + Express** | Same runtime as the app toolchain; single-language repo. |
| Database | **SQLite via `node:sqlite`** | Real relational DB with zero native dependencies and zero setup. The schema is standard SQL and migrates cleanly to PostgreSQL/Supabase. |
| Auth | **JWT + bcrypt** | Stateless sessions, standard security posture. |
| Hosting path | Self-hosted Express (deployable to any Node host) with a documented Supabase migration path | Supabase/GitHub need account credentials only the product owner can provide. |

## Server-side business rule (spec §35, §95)

The client never computes points. `POST /habits/:id/complete` runs the pipeline:

```
validate (schedule, date window, duplicate, caps)
→ upsert habit_logs (UNIQUE habit+date = idempotent)
→ compute points (difficulty base × progress, daily cap enforced)
→ insert points_transactions (+ earn / bonus rows)
→ update points_wallets (available, lifetime, earned_today)
→ recompute habit streak + user streak + perfect-day chain
→ award streak/perfect milestones + challenge progress
→ evaluate achievements (unlock + bonus + notification)
→ return full new state (UI renders +points 🎉)
```

Redemptions mirror this: validate balance/stock/expiry → hold points (pending transaction) → code rewards complete instantly, manual/cash become admin-reviewable requests.

## Anti-cheat (spec §36)

- `daily_points_cap` (admin-editable, default 500/day)
- Completion backfill limited to 7 days; uncomplete only within `completion_edit_cutoff_hours` (24h)
- Duplicate completions rejected by DB constraint; absurd volumes capped (`max_completions_per_day`)
- Every balance change is a transaction row; `audit_logs` records auth, admin actions, deletions
- Architecture leaves room for verification providers (photo proof, Health Connect, partner APIs)

## Backend layout

```
backend/src/
├── index.js / app.js        # express wiring, CORS, rate limit, error normalization
├── config.js                # env + default system settings
├── db.js                    # node:sqlite, migrations, app_settings helpers
├── schema.sql               # 21 tables (spec §62), WAL, FK cascades, indexes
├── seed.js                  # static data + Peter's 30-day history (§72–73)
├── middleware/              # requireAuth (JWT), requireAdmin, rateLimit, audit
├── services/
│   ├── points.js            # complete/uncomplete orchestration
│   ├── streaks.js           # schedules, streak walking, perfect days
│   ├── wallet.js            # transactions, XP/levels, holds & refunds
│   ├── achievements.js      # condition evaluation + unlocks
│   ├── challenges.js        # join + progress recompute
│   ├── stats.js             # dashboard, statistics, calendar aggregation
│   └── notifications.js     # bilingual notification writer
└── routes/                  # auth, users, habits, meta, dashboard, rewards, engagement, admin
```

## App layout

```
app/src/
├── theme/tokens.css         # light/dark design tokens (spec §06–07, §14–15)
├── theme/components.css     # component library styles (buttons → sheets → calendar)
├── ui/components.tsx        # Button/Card/Input/Sheet/Toast/States (spec §13, §16, §94)
├── ui/charts.tsx            # SVG bar/line/donut/heatmap (spec §50)
├── ui/HabitIcon.tsx         # icon + category color mapping
├── i18n/                    # ar/en dictionaries, RTL provider (spec §17, §78)
├── state/store.tsx          # session, unread count, online status
├── api/client.ts            # fetch wrapper, JWT, offline queue (spec §61)
├── layouts/AppLayout.tsx    # bottom nav, FAB, offline banner, reminders
└── features/                # 30+ screens grouped by domain
```

## Data integrity guarantees

- `habit_logs UNIQUE(habit_id, date)` → double-completion is impossible, offline replays are idempotent
- Wallet arithmetic is always paired with a transaction row (spec §65)
- `points_wallets.pending` holds redeemed points until an admin completes or rejects (refunds restore balance)
- User deletion cascades everything (spec §21, §89), with an audit entry
