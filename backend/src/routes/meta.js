const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/habit-categories', (req, res) => {
  res.json({ categories: db.prepare('SELECT * FROM habit_categories WHERE is_active = 1 ORDER BY sort_order').all() });
});

router.get('/reward-categories', (req, res) => {
  res.json({ categories: db.prepare('SELECT * FROM reward_categories WHERE is_active = 1 ORDER BY sort_order').all() });
});

router.get('/app', (req, res) => {
  const rows = db.prepare("SELECT key, value FROM app_settings WHERE key IN ('points_per_reward_unit','app_name','app_version')").all();
  const out = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({ settings: out });
});

module.exports = router;
