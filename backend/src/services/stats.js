const { prepare } = require('../db');
const { todayIn, addDays, weekRange, monthRange, eachDay, isoWeekday } = require('../utils/dates');
const { isScheduledOn } = require('./streaks');

async function getUserTz(userId) {
  const p = await prepare('SELECT timezone FROM profiles WHERE user_id = ?').get(userId);
  return p ? p.timezone : 'UTC';
}

async function allActiveHabits(userId) {
  return prepare(
    `SELECT h.*, s.freq_type, s.days_of_week, s.times_per_week, s.times_per_month,
            s.reminder_time, s.reminder_days, s.reminder_message
     FROM habits h JOIN habit_schedules s ON s.habit_id = h.id
     WHERE h.user_id = ? AND h.is_deleted = 0`
  ).all(userId);
}

async function logFor(habitId, date) {
  return prepare('SELECT * FROM habit_logs WHERE habit_id = ? AND date = ?').get(habitId, date);
}

function scheduledOn(habit, date) {
  return isScheduledOn(
    habit,
    { freq_type: habit.freq_type, days_of_week: habit.days_of_week },
    date
  );
}

/** Today view: scheduled habits with live log state. */
async function todayList(userId) {
  const tz = await getUserTz(userId);
  const today = todayIn(tz);
  const habits = (await allActiveHabits(userId)).filter((h) => scheduledOn(h, today));
  return Promise.all(habits.map(async (h) => {
    const log = await logFor(h.id, today);
    const streak = await prepare('SELECT current_streak, best_streak FROM streaks WHERE habit_id = ?').get(h.id);
    const period = h.freq_type === 'times_per_week' || h.freq_type === 'times_per_month' ? await periodProgressFor(h, today) : null;
    return {
      habit: {
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
        reminder_time: h.reminder_time,
        reminder_message: h.reminder_message,
      },
      log: log
        ? { status: log.status, completed_value: log.completed_value, target: log.target, points_earned: log.points_earned }
        : { status: 'pending', completed_value: 0, target: h.type === 'quantitative' ? h.goal_value : 1, points_earned: 0 },
      streak: streak ? streak.current_streak : 0,
      period,
    };
  }));
}

async function periodProgressFor(h, date) {
  if (h.freq_type === 'times_per_week') {
    const [from, to] = weekRange(date);
    const done = (await prepare(
      "SELECT COUNT(*) AS n FROM habit_logs WHERE habit_id = ? AND status='completed' AND date BETWEEN ? AND ?"
    ).get(h.id, from, to)).n;
    return { freq_type: h.freq_type, done, target: h.times_per_week };
  }
  const [from, to] = monthRange(date.slice(0, 7));
  const done = (await prepare(
    "SELECT COUNT(*) AS n FROM habit_logs WHERE habit_id = ? AND status='completed' AND date BETWEEN ? AND ?"
  ).get(h.id, from, to)).n;
  return { freq_type: h.freq_type, done, target: h.times_per_month };
}

/** Aggregated payload for the Home dashboard. */
async function dashboard(userId) {
  const tz = await getUserTz(userId);
  const today = todayIn(tz);

  const list = await todayList(userId);
  const scheduledCount = list.length;
  const completedCount = list.filter((t) => t.log.status === 'completed').length;
  const percent = scheduledCount ? Math.round((completedCount / scheduledCount) * 100) : 0;

  const pointsToday = (await prepare(
    `SELECT COALESCE(SUM(points),0) AS n FROM points_transactions
     WHERE user_id = ? AND points > 0 AND status = 'completed' AND substr(created_at, 1, 10) >= ?`
  ).get(userId, addDays(today, -1))).n; // created_at UTC vs local date — widened by a day to stay safe

  const walletRow = (await prepare('SELECT * FROM points_wallets WHERE user_id = ?').get(userId)) || {};
  const userStreak = (await prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(userId)) || {};

  // weekly progress: last 7 days completion ratio over scheduled
  const [weekFrom] = weekRange(today);
  const weekDays = eachDay(weekFrom, today);
  const habits = await allActiveHabits(userId);
  let scheduledTotal = 0;
  let completedTotal = 0;
  for (const d of weekDays) {
    for (const h of habits) {
      if (!scheduledOn(h, d)) continue;
      if (h.start_date > d) continue;
      scheduledTotal += 1;
      const log = await logFor(h.id, d);
      if (log && log.status === 'completed') completedTotal += 1;
    }
  }

  // nearest affordable reward for the reward progress card
  const conversion = Number((await prepare("SELECT value FROM app_settings WHERE key='points_per_reward_unit'").get()).value) || 100;
  const nextReward = await prepare(
    `SELECT id, name_en, name_ar, points_cost FROM rewards
     WHERE is_active = 1 AND (stock IS NULL OR stock > 0)
     ORDER BY points_cost ASC LIMIT 1`
  ).get();

  const profile = await prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
  const level = require('./wallet').levelForXp(profile ? profile.xp : 0);

  return {
    today: {
      date: today,
      scheduled: scheduledCount,
      completed: completedCount,
      percent,
      points_earned_today: walletRow.earned_today_date === today ? walletRow.earned_today : 0,
    },
    user_streak: userStreak.current_streak || 0,
    wallet: {
      available: walletRow.available || 0,
      pending: walletRow.pending || 0,
      lifetime: walletRow.lifetime || 0,
      estimated_value: Number(((walletRow.available || 0) / conversion).toFixed(2)),
    },
    week: { scheduled: scheduledTotal, completed: completedTotal, percent: scheduledTotal ? Math.round((completedTotal / scheduledTotal) * 100) : 0 },
    next_reward: nextReward || null,
    level,
    motivational: motivational(completedCount, scheduledCount, userStreak.current_streak || 0),
  };
}

function motivational(completed, scheduled, streak) {
  if (scheduled === 0) return { key: 'all_done_streak', streak };
  if (completed === scheduled) return { key: 'day_complete' };
  if (scheduled - completed === 1) return { key: 'one_left' };
  if (streak >= 7) return { key: 'streak_alive', streak };
  return { key: 'keep_going' };
}

/** Full statistics page payload (spec section 49). */
async function statistics(userId) {
  const tz = await getUserTz(userId);
  const today = todayIn(tz);
  const [weekFrom, weekTo] = weekRange(today);
  const [monthFrom, monthTo] = monthRange(today.slice(0, 7));

  const habits = (await allActiveHabits(userId)).filter((h) => h.is_paused === 0);
  const totalCompletions = (await prepare(
    "SELECT COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND status='completed'"
  ).get(userId)).n;
  const totalScheduled = (await prepare(
    `SELECT COUNT(*) AS n FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id
     WHERE hl.user_id = ? AND h.is_deleted = 0`
  ).get(userId)).n;

  const streaks = await prepare('SELECT s.*, h.name FROM streaks s JOIN habits h ON h.id = s.habit_id WHERE s.user_id = ?').all(userId);
  const userStreak = (await prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(userId)) || {};

  const perHabit = [];
  for (const h of habits) {
    const logs = await prepare(
      "SELECT COUNT(*) AS total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS done FROM habit_logs WHERE habit_id = ?"
    ).get(h.id);
    const rate = logs.total ? Math.round((logs.done / logs.total) * 100) : 0;
    perHabit.push({ id: h.id, name: h.name, icon: h.icon, color: h.color, category_id: h.category_id, completion_rate: rate, completions: logs.done || 0 });
  }
  const withRate = perHabit.filter((p) => p.completions > 0);
  const most = withRate.length ? withRate.reduce((a, b) => (a.completion_rate >= b.completion_rate ? a : b)) : null;
  const least = withRate.length ? withRate.reduce((a, b) => (a.completion_rate <= b.completion_rate ? a : b)) : null;

  // category performance
  const catRows = await prepare(
    `SELECT h.category_id, COUNT(*) AS total, SUM(CASE WHEN hl.status='completed' THEN 1 ELSE 0 END) AS done
     FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id
     WHERE hl.user_id = ? AND h.is_deleted = 0 AND h.category_id IS NOT NULL
     GROUP BY h.category_id`
  ).all(userId);

  const pointsEarned = (await prepare(
    "SELECT COALESCE(SUM(points),0) AS n FROM points_transactions WHERE user_id = ? AND points > 0 AND status='completed'"
  ).get(userId)).n;

  const weekly = await weeklyBars(userId, today);
  const monthly = await monthlySeries(userId, today.slice(0, 7));

  return {
    totals: {
      completion_rate: totalScheduled ? Math.round((totalCompletions / totalScheduled) * 100) : 0,
      habits_completed: totalCompletions,
      active_habits: habits.length,
      points_earned: pointsEarned,
    },
    streaks: {
      current: userStreak.current_streak || 0,
      best: userStreak.best_streak || 0,
      best_perfect_day: userStreak.best_perfect_day || 0,
      per_habit: streaks.map((s) => ({ habit_id: s.habit_id, name: s.name, current: s.current_streak, best: s.best_streak })),
    },
    weekly: { from: weekFrom, to: weekTo, days: weekly },
    monthly,
    most_successful: most,
    least_successful: least,
    categories: catRows.map((c) => ({
      category_id: c.category_id,
      completion_rate: c.total ? Math.round((c.done / c.total) * 100) : 0,
      completions: c.done,
    })),
  };
}

/** Last 7 days: scheduled vs completed per day. */
async function weeklyBars(userId, today) {
  const habits = await allActiveHabits(userId);
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    let scheduled = 0;
    let completed = 0;
    for (const h of habits) {
      if (!scheduledOn(h, d) || h.start_date > d) continue;
      scheduled += 1;
      const log = await logFor(h.id, d);
      if (log && log.status === 'completed') completed += 1;
    }
    out.push({ date: d, weekday: isoWeekday(d), scheduled, completed });
  }
  return out;
}

/** Daily completion ratio across a month (for the line chart / heatmap). */
async function monthlySeries(userId, ym) {
  const [from, to] = monthRange(ym);
  const habits = await allActiveHabits(userId);
  const today = await todayIn(await getUserTz(userId));
  const out = [];
  for (const d of eachDay(from, to)) {
    if (d > today) break;
    let scheduled = 0;
    let completed = 0;
    for (const h of habits) {
      if (!scheduledOn(h, d) || h.start_date > d) continue;
      scheduled += 1;
      const log = await logFor(h.id, d);
      if (log && log.status === 'completed') completed += 1;
    }
    out.push({ date: d, scheduled, completed, percent: scheduled ? Math.round((completed / scheduled) * 100) : 0 });
  }
  return out;
}

/** Calendar month payload: per-day status for the calendar view (spec section 51). */
async function calendarMonth(userId, ym) {
  const [from, to] = monthRange(ym);
  const habits = await allActiveHabits(userId);
  const today = await todayIn(await getUserTz(userId));
  const out = [];
  for (const d of eachDay(from, to)) {
    if (d > today) { out.push({ date: d, status: 'future' }); continue; }
    const sched = habits.filter((h) => scheduledOn(h, d) && h.start_date <= d);
    if (sched.length === 0) { out.push({ date: d, status: 'none' }); continue; }
    const logs = (await Promise.all(sched.map((h) => logFor(h.id, d)))).filter(Boolean);
    const completed = logs.filter((l) => l.status === 'completed').length;
    const partial = logs.filter((l) => l.status === 'partial').length;
    if (completed === sched.length) out.push({ date: d, status: 'completed' });
    else if (completed > 0 || partial > 0) out.push({ date: d, status: 'partial' });
    else out.push({ date: d, status: 'missed' });
  }
  return out;
}

module.exports = { todayList, dashboard, statistics, weeklyBars, monthlySeries, calendarMonth, getUserTz, scheduledOn };
