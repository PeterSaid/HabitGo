const express = require('express');
const { z } = require('zod');
const { db, nowIso, uuid } = require('../db');
const { asyncHandler, validate, notFound, badRequest } = require('../utils/http');
const { requireAuth } = require('../middleware/auth');
const pointsService = require('../services/points');
const streaksService = require('../services/streaks');
const statsService = require('../services/stats');
const { getUserTz } = require('../services/stats');
const { todayIn, monthRange, eachDay, isValidDateStr } = require('../utils/dates');

const router = express.Router();
router.use(requireAuth);

const DEFAULT_POINTS = { easy: 10, medium: 20, hard: 30 };

const habitSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  category_id: z.string().max(40).optional(),
  icon: z.string().max(40).default('star'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#22C55E'),
  type: z.enum(['binary', 'quantitative']).default('binary'),
  goal_value: z.number().int().min(1).max(1000).optional(),
  goal_unit: z.string().max(20).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  points: z.number().int().min(1).max(200).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  freq_type: z.enum(['daily', 'weekly_days', 'times_per_week', 'times_per_month']).default('daily'),
  days_of_week: z.array(z.number().int().min(1).max(7)).max(7).optional(),
  times_per_week: z.number().int().min(1).max(7).optional(),
  times_per_month: z.number().int().min(1).max(31).optional(),
  reminder_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reminder_days: z.array(z.number().int().min(1).max(7)).max(7).optional(),
  reminder_message: z.string().max(120).optional(),
});

function serializeHabit(h) {
  return {
    id: h.id,
    name: h.name,
    description: h.description,
    category_id: h.category_id,
    icon: h.icon,
    color: h.color,
    type: h.type,
    goal_value: h.goal_value,
    goal_unit: h.goal_unit,
    difficulty: h.difficulty,
    points: h.points,
    start_date: h.start_date,
    end_date: h.end_date,
    is_paused: !!h.is_paused,
    created_at: h.created_at,
    schedule: {
      freq_type: h.freq_type,
      days_of_week: h.days_of_week ? h.days_of_week.split(',').map(Number) : null,
      times_per_week: h.times_per_week,
      times_per_month: h.times_per_month,
      reminder_time: h.reminder_time,
      reminder_days: h.reminder_days ? h.reminder_days.split(',').map(Number) : null,
      reminder_message: h.reminder_message,
    },
  };
}

function loadHabit(userId, habitId) {
  const h = db
    .prepare(
      `SELECT h.*, s.freq_type, s.days_of_week, s.times_per_week, s.times_per_month,
              s.reminder_time, s.reminder_days, s.reminder_message
       FROM habits h JOIN habit_schedules s ON s.habit_id = h.id
       WHERE h.id = ? AND h.user_id = ? AND h.is_deleted = 0`
    )
    .get(habitId, userId);
  if (!h) throw notFound('Habit not found');
  return h;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT h.*, s.freq_type, s.days_of_week, s.times_per_week, s.times_per_month,
                s.reminder_time, s.reminder_days, s.reminder_message
         FROM habits h JOIN habit_schedules s ON s.habit_id = h.id
         WHERE h.user_id = ? AND h.is_deleted = 0
         ORDER BY h.created_at ASC`
      )
      .all(req.user.id);
    const withStreaks = rows.map((h) => {
      const s = db.prepare('SELECT current_streak, best_streak FROM streaks WHERE habit_id = ?').get(h.id);
      return { ...serializeHabit(h), streak: s ? s.current_streak : 0, best_streak: s ? s.best_streak : 0 };
    });
    res.json({ habits: withStreaks });
  })
);

router.get(
  '/today',
  asyncHandler(async (req, res) => {
    const items = statsService.todayList(req.user.id);
    res.json({ date: todayIn(getUserTz(req.user.id)), habits: items });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = validate(habitSchema, req.body);
    if (data.type === 'quantitative' && !data.goal_value) {
      throw badRequest('goal_value is required for quantitative habits', 'goal_required');
    }
    if (data.freq_type === 'weekly_days' && (!data.days_of_week || data.days_of_week.length === 0)) {
      throw badRequest('Select at least one day of the week', 'days_required');
    }
    if (data.freq_type === 'times_per_week' && !data.times_per_week) {
      throw badRequest('times_per_week is required', 'times_required');
    }
    if (data.freq_type === 'times_per_month' && !data.times_per_month) {
      throw badRequest('times_per_month is required', 'times_required');
    }

    const id = uuid();
    const now = nowIso();
    const startDate = data.start_date || todayIn(getUserTz(req.user.id));
    const points = data.points || DEFAULT_POINTS[data.difficulty];

    db.prepare(
      `INSERT INTO habits (id, user_id, name, description, category_id, icon, color, type, goal_value, goal_unit,
                           difficulty, points, start_date, end_date, is_paused, is_deleted, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,?,?)`
    ).run(
      id, req.user.id, data.name, data.description || null, data.category_id || null, data.icon, data.color,
      data.type, data.type === 'quantitative' ? data.goal_value : null, data.goal_unit || null,
      data.difficulty, points, startDate, data.end_date || null, now, now
    );
    db.prepare(
      `INSERT INTO habit_schedules (id, habit_id, freq_type, days_of_week, times_per_week, times_per_month,
                                    reminder_time, reminder_days, reminder_message, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
    ).run(
      uuid(), id, data.freq_type,
      data.days_of_week ? data.days_of_week.join(',') : null,
      data.times_per_week || null, data.times_per_month || null,
      data.reminder_time || null,
      data.reminder_days ? data.reminder_days.join(',') : null,
      data.reminder_message || null, now
    );
    const habit = loadHabit(req.user.id, id);
    res.status(201).json({ habit: serializeHabit(habit) });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const habit = loadHabit(req.user.id, req.params.id);
    const streak = db.prepare('SELECT * FROM streaks WHERE habit_id = ?').get(habit.id) || { current_streak: 0, best_streak: 0 };
    const totals = db
      .prepare(
        `SELECT COUNT(*) AS scheduled,
                SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
                COALESCE(SUM(points_earned), 0) AS points
         FROM habit_logs WHERE habit_id = ?`
      )
      .get(habit.id);
    const rate = totals.scheduled ? Math.round((totals.completed / totals.scheduled) * 100) : 0;
    res.json({ habit: serializeHabit(habit), streak, totals, completion_rate: rate });
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const habit = loadHabit(req.user.id, req.params.id);
    const data = validate(habitSchema.partial(), req.body);
    const now = nowIso();
    const p = data;
    db.prepare(
      `UPDATE habits SET name = COALESCE(?, name), description = ?, category_id = ?, icon = COALESCE(?, icon),
         color = COALESCE(?, color), type = COALESCE(?, type), goal_value = ?, goal_unit = ?,
         difficulty = COALESCE(?, difficulty), points = COALESCE(?, points), start_date = COALESCE(?, start_date),
         end_date = ?, is_paused = COALESCE(?, is_paused), updated_at = ? WHERE id = ?`
    ).run(
      p.name ?? null,
      p.description !== undefined ? p.description : habit.description,
      p.category_id !== undefined ? p.category_id : habit.category_id,
      p.icon ?? null, p.color ?? null, p.type ?? null,
      p.type === 'quantitative' ? p.goal_value ?? habit.goal_value : p.goal_value !== undefined ? p.goal_value : habit.goal_value,
      p.goal_unit !== undefined ? p.goal_unit : habit.goal_unit,
      p.difficulty ?? null, p.points ?? null,
      p.start_date ?? null, p.end_date !== undefined ? p.end_date : habit.end_date,
      p.is_paused === undefined ? null : Number(p.is_paused),
      now, habit.id
    );
    const sched = {};
    if (p.freq_type) sched.freq_type = p.freq_type;
    if (p.days_of_week) sched.days_of_week = p.days_of_week.join(',');
    if (p.times_per_week !== undefined) sched.times_per_week = p.times_per_week;
    if (p.times_per_month !== undefined) sched.times_per_month = p.times_per_month;
    if (p.reminder_time !== undefined) sched.reminder_time = p.reminder_time;
    if (p.reminder_days) sched.reminder_days = p.reminder_days.join(',');
    if (p.reminder_message !== undefined) sched.reminder_message = p.reminder_message;
    if (Object.keys(sched).length) {
      db.prepare(
        `UPDATE habit_schedules SET freq_type = COALESCE(?, freq_type), days_of_week = ?, times_per_week = ?,
           times_per_month = ?, reminder_time = ?, reminder_days = ?, reminder_message = ? WHERE habit_id = ?`
      ).run(
        sched.freq_type ?? null, sched.days_of_week ?? (habit.days_of_week || null),
        sched.times_per_week ?? habit.times_per_week, sched.times_per_month ?? habit.times_per_month,
        sched.reminder_time ?? (habit.reminder_time || null),
        sched.reminder_days ?? (habit.reminder_days || null),
        sched.reminder_message ?? (habit.reminder_message || null),
        habit.id
      );
    }
    res.json({ habit: serializeHabit(loadHabit(req.user.id, habit.id)) });
  })
);

/** Soft delete — logs are kept so statistics stay truthful. */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const habit = loadHabit(req.user.id, req.params.id);
    db.prepare('UPDATE habits SET is_deleted = 1, updated_at = ? WHERE id = ?').run(nowIso(), habit.id);
    db.prepare('DELETE FROM streaks WHERE habit_id = ?').run(habit.id);
    res.json({ ok: true });
  })
);

router.post(
  '/:id/pause',
  asyncHandler(async (req, res) => {
    const habit = loadHabit(req.user.id, req.params.id);
    const pause = req.body && req.body.paused === false ? 0 : 1;
    db.prepare('UPDATE habits SET is_paused = ?, updated_at = ? WHERE id = ?').run(pause, nowIso(), habit.id);
    res.json({ ok: true, is_paused: !!pause });
  })
);

/** Complete / increment (server-side points + streaks). */
router.post(
  '/:id/complete',
  asyncHandler(async (req, res) => {
    const { date, value } = req.body || {};
    const tz = getUserTz(req.user.id);
    const result = pointsService.completeHabit({
      user: { id: req.user.id },
      habitId: req.params.id,
      date: date || todayIn(tz),
      value,
    });
    res.json(result);
  })
);

router.post(
  '/:id/uncomplete',
  asyncHandler(async (req, res) => {
    const { date } = req.body || {};
    const tz = getUserTz(req.user.id);
    const result = pointsService.uncompleteHabit({
      user: { id: req.user.id },
      habitId: req.params.id,
      date: date || todayIn(tz),
    });
    res.json(result);
  })
);

/** History logs for one habit within a month (calendar + history list). */
router.get(
  '/:id/logs',
  asyncHandler(async (req, res) => {
    const habit = loadHabit(req.user.id, req.params.id);
    const ym = req.query.month && /^\d{4}-\d{2}$/.test(req.query.month) ? req.query.month : todayIn(getUserTz(req.user.id)).slice(0, 7);
    const [from, to] = monthRange(ym);
    const logs = db
      .prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC')
      .all(habit.id, from, to);
    res.json({ month: ym, logs });
  })
);

/** Monthly calendar across all habits (spec section 51). */
router.get(
  '/calendar/:month',
  asyncHandler(async (req, res) => {
    if (!/^\d{4}-\d{2}$/.test(req.params.month)) throw badRequest('month must be YYYY-MM');
    res.json({ month: req.params.month, days: statsService.calendarMonth(req.user.id, req.params.month) });
  })
);

module.exports = router;
