const express = require('express');
const { z } = require('zod');
const { db, nowIso, uuid, getAllSettings, setSetting } = require('../db');
const { asyncHandler, validate, notFound, badRequest } = require('../utils/http');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { audit } = require('../middleware/errors');
const walletService = require('../services/wallet');
const { notify } = require('../services/notifications');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const users = db.prepare("SELECT COUNT(*) AS n FROM users WHERE status='active'").get().n;
    const habits = db.prepare('SELECT COUNT(*) AS n FROM habits WHERE is_deleted=0').get().n;
    const completions = db.prepare("SELECT COUNT(*) AS n FROM habit_logs WHERE status='completed'").get().n;
    const pointsIssued = db.prepare("SELECT COALESCE(SUM(points),0) AS n FROM points_transactions WHERE points > 0 AND status='completed'").get().n;
    const pendingRedemptions = db.prepare("SELECT COUNT(*) AS n FROM reward_redemptions WHERE status='pending'").get().n;
    const rewardsActive = db.prepare('SELECT COUNT(*) AS n FROM rewards WHERE is_active=1').get().n;
    res.json({ users, habits, completions, points_issued: pointsIssued, pending_redemptions: pendingRedemptions, rewards_active: rewardsActive });
  })
);

router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT u.id, u.email, u.phone, u.role, u.status, u.created_at, p.name, p.xp, w.available
         FROM users u LEFT JOIN profiles p ON p.user_id = u.id LEFT JOIN points_wallets w ON w.user_id = u.id
         ORDER BY u.created_at DESC LIMIT 200`
      )
      .all();
    res.json({ users: rows });
  })
);

router.post(
  '/users/:id/suspend',
  asyncHandler(async (req, res) => {
    const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!target) throw notFound('User not found');
    if (target.id === req.user.id) throw badRequest('You cannot suspend yourself');
    const suspend = req.body && req.body.suspended === false ? 'active' : 'suspended';
    db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(suspend, nowIso(), target.id);
    audit(req, 'admin.suspend_user', 'user', target.id, { status: suspend });
    res.json({ ok: true, status: suspend });
  })
);

const rewardSchema = z.object({
  name_en: z.string().min(1).max(100),
  name_ar: z.string().min(1).max(100),
  description_en: z.string().min(1).max(500),
  description_ar: z.string().min(1).max(500),
  category_id: z.string().max(40).optional(),
  partner_id: z.string().max(40).optional(),
  points_cost: z.number().int().min(1),
  stock: z.number().int().min(0).nullable().optional(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  terms_en: z.string().max(500).optional(),
  terms_ar: z.string().max(500).optional(),
  redemption_type: z.enum(['code', 'manual', 'cash']).default('code'),
  cash_amount: z.number().min(0).nullable().optional(),
  image: z.string().max(500).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

router.get(
  '/rewards',
  asyncHandler(async (req, res) => {
    res.json({ rewards: db.prepare('SELECT * FROM rewards ORDER BY sort_order, points_cost').all() });
  })
);

router.post(
  '/rewards',
  asyncHandler(async (req, res) => {
    const d = validate(rewardSchema, req.body);
    const id = uuid();
    db.prepare(
      `INSERT INTO rewards (id, partner_id, category_id, name_en, name_ar, description_en, description_ar, image,
         points_cost, stock, expiry_date, terms_en, terms_ar, redemption_type, cash_amount, is_active, sort_order, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      id, d.partner_id || null, d.category_id || null, d.name_en, d.name_ar, d.description_en, d.description_ar,
      d.image || null, d.points_cost, d.stock ?? null, d.expiry_date ?? null, d.terms_en || null, d.terms_ar || null,
      d.redemption_type, d.cash_amount ?? null, d.is_active === false ? 0 : 1, d.sort_order || 0, nowIso(), nowIso()
    );
    audit(req, 'admin.create_reward', 'reward', id);
    res.status(201).json({ reward: db.prepare('SELECT * FROM rewards WHERE id = ?').get(id) });
  })
);

router.put(
  '/rewards/:id',
  asyncHandler(async (req, res) => {
    const existing = db.prepare('SELECT * FROM rewards WHERE id = ?').get(req.params.id);
    if (!existing) throw notFound('Reward not found');
    const d = validate(rewardSchema.partial(), req.body);
    db.prepare(
      `UPDATE rewards SET name_en = COALESCE(?, name_en), name_ar = COALESCE(?, name_ar),
         description_en = COALESCE(?, description_en), description_ar = COALESCE(?, description_ar),
         points_cost = COALESCE(?, points_cost), stock = ?, expiry_date = ?,
         is_active = COALESCE(?, is_active), sort_order = COALESCE(?, sort_order), updated_at = ? WHERE id = ?`
    ).run(
      d.name_en ?? null, d.name_ar ?? null, d.description_en ?? null, d.description_ar ?? null,
      d.points_cost ?? null, d.stock !== undefined ? d.stock : existing.stock,
      d.expiry_date !== undefined ? d.expiry_date : existing.expiry_date,
      d.is_active === undefined ? null : Number(d.is_active),
      d.sort_order ?? null, nowIso(), existing.id
    );
    res.json({ reward: db.prepare('SELECT * FROM rewards WHERE id = ?').get(existing.id) });
  })
);

router.get(
  '/redemptions',
  asyncHandler(async (req, res) => {
    const status = req.query.status;
    let sql = `SELECT rr.*, r.name_en, r.name_ar, r.redemption_type, r.cash_amount, p.name AS user_name, u.email AS user_email
               FROM reward_redemptions rr
               JOIN rewards r ON r.id = rr.reward_id
               JOIN users u ON u.id = rr.user_id
               LEFT JOIN profiles p ON p.user_id = rr.user_id`;
    const params = [];
    if (status && status !== 'all') {
      sql += ' WHERE rr.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY rr.requested_at DESC LIMIT 200';
    res.json({ redemptions: db.prepare(sql).all(...params) });
  })
);

router.post(
  '/redemptions/:id/review',
  asyncHandler(async (req, res) => {
    const red = db.prepare('SELECT * FROM reward_redemptions WHERE id = ?').get(req.params.id);
    if (!red) throw notFound('Redemption not found');
    const { action, notes } = validate(z.object({ action: z.enum(['approve', 'reject', 'complete']), notes: z.string().max(300).optional() }), req.body);
    const now = nowIso();
    const reward = db.prepare('SELECT * FROM rewards WHERE id = ?').get(red.reward_id);

    if (action === 'reject') {
      if (red.status !== 'pending' && red.status !== 'approved') throw badRequest('Only pending or approved requests can be rejected');
      const tx = db
        .prepare("SELECT id FROM points_transactions WHERE source_type='redemption' AND source_id = ? AND status='pending'")
        .get(red.id);
      walletService.refundRedemption(red.user_id, red.points_cost, tx ? tx.id : uuid());
      db.prepare("UPDATE reward_redemptions SET status = 'rejected', notes = ?, approved_at = ? WHERE id = ?").run(
        notes || null, now, red.id
      );
      notify(red.user_id, 'reward_approved', 'Redemption rejected', 'تم رفض طلب الاستبدال',
        notes || 'Your request was rejected and your points were returned.',
        notes || 'تم رفض طلبك وإرجاع نقاطك.', { redemption_id: red.id });
    } else if (action === 'approve') {
      if (red.status !== 'pending') throw badRequest('Only pending requests can be approved');
      db.prepare("UPDATE reward_redemptions SET status = 'approved', approved_at = ?, notes = ? WHERE id = ?").run(now, notes || null, red.id);
      notify(red.user_id, 'reward_approved', 'Redemption approved', 'تمت الموافقة على طلبك',
        'Your request was approved and is being processed.',
        'تمت الموافقة على طلبك وهو قيد المعالجة.', { redemption_id: red.id });
    } else if (action === 'complete') {
      if (red.status !== 'pending' && red.status !== 'approved') throw badRequest('Only pending/approved requests can be completed');
      const tx = db
        .prepare("SELECT id FROM points_transactions WHERE source_type='redemption' AND source_id = ? AND status='pending'")
        .get(red.id);
      if (tx) walletService.finalizeRedemption(red.user_id, red.points_cost, tx.id);
      db.prepare("UPDATE reward_redemptions SET status = 'completed', completed_at = ? WHERE id = ?").run(now, red.id);
      notify(red.user_id, 'reward_approved', 'Reward completed 🎉', 'تم تنفيذ المكافأة 🎉',
        `Your reward (${reward ? reward.name_en : ''}) is complete.`,
        `تم تنفيذ مكافأتك (${reward ? reward.name_ar : ''}).`, { redemption_id: red.id });
    }
    audit(req, 'admin.review_redemption', 'redemption', red.id, { action });
    res.json({ redemption: db.prepare('SELECT * FROM reward_redemptions WHERE id = ?').get(red.id) });
  })
);

router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    res.json({ settings: getAllSettings() });
  })
);

router.put(
  '/settings',
  asyncHandler(async (req, res) => {
    const { settings } = validate(z.object({ settings: z.record(z.string(), z.string().max(200)) }), req.body);
    const ALLOWED = ['points_per_reward_unit', 'daily_points_cap', 'completion_edit_cutoff_hours', 'max_completions_per_day', 'app_name', 'app_version'];
    for (const [k, v] of Object.entries(settings)) {
      if (!ALLOWED.includes(k)) continue;
      if (['points_per_reward_unit', 'daily_points_cap', 'completion_edit_cutoff_hours', 'max_completions_per_day'].includes(k)) {
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) throw badRequest(`${k} must be a positive number`);
      }
      setSetting(k, v);
    }
    audit(req, 'admin.update_settings', 'app_settings', null, settings);
    res.json({ settings: getAllSettings() });
  })
);

router.get(
  '/transactions',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT t.*, p.name AS user_name, u.email FROM points_transactions t
         JOIN users u ON u.id = t.user_id LEFT JOIN profiles p ON p.user_id = t.user_id
         ORDER BY t.created_at DESC LIMIT 200`
      )
      .all();
    res.json({ transactions: rows });
  })
);

router.post(
  '/notifications/broadcast',
  asyncHandler(async (req, res) => {
    const { title_en, title_ar, body_en, body_ar } = validate(
      z.object({
        title_en: z.string().min(1).max(120),
        title_ar: z.string().min(1).max(120),
        body_en: z.string().min(1).max(500),
        body_ar: z.string().min(1).max(500),
      }),
      req.body
    );
    const users = db.prepare("SELECT id FROM users WHERE status='active'").all();
    for (const u of users) notify(u.id, 'system', title_en, title_ar, body_en, body_ar, null);
    res.json({ ok: true, delivered: users.length });
  })
);

module.exports = router;
