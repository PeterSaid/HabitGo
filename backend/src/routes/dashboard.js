const express = require('express');
const { prepare, getSettingNumber } = require('../db');
const { asyncHandler } = require('../utils/http');
const { requireAuth } = require('../middleware/auth');
const statsService = require('../services/stats');

const router = express.Router();
router.use(requireAuth);

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    res.json(await statsService.dashboard(req.user.id));
  })
);

router.get(
  '/wallet',
  asyncHandler(async (req, res) => {
    const uid = req.user.id;
    const w =
      (await prepare('SELECT * FROM points_wallets WHERE user_id = ?').get(uid)) ||
      (await require('../services/wallet').ensureWallet(uid));
    const conversion = await getSettingNumber('points_per_reward_unit', 100);
    res.json({
      wallet: {
        available: w.available,
        pending: w.pending,
        lifetime: w.lifetime,
        redeemed: w.redeemed,
        estimated_value: Number((w.available / conversion).toFixed(2)),
        conversion_rate: { points: conversion, unit: 1 },
      },
    });
  })
);

router.get(
  '/wallet/transactions',
  asyncHandler(async (req, res) => {
    const uid = req.user.id;
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Number(req.query.offset) || 0;
    const rows = await prepare(
      'SELECT * FROM points_transactions WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ? OFFSET ?'
    ).all(uid, limit, offset);
    res.json({ transactions: rows, has_more: rows.length === limit });
  })
);

router.get(
  '/statistics',
  asyncHandler(async (req, res) => {
    res.json(await statsService.statistics(req.user.id));
  })
);

module.exports = router;
