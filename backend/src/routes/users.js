const express = require('express');
const { z } = require('zod');
const { db, nowIso } = require('../db');
const { asyncHandler, validate } = require('../utils/http');
const { requireAuth } = require('../middleware/auth');
const { audit } = require('../middleware/errors');
const wallet = require('../services/wallet');
const { passwordSchema } = require('./auth');

const router = express.Router();
router.use(requireAuth);

const profileSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  bio: z.string().max(280).optional(),
  phone: z.string().min(6).max(20).optional(),
  city: z.string().max(60).optional(),
  country: z.string().max(60).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  timezone: z.string().max(60).optional(),
  avatar_url: z.string().max(500).optional(),
});

router.put(
  '/me',
  asyncHandler(async (req, res) => {
    const data = validate(profileSchema, req.body);
    const now = nowIso();
    const p = data;
    db.prepare(
      `UPDATE profiles SET
         name = COALESCE(?, name), bio = COALESCE(?, bio), timezone = COALESCE(?, timezone),
         avatar_url = COALESCE(?, avatar_url), updated_at = ? WHERE user_id = ?`
    ).run(p.name ?? null, p.bio ?? null, p.timezone ?? null, p.avatar_url ?? null, now, req.user.id);
    db.prepare(
      `UPDATE users SET phone = COALESCE(?, phone), city = COALESCE(?, city), country = COALESCE(?, country),
         date_of_birth = COALESCE(?, date_of_birth), gender = COALESCE(?, gender), updated_at = ? WHERE id = ?`
    ).run(p.phone ?? null, p.city ?? null, p.country ?? null, p.date_of_birth ?? null, p.gender ?? null, now, req.user.id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.user.id);
    res.json({ ok: true, name: profile.name, level: wallet.levelForXp(profile.xp) });
  })
);

const settingsSchema = z.object({
  locale: z.enum(['ar', 'en']).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications_enabled: z.boolean().optional(),
  reminders_enabled: z.boolean().optional(),
  weekly_report: z.boolean().optional(),
});

router.put(
  '/me/settings',
  asyncHandler(async (req, res) => {
    const s = validate(settingsSchema, req.body);
    const now = nowIso();
    db.prepare(
      `UPDATE user_settings SET
         locale = COALESCE(?, locale), theme = COALESCE(?, theme),
         notifications_enabled = COALESCE(?, notifications_enabled),
         reminders_enabled = COALESCE(?, reminders_enabled),
         weekly_report = COALESCE(?, weekly_report), updated_at = ? WHERE user_id = ?`
    ).run(
      s.locale ?? null, s.theme ?? null,
      s.notifications_enabled === undefined ? null : Number(s.notifications_enabled),
      s.reminders_enabled === undefined ? null : Number(s.reminders_enabled),
      s.weekly_report === undefined ? null : Number(s.weekly_report),
      now, req.user.id
    );
    res.json({ ok: true, settings: db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id) });
  })
);

router.post(
  '/me/personalization',
  asyncHandler(async (req, res) => {
    const { interests } = validate(z.object({ interests: z.array(z.string().max(40)).max(14) }), req.body);
    db.prepare('UPDATE profiles SET interests = ?, onboarded = 1, updated_at = ? WHERE user_id = ?').run(
      JSON.stringify(interests), nowIso(), req.user.id
    );
    res.json({ ok: true });
  })
);

router.post(
  '/me/change-password',
  asyncHandler(async (req, res) => {
    const { current_password, new_password } = validate(
      z.object({ current_password: z.string().min(1), new_password: passwordSchema }),
      req.body
    );
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const bcrypt = require('bcryptjs');
    if (!bcrypt.compareSync(current_password, user.password_hash)) {
      throw require('../utils/http').badRequest('Current password is incorrect', 'bad_credentials');
    }
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
      bcrypt.hashSync(new_password, 10), nowIso(), user.id
    );
    audit(req, 'auth.change_password', 'user', user.id);
    res.json({ ok: true });
  })
);

router.delete(
  '/me',
  asyncHandler(async (req, res) => {
    audit(req, 'user.delete_account', 'user', req.user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id); // cascades
    res.json({ ok: true });
  })
);

/** Data export (spec section 89). */
router.get(
  '/me/export',
  asyncHandler(async (req, res) => {
    const uid = req.user.id;
    const dump = {
      exported_at: nowIso(),
      user: db.prepare('SELECT id, email, phone, created_at FROM users WHERE id = ?').get(uid),
      profile: db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(uid),
      settings: db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(uid),
      habits: db.prepare('SELECT * FROM habits WHERE user_id = ?').all(uid),
      habit_logs: db.prepare('SELECT * FROM habit_logs WHERE user_id = ?').all(uid),
      streaks: db.prepare('SELECT * FROM streaks WHERE user_id = ?').all(uid),
      wallet: db.prepare('SELECT * FROM points_wallets WHERE user_id = ?').get(uid),
      transactions: db.prepare('SELECT * FROM points_transactions WHERE user_id = ?').all(uid),
      redemptions: db.prepare('SELECT * FROM reward_redemptions WHERE user_id = ?').all(uid),
      achievements: db.prepare('SELECT * FROM user_achievements WHERE user_id = ?').all(uid),
      challenges: db.prepare('SELECT * FROM challenge_participants WHERE user_id = ?').all(uid),
    };
    res.setHeader('Content-Disposition', 'attachment; filename="habitgo-export.json"');
    res.json(dump);
  })
);

module.exports = router;
