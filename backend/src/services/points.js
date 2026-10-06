const { db, nowIso, uuid, getSettingNumber } = require('../db');
const { badRequest, notFound, conflict, forbidden } = require('../utils/http');
const { isValidDateStr, todayIn, diffDays } = require('../utils/dates');
const wallet = require('./wallet');
const streaks = require('./streaks');
const { evaluateAchievements } = require('./achievements');
const { notify } = require('./notifications');
const challenges = require('./challenges');

// Habit-streak milestone bonuses (spec section 34)
const STREAK_BONUSES = { 3: 20, 7: 50, 14: 100, 30: 250, 60: 400, 100: 750, 365: 2500 };
const PERFECT_BONUSES = { perfect_week: 100, perfect_month: 500 };

const MAX_BACKFILL_DAYS = 7; // cannot complete habits more than a week in the past

function loadHabitForUser(userId, habitId) {
  const habit = db
    .prepare(
      `SELECT h.*, s.freq_type, s.days_of_week, s.times_per_week, s.times_per_month,
              s.reminder_time, s.reminder_days, s.reminder_message, c.name_en AS category_en, c.name_ar AS category_ar
       FROM habits h
       JOIN habit_schedules s ON s.habit_id = h.id
       LEFT JOIN habit_categories c ON c.id = h.category_id
       WHERE h.id = ? AND h.user_id = ?`
    )
    .get(habitId, userId);
  if (!habit || habit.is_deleted) throw notFound('Habit not found');
  return habit;
}

function targetFor(habit) {
  return habit.type === 'quantitative' ? habit.goal_value || 1 : 1;
}

/**
 * Complete (or increment) a habit for a date. All validation, points, streaks,
 * bonuses, achievements and challenge progress are computed server-side.
 */
function completeHabit({ user, habitId, date, value }) {
  const habit = loadHabitForUser(user.id, habitId);
  if (habit.is_paused) throw forbidden('This habit is paused', 'habit_paused');
  if (!isValidDateStr(date)) throw badRequest('Invalid date');
  const tz = habit.timezone || 'UTC';
  const today = todayIn(tz);
  if (date > today) throw badRequest('Cannot complete a habit for a future date');
  if (diffDays(today, date) > MAX_BACKFILL_DAYS) {
    throw badRequest('Cannot record completions older than a week', 'too_old');
  }
  if (habit.start_date > date) throw badRequest('Date is before the habit start date');
  if (habit.end_date && date > habit.end_date) throw badRequest('Date is after the habit end date');

  const target = targetFor(habit);
  let completedValue;
  if (habit.type === 'quantitative') {
    const requested = value === undefined || value === null ? target : Number(value);
    if (!Number.isInteger(requested) || requested < 0) throw badRequest('Invalid progress value');
    completedValue = Math.min(requested, target);
  } else {
    completedValue = target;
  }

  const existing = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(habit.id, date);
  if (existing && existing.status === 'completed') {
    throw conflict('Habit already completed for this day', 'already_completed');
  }
  if (
    existing &&
    completedValue <= existing.completed_value &&
    existing.status !== 'pending'
  ) {
    throw conflict('Progress must increase', 'no_progress');
  }
  // Anti-cheat: absurd completion spam guard
  const completionsToday = db
    .prepare("SELECT COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND date = ? AND status = 'completed'")
    .get(user.id, date).n;
  const maxPerDay = getSettingNumber('max_completions_per_day', 30);
  const becomesCompleted = completedValue >= target;
  if (becomesCompleted && existing?.status !== 'completed' && completionsToday >= maxPerDay) {
    throw forbidden('Daily completion limit reached', 'daily_limit');
  }

  const now = nowIso();
  const status = completedValue >= target ? 'completed' : completedValue > 0 ? 'partial' : 'pending';

  let log;
  if (existing) {
    db.prepare(
      'UPDATE habit_logs SET completed_value = ?, status = ?, target = ?, updated_at = ? WHERE id = ?'
    ).run(completedValue, status, target, now, existing.id);
    log = db.prepare('SELECT * FROM habit_logs WHERE id = ?').get(existing.id);
  } else {
    const id = uuid();
    db.prepare(
      `INSERT INTO habit_logs (id, habit_id, user_id, date, target, completed_value, status, points_earned, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,0,?,?)`
    ).run(id, habit.id, user.id, date, target, completedValue, status, now, now);
    log = db.prepare('SELECT * FROM habit_logs WHERE id = ?').get(id);
  }

  // ---- Points (server-calculated, capped) ----
  let pointsResult = { credited: 0, capped: false, bonuses: [] };
  const desiredTotal = Math.round((habit.points * completedValue) / target);
  const delta = desiredTotal - (existing ? existing.points_earned : 0);
  if (delta > 0) {
    const { credited, capped } = wallet.creditEarned(user.id, delta, {
      type: 'earn',
      sourceType: 'habit_log',
      sourceId: log.id,
      description: `${habit.name}`,
      timezone: tz,
    });
    db.prepare('UPDATE habit_logs SET points_earned = points_earned + ?, updated_at = ? WHERE id = ?').run(
      credited, now, log.id
    );
    pointsResult.credited = credited;
    pointsResult.capped = capped;
  }

  // ---- Streaks & bonuses (only when the log reaches completion) ----
  const becameCompleted = log.status === 'completed' && (!existing || existing.status !== 'completed');
  let habitStreak = null;
  let userStreak = null;
  if (becameCompleted) {
    habitStreak = streaks.recomputeHabitStreak(habit, {
      freq_type: habit.freq_type,
      days_of_week: habit.days_of_week,
      times_per_week: habit.times_per_week,
      times_per_month: habit.times_per_month,
      habit_id: habit.id,
    });
    const bonus = STREAK_BONUSES[habitStreak.current];
    if (bonus) {
      const { credited } = wallet.creditEarned(user.id, bonus, {
        type: 'bonus',
        sourceType: 'streak_bonus',
        sourceId: habit.id,
        description: `${habitStreak.current}-day streak: ${habit.name}`,
        timezone: tz,
      });
      if (credited > 0) {
        pointsResult.bonuses.push({ key: 'streak', days: habitStreak.current, points: credited });
        notify(
          user.id,
          'bonus',
          `🔥 ${habitStreak.current}-day streak! +${credited} bonus points`,
          `🔥 ${habitStreak.current} يوم متتالي! +${credited} نقطة إضافية`,
          `You kept "${habit.name}" going for ${habitStreak.current} days.`,
          `حافظت على عادتك "${habit.name}" لمدة ${habitStreak.current} يوم.`,
          { habit_id: habit.id, streak: habitStreak.current }
        );
      }
    }

    userStreak = streaks.updateUserStreakOnCompletion(user.id, date, tz);
    const perfect = streaks.updatePerfectDay(user.id, date, tz);
    for (const m of perfect.milestones) {
      const points = PERFECT_BONUSES[m.key];
      const { credited } = wallet.creditEarned(user.id, points, {
        type: 'bonus',
        sourceType: 'perfect_bonus',
        sourceId: m.key,
        description: m.key === 'perfect_week' ? 'Perfect week — every habit, every day' : 'Perfect month — 30 perfect days',
        timezone: tz,
      });
      if (credited > 0) {
        pointsResult.bonuses.push({ key: m.key, points: credited });
        notify(
          user.id,
          'bonus',
          m.key === 'perfect_week' ? 'Perfect week! +100 bonus points' : 'Perfect month! +500 bonus points',
          m.key === 'perfect_week' ? 'أسبوع مثالي! +100 نقطة إضافية' : 'شهر مثالي! +500 نقطة إضافية',
          'You completed every scheduled habit all week. Outstanding.',
          'أكملت كل عاداتك المجدولة طوال الأسبوع. رائع!',
          null
        );
      }
    }

    challenges.updateProgressOnCompletion(user.id, habit, date);
  }

  const achievementsUnlocked = evaluateAchievements(user.id, { timezone: tz });

  return {
    log: db.prepare('SELECT * FROM habit_logs WHERE id = ?').get(log.id),
    habit_streak: habitStreak,
    user_streak: userStreak,
    wallet: wallet.ensureWallet(user.id),
    points_earned: pointsResult.credited,
    daily_cap_reached: pointsResult.capped,
    bonuses: pointsResult.bonuses,
    achievements_unlocked: achievementsUnlocked,
  };
}

/** Revert today's (or recent) completion. Allowed within the edit cutoff only. */
function uncompleteHabit({ user, habitId, date }) {
  const habit = loadHabitForUser(user.id, habitId);
  const log = db.prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(habit.id, date);
  if (!log || log.status === 'pending') throw notFound('No completion recorded for this day');

  const cutoffHours = getSettingNumber('completion_edit_cutoff_hours', 24);
  const ageHours = (Date.now() - Date.parse(log.updated_at)) / 3600000;
  if (ageHours > cutoffHours) {
    throw forbidden('This completion can no longer be edited', 'edit_cutoff');
  }

  wallet.reverseHabitPoints(user.id, log.points_earned, {
    sourceId: log.id,
    description: `Reverted: ${habit.name} (${date})`,
  });
  db.prepare('DELETE FROM habit_logs WHERE id = ?').run(log.id);

  const habitStreak = streaks.recomputeHabitStreak(habit, {
    freq_type: habit.freq_type,
    days_of_week: habit.days_of_week,
    times_per_week: habit.times_per_week,
    times_per_month: habit.times_per_month,
    habit_id: habit.id,
  });
  const userStreak = recomputeUserStreak(user.id);
  recomputePerfectChain(user.id);

  return {
    habit_streak: habitStreak,
    user_streak: userStreak,
    wallet: wallet.ensureWallet(user.id),
  };
}

/** Full recompute of the user-level streak from logs (used after uncomplete). */
function recomputeUserStreak(userId) {
  wallet.ensureUserStreak(userId);
  const row = db.prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(userId);
  const last = db
    .prepare("SELECT MAX(date) AS d FROM habit_logs WHERE user_id = ? AND status = 'completed'")
    .get(userId);
  let current = 0;
  let cursor = last && last.d ? last.d : null;
  while (cursor) {
    const n = db
      .prepare("SELECT COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND date = ? AND status = 'completed'")
      .get(userId, cursor).n;
    if (n === 0) break;
    current += 1;
    const { addDays } = require('../utils/dates');
    cursor = addDays(cursor, -1);
  }
  const best = Math.max(current, row.best_streak);
  db.prepare(
    'UPDATE user_streaks SET current_streak = ?, best_streak = ?, last_active_date = ?, updated_at = ? WHERE user_id = ?'
  ).run(current, best, last && last.d ? last.d : null, nowIso(), userId);
  return { current, best };
}

/** Recompute the perfect-day chain by walking back while days stay perfect. */
function recomputePerfectChain(userId) {
  const row = db.prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(userId);
  let cursor = row.last_perfect_date;
  let chain = 0;
  const { addDays } = require('../utils/dates');
  while (cursor && streaks.isPerfectDay(userId, cursor)) {
    chain += 1;
    cursor = addDays(cursor, -1);
  }
  const best = Math.max(chain, row.best_perfect_day);
  const lastPerfect = chain > 0 ? db.prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(userId).last_perfect_date : null;
  db.prepare(
    'UPDATE user_streaks SET perfect_day_streak = ?, best_perfect_day = ?, updated_at = ? WHERE user_id = ?'
  ).run(chain, best, nowIso(), userId);
  return { chain, best, lastPerfect };
}

module.exports = { completeHabit, uncompleteHabit, loadHabitForUser, targetFor, STREAK_BONUSES };
