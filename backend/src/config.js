// Load backend/.env before anything reads process.env (single entry: required by
// index.js, seed.js, db.js — all of which import this module first).
require('dotenv').config();

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
// Monorepo: the built web app lives at ../app/dist and is served by this API
const STATIC_DIR = path.resolve(ROOT, '..', 'app', 'dist');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  dbFile: process.env.DB_FILE || path.join(ROOT, 'data', 'habitgo.db'),
  staticDir: fs.existsSync(STATIC_DIR) ? STATIC_DIR : null,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  corsOrigins: process.env.CORS_ORIGINS || '*',
  seedPasswords: {
    user: process.env.SEED_USER_PASSWORD || 'Peter@12345',
    admin: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  },
};

// Sensible defaults applied on first boot (admin-editable via /admin/settings).
const DEFAULT_APP_SETTINGS = {
  points_per_reward_unit: '100', // 100 points = 1 reward unit (editable, never hardcode client-side)
  daily_points_cap: '500',       // anti-cheat: max earnable points per user per day
  completion_edit_cutoff_hours: '24', // anti-cheat: uncomplete window
  max_completions_per_day: '30', // anti-cheat: absurd completion spam guard
  app_name: 'HabitGo',
  app_version: '1.0.0-mvp',
};

module.exports = { config, DEFAULT_APP_SETTINGS };
