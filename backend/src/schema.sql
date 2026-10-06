-- ============================================================
-- HabitGo — SQLite schema (all timestamps ISO-8601 UTC strings)
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------- Identity ----------
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended')),
  date_of_birth TEXT,
  gender        TEXT,
  country       TEXT,
  city          TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  bio         TEXT,
  timezone    TEXT NOT NULL DEFAULT 'UTC',
  xp          INTEGER NOT NULL DEFAULT 0,
  interests   TEXT NOT NULL DEFAULT '[]',   -- JSON array of habit category ids
  onboarded   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id              TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  locale               TEXT NOT NULL DEFAULT 'ar' CHECK (locale IN ('ar','en')),
  theme                TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  notifications_enabled INTEGER NOT NULL DEFAULT 1,
  reminders_enabled    INTEGER NOT NULL DEFAULT 1,
  weekly_report        INTEGER NOT NULL DEFAULT 0,
  updated_at           TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL DEFAULT 'web',
  token      TEXT,
  last_seen  TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- ---------- Habits ----------
CREATE TABLE IF NOT EXISTS habit_categories (
  id         TEXT PRIMARY KEY,
  name_en    TEXT NOT NULL,
  name_ar    TEXT NOT NULL,
  icon       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS habits (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  category_id TEXT REFERENCES habit_categories(id),
  icon        TEXT NOT NULL DEFAULT 'star',
  color       TEXT NOT NULL DEFAULT '#22C55E',
  type        TEXT NOT NULL DEFAULT 'binary' CHECK (type IN ('binary','quantitative')),
  goal_value  INTEGER,
  goal_unit   TEXT,
  difficulty  TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  points      INTEGER NOT NULL DEFAULT 20,
  start_date  TEXT NOT NULL,
  end_date    TEXT,
  is_paused   INTEGER NOT NULL DEFAULT 0,
  is_deleted  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id, is_deleted);

CREATE TABLE IF NOT EXISTS habit_schedules (
  id              TEXT PRIMARY KEY,
  habit_id        TEXT NOT NULL UNIQUE REFERENCES habits(id) ON DELETE CASCADE,
  freq_type       TEXT NOT NULL CHECK (freq_type IN ('daily','weekly_days','times_per_week','times_per_month')),
  days_of_week    TEXT,          -- e.g. "1,3,5" (ISO weekday 1=Mon..7=Sun)
  times_per_week  INTEGER,
  times_per_month INTEGER,
  reminder_time   TEXT,          -- "21:00"
  reminder_days   TEXT,          -- e.g. "1,2,3,4,5,6,7"
  reminder_message TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id              TEXT PRIMARY KEY,
  habit_id        TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,  -- YYYY-MM-DD (local to user timezone)
  target          INTEGER NOT NULL DEFAULT 1,
  completed_value INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','completed','missed')),
  points_earned   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  UNIQUE (habit_id, date)
);
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON habit_logs(user_id, date);

CREATE TABLE IF NOT EXISTS streaks (
  id                  TEXT PRIMARY KEY,
  habit_id            TEXT NOT NULL UNIQUE REFERENCES habits(id) ON DELETE CASCADE,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_streak      INTEGER NOT NULL DEFAULT 0,
  best_streak         INTEGER NOT NULL DEFAULT 0,
  last_completed_date TEXT,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_streaks (
  user_id             TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak      INTEGER NOT NULL DEFAULT 0,
  best_streak         INTEGER NOT NULL DEFAULT 0,
  perfect_day_streak  INTEGER NOT NULL DEFAULT 0,
  best_perfect_day    INTEGER NOT NULL DEFAULT 0,
  last_active_date    TEXT,
  last_perfect_date   TEXT,
  updated_at          TEXT NOT NULL
);

-- ---------- Points / Wallet ----------
CREATE TABLE IF NOT EXISTS points_wallets (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  available   INTEGER NOT NULL DEFAULT 0,
  pending     INTEGER NOT NULL DEFAULT 0,
  lifetime    INTEGER NOT NULL DEFAULT 0,
  redeemed    INTEGER NOT NULL DEFAULT 0,
  earned_today_date TEXT,
  earned_today      INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS points_transactions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('earn','bonus','redeem','refund','adjustment')),
  source_type TEXT NOT NULL CHECK (source_type IN ('habit_log','streak_bonus','perfect_bonus','challenge','achievement','redemption','referral','admin')),
  source_id   TEXT,
  points      INTEGER NOT NULL,          -- signed: + earn, - redeem
  status      TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','pending')),
  description TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON points_transactions(user_id, created_at DESC);

-- ---------- Rewards ----------
CREATE TABLE IF NOT EXISTS reward_partners (
  id      TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  logo    TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS reward_categories (
  id         TEXT PRIMARY KEY,
  name_en    TEXT NOT NULL,
  name_ar    TEXT NOT NULL,
  icon       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS rewards (
  id              TEXT PRIMARY KEY,
  partner_id      TEXT REFERENCES reward_partners(id) ON DELETE SET NULL,
  category_id     TEXT REFERENCES reward_categories(id),
  name_en         TEXT NOT NULL,
  name_ar         TEXT NOT NULL,
  description_en  TEXT NOT NULL,
  description_ar  TEXT NOT NULL,
  image           TEXT,
  points_cost     INTEGER NOT NULL,
  stock           INTEGER,               -- NULL = unlimited
  expiry_date     TEXT,
  terms_en        TEXT,
  terms_ar        TEXT,
  redemption_type TEXT NOT NULL DEFAULT 'code' CHECK (redemption_type IN ('code','manual','cash')),
  cash_amount     REAL,                  -- reward units, for cash type
  is_active       INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id      TEXT NOT NULL REFERENCES rewards(id),
  points_cost    INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  redemption_code TEXT,
  notes          TEXT,
  requested_at   TEXT NOT NULL,
  approved_at    TEXT,
  completed_at   TEXT
);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON reward_redemptions(user_id, requested_at DESC);

-- ---------- Gamification ----------
CREATE TABLE IF NOT EXISTS achievements (
  id              TEXT PRIMARY KEY,
  name_en         TEXT NOT NULL,
  name_ar         TEXT NOT NULL,
  description_en  TEXT NOT NULL,
  description_ar  TEXT NOT NULL,
  icon            TEXT NOT NULL,
  points_bonus    INTEGER NOT NULL DEFAULT 0,
  xp_bonus        INTEGER NOT NULL DEFAULT 0,
  condition_type  TEXT NOT NULL CHECK (condition_type IN ('habit_count','habit_streak','user_streak','total_completions','perfect_days','redeem_count','category_completions','early_bird')),
  condition_meta  TEXT,                          -- e.g. category id for category_completions
  threshold       INTEGER NOT NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_active       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  achieved_at    TEXT NOT NULL,
  UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS challenges (
  id             TEXT PRIMARY KEY,
  name_en        TEXT NOT NULL,
  name_ar        TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  icon           TEXT NOT NULL DEFAULT 'flag',
  category_id    TEXT,
  duration_days  INTEGER NOT NULL,
  target_days    INTEGER NOT NULL,       -- completions needed to succeed
  points_bonus   INTEGER NOT NULL DEFAULT 0,
  difficulty     TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS challenge_participants (
  id            TEXT PRIMARY KEY,
  challenge_id  TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  progress_days INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','failed','dropped')),
  joined_at     TEXT NOT NULL,
  completed_at  TEXT,
  UNIQUE (challenge_id, user_id)
);

-- ---------- System ----------
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('habit_reminder','streak','achievement','reward','reward_approved','challenge','bonus','system')),
  title_en   TEXT NOT NULL,
  title_ar   TEXT NOT NULL,
  body_en    TEXT NOT NULL,
  body_ar    TEXT NOT NULL,
  payload    TEXT,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  user_id     TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  metadata    TEXT,
  ip          TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
