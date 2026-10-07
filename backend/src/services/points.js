const { prepare, nowIso, uuid, getSettingNumber, withTransaction } = require('../db');
const { badRequest, notFound, conflict, forbidden } = require('../utils/http');
const { isValidDateStr, todayIn, diffDays, addDays } = require('../utils/dates');
const wallet = require('./wallet');
const streaks = require('./streaks');
const { evaluateAchievements } = require('./achievements');
const { notify } = require('./notifications');
const challenges = require('./challenges');

// Habit-streak milestone bonuses (spec section 34)
const STREAK_BONUSES = { 3: 20, 7: 50, 14: 100, 30: 250, 60: 400, 100: 750, 365: 2500 };
const PERFECT_BONUSES = { perfect_week: 100, perfect_month: 500 };

const MAX_BACKFILL_DAYS = 7; // cannot complete habits more than a week in the past

/** The user's calendar drives dates, not the server's — read it from the profile. */
async function getUserTimezone(userId) {
  const p = await prepare('SELECT timezone FROM profiles WHERE user_id = ?').get(userId);
  return (p && p.timezone) || 'UTC';
}

async function loadHabitForUser(userId, habitId) {
  const habit = await prepare(
    `SELECT h.*, s.freq_type, s.days_of_week, s.times_per_week, s.times_per_month,
            s.reminder_time, s.reminder_days, s.reminder_message, c.name_en AS category_en, c.name_ar AS category_ar
     FROM habits h
     JOIN habit_schedules s ON s.habit_id = h.id
     LEFT JOIN habit_categories c ON c.id = h.category_id
     WHERE h.id = ? AND h.user_id = ?`
  ).get(habitId, userId);
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
async function completeHabit({ user, habitId, date, value }) {
  const habit = await loadHabitForUser(user.id, habitId);
  if (habit.is_paused) throw forbidden('This habit is paused', 'habit_paused');
  if (!isValidDateStr(date)) throw badRequest('Invalid date');
  const tz = await getUserTimezone(user.id);
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

  const existing = await prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(habit.id, date);
  if (existing && existing.status === 'completed') {
    throw conflict('Habit already completed for this day', 'already_completed');
  }
  const decreasing = existing && completedValue < existing.completed_value && existing.status !== 'pending';
  if (decreasing) {
    // Lowering partial progress is an edit — allowed within the edit cutoff only.
    const cutoffHours = await getSettingNumber('completion_edit_cutoff_hours', 24);
    const ageHours = (Date.now() - Date.parse(existing.updated_at)) / 3600000;
    if (ageHours > cutoffHours) {
      throw forbidden('This completion can no longer be edited', 'edit_cutoff');
    }
  }
  // Anti-cheat: absurd completion spam guard
  const completionsToday = (await prepare(
    "SELECT COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND date = ? AND status = 'completed'"
  ).get(user.id, date)).n;
  const maxPerDay = await getSettingNumber('max_completions_per_day', 30);
  const becomesCompleted = completedValue >= target;
  if (becomesCompleted && existing?.status !== 'completed' && completionsToday >= maxPerDay) {
    throw forbidden('Daily completion limit reached', 'daily_limit');
  }

  const now = nowIso();
  const status = completedValue >= target ? 'completed' : completedValue > 0 ? 'partial' : 'pending';

  let logId;
  if (existing) {
    await prepare(
      'UPDATE habit_logs SET completed_value = ?, status = ?, target = ?, updated_at = ? WHERE id = ?'
    ).run(completedValue, status, target, now, existing.id);
    logId = existing.id;
  } else {
    logId = uuid();
    await prepare(
      `INSERT INTO habit_logs (id, habit_id, user_id, date, target, completed_value, status, points_earned, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,0,?,?)`
    ).run(logId, habit.id, user.id, date, target, completedValue, status, now, now);
  }

  // ---- Points (server-calculated, capped) ----
  let pointsResult = { credited: 0, capped: false, bonuses: [] };
  const desiredTotal = Math.round((habit.points * completedValue) / target);
  const alreadyEarned = existing ? existing.points_earned : 0;
  const delta = desiredTotal - alreadyEarned;
  if (delta > 0) {
    const { credited, capped } = await wallet.creditEarned(user.id, delta, {
      type: 'earn',
      sourceType: 'habit_log',
      sourceId: logId,
      description: `${habit.name}`,
      timezone: tz,
    });
    await prepare('UPDATE habit_logs SET points_earned = points_earned + ?, updated_at = ? WHERE id = ?').run(
      credited, now, logId
    );
    pointsResult.credited = credited;
    pointsResult.capped = capped;
  } else if (delta < 0) {
    // Progress was lowered: reverse the points for the removed progress.
    await wallet.reverseHabitPoints(user.id, -delta, {
      sourceId: logId,
      description: `Adjusted: ${habit.name} (${date})`,
    });
    await prepare('UPDATE habit_logs SET points_earned = MAX(0, points_earned + ?), updated_at = ? WHERE id = ?').run(
      delta, now, logId
    );
  }

  // ---- Streaks & bonuses (only when the log reaches completion) ----
  const becameCompleted = status === 'completed' && (!existing || existing.status !== 'completed');
  let habitStreak = null;
  let userStreak = null;
  if (becameCompleted) {
    habitStreak = await streaks.recomputeHabitStreak(habit, {
      freq_type: habit.freq_type,
      days_of_week: habit.days_of_week,
      times_per_week: habit.times_per_week,
      times_per_month: habit.times_per_month,
      habit_id: habit.id,
    });
    const bonus = STREAK_BONUSES[habitStreak.current];
    if (bonus) {
      const { credited } = await wallet.creditEarned(user.id, bonus, {
        type: 'bonus',
        sourceType: 'streak_bonus',
        sourceId: habit.id,
        description: `${habitStreak.current}-day streak: ${habit.name}`,
        timezone: tz,
      });
      if (credited > 0) {
        pointsResult.bonuses.push({ key: 'streak', days: habitStreak.current, points: credited });
        await notify(
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

    userStreak = await streaks.updateUserStreakOnCompletion(user.id, date, tz);
    const perfect = await streaks.updatePerfectDay(user.id, date, tz);
    for (const m of perfect.milestones) {
      const points = PERFECT_BONUSES[m.key];
      const { credited } = await wallet.creditEarned(user.id, points, {
        type: 'bonus',
        sourceType: 'perfect_bonus',
        sourceId: m.key,
        description: m.key === 'perfect_week' ? 'Perfect week — every habit, every day' : 'Perfect month — 30 perfect days',
        timezone: tz,
      });
      if (credited > 0) {
        pointsResult.bonuses.push({ key: m.key, points: credited });
        await notify(
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

    await challenges.updateProgressOnCompletion(user.id, habit, date);
  }

  const achievementsUnlocked = await evaluateAchievements(user.id, { timezone: tz });

  return {
    log: await prepare('SELECT * FROM habit_logs WHERE id = ?').get(logId),
    habit_streak: habitStreak,
    user_streak: userStreak,
    wallet: await wallet.ensureWallet(user.id),
    points_earned: pointsResult.credited,
    daily_cap_reached: pointsResult.capped,
    bonuses: pointsResult.bonuses,
    achievements_unlocked: achievementsUnlocked,
  };
}

/** Revert today's (or recent) completion. Allowed within the edit cutoff only. */
async function uncompleteHabit({ user, habitId, date }) {
  const habit = await loadHabitForUser(user.id, habitId);
  const log = await prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(habit.id, date);
  if (!log || log.status === 'pending') throw notFound('No completion recorded for this day');

  const cutoffHours = await getSettingNumber('completion_edit_cutoff_hours', 24);
  const ageHours = (Date.now() - Date.parse(log.updated_at)) / 3600000;
  if (ageHours > cutoffHours) {
    throw forbidden('This completion can no longer be edited', 'edit_cutoff');
  }

  await wallet.reverseHabitPoints(user.id, log.points_earned, {
    sourceId: log.id,
    description: `Reverted: ${habit.name} (${date})`,
  });
  await prepare('DELETE FROM habit_logs WHERE id = ?').run(log.id);

  const habitStreak = await streaks.recomputeHabitStreak(habit, {
    freq_type: habit.freq_type,
    days_of_week: habit.days_of_week,
    times_per_week: habit.times_per_week,
    times_per_month: habit.times_per_month,
    habit_id: habit.id,
  });
  const userStreak = await recomputeUserStreak(user.id);
  await recomputePerfectChain(user.id);

  return {
    habit_streak: habitStreak,
    user_streak: userStreak,
    wallet: await wallet.ensureWallet(user.id),
  };
}

/** Full recompute of the user-level streak from logs (used after uncomplete). */
async function recomputeUserStreak(userId) {
  await wallet.ensureUserStreak(userId);
  const row = await prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(userId);
  const last = await prepare(
    "SELECT MAX(date) AS d FROM habit_logs WHERE user_id = ? AND status = 'completed'"
  ).get(userId);
  let current = 0;
  let cursor = last && last.d ? last.d : null;
  while (cursor) {
    const n = (await prepare(
      "SELECT COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND date = ? AND status = 'completed'"
    ).get(userId, cursor)).n;
    if (n === 0) break;
    current += 1;
    cursor = addDays(cursor, -1);
  }
  const best = Math.max(current, row.best_streak);
  await prepare(
    'UPDATE user_streaks SET current_streak = ?, best_streak = ?, last_active_date = ?, updated_at = ? WHERE user_id = ?'
  ).run(current, best, last && last.d ? last.d : null, nowIso(), userId);
  return { current, best };
}

/** Recompute the perfect-day chain by walking back while days stay perfect. */
async function recomputePerfectChain(userId) {
  const row = await prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(userId);
  let cursor = row.last_perfect_date;
  let chain = 0;
  while (cursor && (await streaks.isPerfectDay(userId, cursor))) {
    chain += 1;
    cursor = addDays(cursor, -1);
  }
  const best = Math.max(chain, row.best_perfect_day);
  await prepare(
    'UPDATE user_streaks SET perfect_day_streak = ?, best_perfect_day = ?, updated_at = ? WHERE user_id = ?'
  ).run(chain, best, nowIso(), userId);
  return { chain, best };
}

module.exports = { completeHabit, uncompleteHabit, loadHabitForUser, targetFor, STREAK_BONUSES };
