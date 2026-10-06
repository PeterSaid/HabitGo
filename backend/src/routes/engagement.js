const express = require('express');
const { db, nowIso } = require('../db');
const { asyncHandler, notFound } = require('../utils/http');
const { requireAuth } = require('../middleware/auth');
const challengesService = require('../services/challenges');

const router = express.Router();
router.use(requireAuth);

router.get(
  '/challenges',
  asyncHandler(async (req, res) => {
    const rows = db.prepare('SELECT * FROM challenges WHERE is_active = 1 ORDER BY duration_days ASC').all();
    const mine = new Map(
      db.prepare('SELECT * FROM challenge_participants WHERE user_id = ?').all(req.user.id).map((p) => [p.challenge_id, p])
    );
    res.json({
      challenges: rows.map((c) => ({
        id: c.id,
        name_en: c.name_en,
        name_ar: c.name_ar,
        description_en: c.description_en,
        description_ar: c.description_ar,
        icon: c.icon,
        category_id: c.category_id,
        duration_days: c.duration_days,
        target_days: c.target_days,
        points_bonus: c.points_bonus,
        difficulty: c.difficulty,
        participation: mine.get(c.id)
          ? { status: mine.get(c.id).status, progress_days: mine.get(c.id).progress_days, joined_at: mine.get(c.id).joined_at }
          : null,
      })),
    });
  })
);

router.get(
  '/challenges/mine',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT cp.*, c.name_en, c.name_ar, c.description_en, c.description_ar, c.icon, c.duration_days, c.target_days, c.points_bonus
         FROM challenge_participants cp JOIN challenges c ON c.id = cp.challenge_id
         WHERE cp.user_id = ? ORDER BY cp.joined_at DESC`
      )
      .all(req.user.id);
    res.json({
      challenges: rows.map((r) => ({
        id: r.challenge_id,
        name_en: r.name_en,
        name_ar: r.name_ar,
        description_en: r.description_en,
        description_ar: r.description_ar,
        icon: r.icon,
        duration_days: r.duration_days,
        target_days: r.target_days,
        points_bonus: r.points_bonus,
        progress_days: r.progress_days,
        status: r.status,
        joined_at: r.joined_at,
      })),
    });
  })
);

router.get(
  '/challenges/:id',
  asyncHandler(async (req, res) => {
    const c = db.prepare('SELECT * FROM challenges WHERE id = ? AND is_active = 1').get(req.params.id);
    if (!c) throw notFound('Challenge not found');
    const p = db
      .prepare('SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?')
      .get(c.id, req.user.id);
    res.json({
      challenge: {
        ...c,
        participation: p ? { status: p.status, progress_days: p.progress_days, joined_at: p.joined_at } : null,
      },
    });
  })
);

router.post(
  '/challenges/:id/join',
  asyncHandler(async (req, res) => {
    const result = challengesService.joinChallenge(req.user.id, req.params.id);
    if (!result) throw notFound('Challenge not found');
    res.status(result.already ? 200 : 201).json(result);
  })
);

router.get(
  '/achievements',
  asyncHandler(async (req, res) => {
    const all = db.prepare('SELECT * FROM achievements WHERE is_active = 1 ORDER BY sort_order').all();
    const mine = new Map(
      db.prepare('SELECT * FROM user_achievements WHERE user_id = ?').all(req.user.id).map((r) => [r.achievement_id, r])
    );
    res.json({
      achievements: all.map((a) => {
        const owned = mine.get(a.id);
        return {
          id: a.id,
          name_en: a.name_en,
          name_ar: a.name_ar,
          description_en: a.description_en,
          description_ar: a.description_ar,
          icon: a.icon,
          points_bonus: a.points_bonus,
          threshold: a.threshold,
          unlocked: !!owned,
          achieved_at: owned ? owned.achieved_at : null,
        };
      }),
    });
  })
);

router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const rows = db
      .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(req.user.id, limit);
    const unread = db
      .prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0')
      .get(req.user.id).n;
    res.json({ notifications: rows, unread });
  })
);

router.post(
  '/notifications/:id/read',
  asyncHandler(async (req, res) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ ok: true });
  })
);

router.post(
  '/notifications/read-all',
  asyncHandler(async (req, res) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ ok: true });
  })
);

module.exports = router;
