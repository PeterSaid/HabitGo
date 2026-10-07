const express = require('express');
const { prepare } = require('../db');
const { asyncHandler } = require('../utils/http');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get(
  '/habit-categories',
  asyncHandler(async (req, res) => {
    res.json({ categories: await prepare('SELECT * FROM habit_categories WHERE is_active = 1 ORDER BY sort_order').all() });
  })
);

router.get(
  '/reward-categories',
  asyncHandler(async (req, res) => {
    res.json({ categories: await prepare('SELECT * FROM reward_categories WHERE is_active = 1 ORDER BY sort_order').all() });
  })
);

router.get(
  '/app',
  asyncHandler(async (req, res) => {
    const rows = await prepare("SELECT key, value FROM app_settings WHERE key IN ('points_per_reward_unit','app_name','app_version')").all();
    const out = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json({ settings: out });
  })
);

module.exports = router;
