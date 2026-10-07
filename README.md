# HabitGo 🌱

**Build Better Habits. Earn Real Rewards.**
**كوّن عادات أفضل. واكسب مكافآت حقيقية.**

A functional habit-tracking MVP with a real rewards economy: complete habits → earn points → keep streaks → redeem real rewards. Full Arabic (RTL) / English (LTR), Light/Dark themes, real backend + database.

---

## Project Overview

HabitGo is not a UI mockup — it is a functional MVP:

| Layer | Tech | Where |
|---|---|---|
| Mobile app | React 18 + TypeScript + Vite, wrapped with **Capacitor 6** for Android | `app/` |
| API + business logic | **Node.js + Express**, all points/streak/redeem logic **server-side** | `backend/` |
| Database | **SQLite via libSQL** (`@libsql/client`) — local file by default, or hosted **Turso** with `DATABASE_URL` | `backend/data/habitgo.db` |
| Auth | JWT (30-day sessions) + bcrypt password hashing | `backend/src/routes/auth.js` |

The requirements specification (103 sections) lives in [`docs/requirements-spec.md`](docs/requirements-spec.md).

## Features

**Priority 1 (all implemented)**
- Real registration / login / logout / forgot-password / delete-account
- Habits: binary (yes/no) and quantitative (e.g. 8 cups of water) types
- Frequencies: every day, specific weekdays, X times/week, X times/month
- Server-side completion pipeline (spec §35): validate → habit log → points → transaction → wallet → streak → response
- Streaks per habit + user-level streak, milestone bonuses (3/7/14/30/60/100/365 days)
- Points wallet with available / pending / lifetime / redeemed + estimated value
- Every balance change recorded as a points transaction (spec §65)
- Rewards marketplace with categories, codes (instant) and manual/cash redemptions (admin-reviewed)
- Anti-cheat (spec §36): daily point cap, backfill window, uncomplete cutoff, spam guards, full audit log
- Arabic RTL + English LTR with dynamic layout direction, persisted per user
- Light / Dark / System themes with real token sets (spec §06–07), persisted per user

**Priority 2**
- Statistics: completion rates, weekly bars, monthly line, category performance, best/worst habits
- Month calendar view (completed / partial / missed / future)
- 11 achievements with automatic unlock + point bonuses
- 5 challenges with join/progress/completion bonuses
- Notification center + habit reminders (local notifications on Android)
- Offline mode: completions queue locally and sync automatically (idempotent)

**Priority 3**
- Admin area: overview, redemption review (approve/reject/complete), editable conversion rate & caps, broadcast notifications

## Screens

Splash · Onboarding (4) · Login · Register · Forgot/Reset · Personalization · Home dashboard · My Habits · Add/Edit Habit · Habit Details (+heatmap) · Calendar · Wallet · Transactions · Rewards · Reward Details · Redeem Confirm/Success · Redemption History · Statistics · Achievements · Challenges · Challenge Details · Notifications · Profile · Edit Profile · Settings · Appearance · Language · Notification Settings · Privacy · Help · Admin — plus empty/error/loading states everywhere.

## Folder Structure

```
habitgo/
├── app/                     # React + TypeScript (Vite)
│   ├── src/
│   │   ├── api/client.ts        # fetch wrapper, JWT, offline queue
│   │   ├── i18n/                # ar/en dictionaries + RTL provider
│   │   ├── theme/               # design tokens (light/dark), ThemeContext
│   │   ├── ui/                  # component library, SVG charts, icons
│   │   ├── state/store.tsx      # session/user state
│   │   ├── layouts/AppLayout.tsx# bottom nav + FAB + offline banner
│   │   └── features/            # screens by domain
│   ├── android/                 # Capacitor native project (APK builds)
│   └── capacitor.config.ts
├── backend/
│   ├── src/
│   │   ├── schema.sql           # full DDL (21 tables, spec §62)
│   │   ├── db.js                # node:sqlite + settings helpers
│   │   ├── services/            # points, streaks, wallet, achievements, challenges, stats
│   │   ├── routes/              # auth, users, habits, wallet, rewards, engagement, admin
│   │   ├── middleware/          # JWT auth, rate limit, errors + audit
│   │   └── seed.js              # categories, achievements, challenges, rewards, demo data
│   └── data/habitgo.db          # created on first run
└── docs/
```

## Quick Start

Prerequisites: **Node.js 22.5+** (built and tested on Node 24).

```bash
# 1. Backend
cd backend
npm install
npm run seed          # categories, achievements, challenges, rewards + demo users
npm start             # → http://localhost:4000

# 2. Web app (development)
cd ../app
npm install
npm run dev           # → http://localhost:5173  (proxies /api to :4000)
```

## Environment Variables

Backend (`backend/.env`, see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `DATABASE_URL` | local file DB | Turso URL (`libsql://…`) for hosted/permanent storage |
| `DATABASE_TOKEN` | — | Turso auth token (required with `DATABASE_URL`) |
| `JWT_SECRET` | dev value | **Change in production** |
| `JWT_EXPIRES_IN` | `30d` | Session length |
| `NODE_ENV` | `development` | `production` hides reset tokens |
| `CORS_ORIGINS` | `*` | Comma-separated origins for a locked-down deployment |
| `SEED_USER_PASSWORD` | `Peter@12345` | Demo user password |
| `SEED_ADMIN_PASSWORD` | `Admin@12345` | Demo admin password |

Frontend (`app`, optional `VITE_API_URL`): absolute API URL baked into native builds. **Important:** build the APK with `VITE_API_URL=https://your-host/api/v1` — there is no runtime server switch in the UI. Without it, native builds fall back to the emulator alias `http://10.0.2.2:4000/api/v1`.

## Backend API (v1)

`/api/v1` — auth (`register`, `login`, `forgot-password`, `reset-password`, `me`), users (`settings`, `personalization`, `export`, delete), habits (CRUD, `today`, `complete`, `uncomplete`, `logs`, `calendar/:month`), dashboard, wallet + transactions, rewards + redeem + redemptions, challenges (+join), achievements, notifications, statistics, and `/admin/*` (overview, users, rewards CRUD, redemption review, settings incl. `points_per_reward_unit`, broadcast). Health probe: `GET /api/health`.

Admin-editable system settings (never hardcoded client-side, spec §71): `points_per_reward_unit` (default 100 pts = 1 unit), `daily_points_cap` (500), `completion_edit_cutoff_hours` (24), `max_completions_per_day` (30).

## Database Setup

SQLite — zero setup. The schema (`backend/src/schema.sql`) is applied automatically on first boot; seed with `npm run seed` (or `npm run seed:fresh` to reset). The schema maps 1:1 to the spec's table list (§62): users, profiles, habits, habit_categories, habit_schedules, habit_logs, streaks, points_wallets, points_transactions, rewards, reward_categories, reward_partners, reward_redemptions, achievements, user_achievements, challenges, challenge_participants, notifications, user_settings, devices, audit_logs (+ app_settings).

To migrate to PostgreSQL/Supabase later: the SQL is standard; swap `db.js` for a Postgres client and replace the wallet/points updates with a transaction block — the service layer is already organized for this.

## Deploy Online (backend + hosted database)

The backend runs unchanged against a hosted **Turso** (libSQL) database — set `DATABASE_URL` + `DATABASE_TOKEN` and everything persists in the cloud. A [`render.yaml`](render.yaml) blueprint deploys the whole thing (backend + built web app, single origin) to Render free tier. Full Arabic step-by-step guide: **[docs/DEPLOY-AR.md](docs/DEPLOY-AR.md)** — includes seeding the hosted DB, wiring the APK to the deployed URL (login screen → "API server"), and how to browse/edit the hosted data.

## Brand Assets

All app icons (launcher, adaptive, round), splash screens (native + PWA) are generated from the master logo:

```bash
cd app && node scripts/generate-icons.cjs   # reads D:/Frame 2608648.png, writes app/src/assets, public/, android res/
```

The web build also ships a PWA manifest (`public/manifest.webmanifest`) with regular + maskable icons, so installing from a browser uses the same brand icon.

## How to Build the Android APK

Prerequisites: JDK 17 and the Android SDK (see `docs/BUILD-APK.md` for a from-scratch toolchain setup).

```bash
cd app
npm run build              # web bundle → dist/
npx cap sync android       # copy web assets into the native project
cd android
./gradlew assembleDebug    # → app/build/outputs/apk/debug/app-debug.apk
# release (signed with the generated demo keystore, see docs/BUILD-APK.md):
./gradlew assembleRelease  # → app/build/outputs/apk/release/app-release.apk
```

On an emulator the app reaches the API at `http://10.0.2.2:4000/api/v1` automatically. On a physical device, open the login screen → "API server" → enter `http://<your-pc-LAN-IP>:4000/api/v1`.

## Test Accounts (spec §86)

| Role | Email | Password |
|---|---|---|
| User | `peter@habitgo.app` | `Peter@12345` |
| Admin | `admin@habitgo.app` | `Admin@12345` |

Peter comes seeded (§72–73): 5 habits, 30 days of realistic history, **4,850 points**, 12-day streak, Level 3, one completed redemption, active challenge — and 2 of 5 habits left incomplete "today" so you can complete them yourself and watch points/streaks/transactions update live.

## Known Limitations (MVP)

- **No real money movement.** Cash redemptions create reviewable requests (spec §42); wiring a payment gateway needs credentials + legal setup.
- **No email/SMS delivery** — forgot-password exposes the reset token in non-production responses only.
- **Supabase not wired** — the spec allows an equivalent stack (§67); SQLite+JWT was chosen for a self-contained, dependency-free runtime. The schema and service layer are Supabase-migration-friendly.
- Streak-milestone bonuses are not clawed back when a completion is reverted within the edit window.
- Rate limiting is in-memory (single process); add Redis when scaling out.
- Reminder notifications require the Android app (web falls back to in-app "due soon" hints).

## Future Improvements (spec §96)

Social challenges & leaderboards · Health Connect / wearables integrations · partner validation & photo proof · referral system · premium subscriptions · AI habit coach. The architecture keeps these additive (audit logs, activity streams, and validation hooks are already in place).

---

HabitGo · Lifestyle + Productivity + Rewards
