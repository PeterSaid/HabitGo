const { prepare, nowIso, uuid } = require('../db');
const { addDays, diffDays, isoWeekday, weekRange, monthRange } = require('../utils/dates');

/**
 * Scheduling rules:
 *  - daily            -> every day in [start_date, end_date]
 *  - weekly_days      -> specific ISO weekdays (1=Mon..7=Sun)
 *  - times_per_week   -> any day; target met when N logs completed in the Mon-Sun week
 *  - times_per_month  -> any day; target met when N logs completed in the calendar month
 */

function isScheduledOn(habit, schedule, dateStr) {
  if (!habit || habit.is_deleted || habit.is_paused) return false;
  if (habit.start_date > dateStr) return false;
  if (habit.end_date && habit.end_date < dateStr) return false;
  switch (schedule.freq_type) {
    case 'daily':
      return true;
    case 'weekly_days':
      return (schedule.days_of_week || '').split(',').includes(String(isoWeekday(dateStr)));
    case 'times_per_week':
    case 'times_per_month':
      return true;
    default:
      return false;
  }
}

async function periodProgress(schedule, userTzToday, dateStr) {
  const stmt = prepare(
    `SELECT COUNT(*) AS n FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id
     WHERE hl.habit_id = ? AND hl.status = 'completed' AND hl.date BETWEEN ? AND ?`
  );
  if (schedule.freq_type === 'times_per_week') {
    const [from, to] = weekRange(dateStr);
    return { target: schedule.times_per_week, done: (await stmt.get(schedule.habit_id, from, to)).n };
  }
  if (schedule.freq_type === 'times_per_month') {
    const [from, to] = monthRange(dateStr.slice(0, 7));
    return { target: schedule.times_per_month, done: (await stmt.get(schedule.habit_id, from, to)).n };
  }
  return null;
}

/** Previous scheduled date strictly before `dateStr` (for streak walking). */
async function previousScheduledDate(habit, schedule, dateStr) {
  if (schedule.freq_type === 'weekly_days') {
    const days = (schedule.days_of_week || '').split(',').map(Number).sort((a, b) => a - b);
    let d = addDays(dateStr, -1);
    // walk back at most 7 days — a weekly_days schedule hits every 7 days
    for (let i = 0; i < 7; i++) {
      if (days.includes(isoWeekday(d)) && d >= habit.start_date) return d;
      d = addDays(d, -1);
    }
    return null;
  }
  if (schedule.freq_type === 'daily') {
    const prev = addDays(dateStr, -1);
    return prev >= habit.start_date ? prev : null;
  }
  // times_per_week / times_per_month: streak requires a completion within the period
  const periodDays = schedule.freq_type === 'times_per_week' ? 7 : 30;
  const cutoff = addDays(dateStr, -periodDays);
  const row = await prepare(
    "SELECT MAX(date) AS d FROM habit_logs WHERE habit_id = ? AND status = 'completed' AND date > ? AND date < ?"
  ).get(schedule.habit_id, cutoff, dateStr);
  return row && row.d ? row.d : null;
}

/**
 * Recompute a habit's streak by walking back over scheduled dates from its
 * last completion. Correct even after uncompletes.
 */
async function recomputeHabitStreak(habit, schedule) {
  const last = await prepare(
    "SELECT MAX(date) AS d FROM habit_logs WHERE habit_id = ? AND status = 'completed'"
  ).get(habit.id);
  let current = 0;
  if (last && last.d) {
    current = 1;
    let cursor = last.d;
    for (;;) {
      const prev = await previousScheduledDate(habit, schedule, cursor);
      if (!prev) break;
      const done = await prepare(
        "SELECT 1 AS ok FROM habit_logs WHERE habit_id = ? AND date = ? AND status = 'completed'"
      ).get(habit.id, prev);
      if (!done) break;
      current += 1;
      cursor = prev;
    }
  }
  const existing = await prepare('SELECT * FROM streaks WHERE habit_id = ?').get(habit.id);
  const best = Math.max(current, existing ? existing.best_streak : 0);
  if (existing) {
    await prepare(
      'UPDATE streaks SET current_streak = ?, best_streak = ?, last_completed_date = ?, updated_at = ? WHERE habit_id = ?'
    ).run(current, best, last ? last.d : null, nowIso(), habit.id);
  } else {
    await prepare(
      'INSERT INTO streaks (id, habit_id, user_id, current_streak, best_streak, last_completed_date, updated_at) VALUES (?,?,?,?,?,?,?)'
    ).run(uuid(), habit.id, habit.user_id, current, best, last ? last.d : null, nowIso());
  }
  return { current, best, lastCompletedDate: last ? last.d : null };
}

/**
 * Update the user-level streak after a completion on `dateStr`.
 * Rule: a day counts if the user completed at least one scheduled habit.
 * Returns the new user streak.
 */
async function updateUserStreakOnCompletion(userId, dateStr, timezone = 'UTC') {
  const { ensureUserStreak } = require('./wallet');
  await ensureUserStreak(userId);
  const row = await prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(userId);
  let current = row.current_streak;
  if (row.last_active_date === dateStr) {
    // already counted today
  } else if (row.last_active_date && diffDays(dateStr, row.last_active_date) === 1) {
    current += 1;
  } else {
    current = 1;
  }
  const best = Math.max(current, row.best_streak);
  await prepare(
    'UPDATE user_streaks SET current_streak = ?, best_streak = ?, last_active_date = ?, updated_at = ? WHERE user_id = ?'
  ).run(current, best, dateStr, nowIso(), userId);
  return { current, best, isNewDay: row.last_active_date !== dateStr };
}

/** Perfect day = every scheduled habit (started, active) completed that day. */
async function isPerfectDay(userId, dateStr) {
  const habits = await prepare(
    `SELECT h.*, s.freq_type, s.days_of_week, s.times_per_week, s.times_per_month
     FROM habits h JOIN habit_schedules s ON s.habit_id = h.id
     WHERE h.user_id = ? AND h.is_deleted = 0 AND h.is_paused = 0 AND h.start_date <= ?`
  ).all(userId, dateStr);
  const active = habits.filter((h) => !h.end_date || h.end_date >= dateStr);
  if (active.length === 0) return false;
  const scheduled = active.filter((h) =>
    isScheduledOn(h, { freq_type: h.freq_type, days_of_week: h.days_of_week }, dateStr)
  );
  if (scheduled.length === 0) return false;
  const completed = (await prepare(
    "SELECT COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND date = ? AND status = 'completed'"
  ).get(userId, dateStr)).n;
  return completed >= scheduled.length;
}

/**
 * Update perfect-day chain after a completion. Perfect week (+100) and
 * perfect month (+500) bonuses fire when the chain reaches 7 / 30.
 */
async function updatePerfectDay(userId, dateStr, timezone) {
  if (!(await isPerfectDay(userId, dateStr))) return { perfect: false, milestones: [] };
  const row = await prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(userId);
  const prev = row.last_perfect_date;
  const chain = prev && diffDays(dateStr, prev) === 1 ? row.perfect_day_streak + 1 : 1;
  const best = Math.max(chain, row.best_perfect_day);
  await prepare(
    'UPDATE user_streaks SET perfect_day_streak = ?, best_perfect_day = ?, last_perfect_date = ?, updated_at = ? WHERE user_id = ?'
  ).run(chain, best, dateStr, nowIso(), userId);
  const milestones = [];
  if (chain === 7) milestones.push({ key: 'perfect_week', points: 100 });
  if (chain === 30) milestones.push({ key: 'perfect_month', points: 500 });
  return { perfect: true, chain, milestones };
}

module.exports = {
  isScheduledOn,
  periodProgress,
  previousScheduledDate,
  recomputeHabitStreak,
  updateUserStreakOnCompletion,
  isPerfectDay,
  updatePerfectDay,
};
