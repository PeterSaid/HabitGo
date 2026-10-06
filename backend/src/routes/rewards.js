const express = require('express');
const { db, nowIso, uuid } = require('../db');
const { asyncHandler, notFound, badRequest, forbidden, conflict } = require('../utils/http');
const { requireAuth } = require('../middleware/auth');
const walletService = require('../services/wallet');
const { notify } = require('../services/notifications');
const { evaluateAchievements } = require('../services/achievements');

const router = express.Router();
router.use(requireAuth);

function serializeReward(r, lang = 'en') {
  const name = lang === 'ar' ? r.name_ar : r.name_en;
  const description = lang === 'ar' ? r.description_ar : r.description_en;
  const partner = r.partner_id
    ? db.prepare('SELECT id, name_en, name_ar, logo FROM reward_partners WHERE id = ?').get(r.partner_id)
    : null;
  const category = r.category_id
    ? db.prepare('SELECT id, name_en, name_ar, icon FROM reward_categories WHERE id = ?').get(r.category_id)
    : null;
  const out = {
    id: r.id,
    name,
    name_en: r.name_en,
    name_ar: r.name_ar,
    description,
    description_en: r.description_en,
    description_ar: r.description_ar,
    image: r.image,
    points_cost: r.points_cost,
    stock: r.stock,
    expiry_date: r.expiry_date,
    redemption_type: r.redemption_type,
    cash_amount: r.cash_amount,
    terms: lang === 'ar' ? r.terms_ar : r.terms_en,
    partner: partner ? { id: partner.id, name: lang === 'ar' ? partner.name_ar : partner.name_en, logo: partner.logo } : null,
    category: category ? { id: category.id, name: lang === 'ar' ? category.name_ar : category.name_en, icon: category.icon } : null,
  };
  return out;
}

router.get(
  '/rewards',
  asyncHandler(async (req, res) => {
    const lang = req.query.lang === 'ar' ? 'ar' : 'en';
    const category = req.query.category || null;
    const search = (req.query.search || '').trim();
    let sql = 'SELECT * FROM rewards WHERE is_active = 1';
    const params = [];
    if (category) {
      sql += ' AND category_id = ?';
      params.push(category);
    }
    if (search) {
      sql += ' AND (name_en LIKE ? OR name_ar LIKE ? OR description_en LIKE ? OR description_ar LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    sql += ' ORDER BY sort_order, points_cost ASC';
    const rows = db.prepare(sql).all(...params);
    res.json({ rewards: rows.map((r) => serializeReward(r, lang)) });
  })
);

router.get(
  '/rewards/:id',
  asyncHandler(async (req, res) => {
    const r = db.prepare('SELECT * FROM rewards WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!r) throw notFound('Reward not found');
    const lang = req.query.lang === 'ar' ? 'ar' : 'en';
    const w = walletService.ensureWallet(req.user.id);
    res.json({ reward: serializeReward(r, lang), wallet: { available: w.available } });
  })
);

/**
 * Redeem (server-side validation per spec sections 41/95):
 * - reward active + in stock + not expired
 * - enough available points
 * Points move available -> pending; transaction recorded as pending.
 */
router.post(
  '/rewards/:id/redeem',
  asyncHandler(async (req, res) => {
    const r = db.prepare('SELECT * FROM rewards WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!r) throw notFound('Reward not found');
    if (r.expiry_date && r.expiry_date < nowIso().slice(0, 10)) throw conflict('This reward has expired', 'expired');
    if (r.stock !== null && r.stock <= 0) throw conflict('This reward is out of stock', 'out_of_stock');

    const w = walletService.ensureWallet(req.user.id);
    if (w.available < r.points_cost) {
      throw forbidden(`You need ${r.points_cost - w.available} more points for this reward`, 'insufficient_points');
    }

    const uid = req.user.id;
    const id = uuid();
    const now = nowIso();
    const code =
      r.redemption_type === 'code'
        ? `HG-${r.id.slice(0, 4).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        : null;

    const txId = walletService.holdForRedemption(uid, r.points_cost, {
      sourceId: id,
      description: r.redemption_type === 'cash' ? 'Cash reward request' : `Redeemed: ${r.name_en}`,
    });

    db.prepare(
      `INSERT INTO reward_redemptions (id, user_id, reward_id, points_cost, status, redemption_code, requested_at)
       VALUES (?,?,?,?, 'pending', ?, ?)`
    ).run(id, uid, r.id, r.points_cost, code, now);
    db.prepare('UPDATE points_transactions SET source_id = ? WHERE id = ?').run(id, txId);

    if (r.stock !== null) {
      db.prepare('UPDATE rewards SET stock = stock - 1, updated_at = ? WHERE id = ?').run(now, r.id);
    }

    if (r.redemption_type === 'code') {
      // Codes are fulfilled immediately; manual/cash need admin review
      const red = db.prepare('SELECT * FROM reward_redemptions WHERE id = ?').get(id);
      db.prepare("UPDATE reward_redemptions SET status = 'completed', completed_at = ? WHERE id = ?").run(now, id);
      walletService.finalizeRedemption(uid, r.points_cost, txId);
      notify(
        uid,
        'reward',
        'Reward redeemed 🎁',
        'تم استبدال المكافأة 🎁',
        `Your code for ${r.name_en}: ${code}`,
        `كودك لـ ${r.name_ar}: ${code}`,
        { redemption_id: id }
      );
      evaluateAchievements(uid);
      const fresh = db.prepare('SELECT * FROM reward_redemptions WHERE id = ?').get(id);
      return res.status(201).json({
        redemption: { ...fresh, reward: serializeReward(r) },
        wallet: walletService.ensureWallet(uid),
      });
    }

    notify(
      uid,
      'reward',
      r.redemption_type === 'cash' ? 'Cash request submitted' : 'Redemption request submitted',
      r.redemption_type === 'cash' ? 'تم إرسال طلب السحب' : 'تم إرسال طلب الاستبدال',
      'We received your request. It will be reviewed shortly.',
      'تم استلام طلبك وسيتم مراجعته قريبًا.',
      { redemption_id: id }
    );
    const red = db.prepare('SELECT * FROM reward_redemptions WHERE id = ?').get(id);
    res.status(201).json({
      redemption: { ...red, reward: serializeReward(r) },
      wallet: walletService.ensureWallet(uid),
    });
  })
);

router.get(
  '/redemptions',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT rr.*, r.name_en, r.name_ar, r.image, r.redemption_type, r.cash_amount
         FROM reward_redemptions rr JOIN rewards r ON r.id = rr.reward_id
         WHERE rr.user_id = ? ORDER BY rr.requested_at DESC LIMIT 100`
      )
      .all(req.user.id);
    res.json({
      redemptions: rows.map((r) => ({
        id: r.id,
        status: r.status,
        points_cost: r.points_cost,
        redemption_code: r.redemption_code,
        requested_at: r.requested_at,
        completed_at: r.completed_at,
        reward: { name_en: r.name_en, name_ar: r.name_ar, image: r.image, redemption_type: r.redemption_type, cash_amount: r.cash_amount },
      })),
    });
  })
);

module.exports = router;
