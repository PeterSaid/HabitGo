const { prepare, nowIso, uuid } = require('../db');
const { notify } = require('./notifications');

/** Counter sources used by achievement conditions. */
async function countersFor(userId) {
  const habitCount = (await prepare(
    'SELECT COUNT(*) AS n FROM habits WHERE user_id = ? AND is_deleted = 0'
  ).get(userId)).n;
  const bestHabitStreak = (await prepare(
    'SELECT COALESCE(MAX(best_streak), 0) AS n FROM streaks WHERE user_id = ?'
  ).get(userId)).n;
  const us = await prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(userId);
  const totalCompletions = (await prepare(
    "SELECT COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND status = 'completed'"
  ).get(userId)).n;
  const redeemCount = (await prepare(
    "SELECT COUNT(*) AS n FROM reward_redemptions WHERE user_id = ? AND status != 'rejected'"
  ).get(userId)).n;
  const earlyBird = (await prepare(
    "SELECT COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND status = 'completed' AND CAST(substr(created_at, 12, 2) AS INTEGER) < 9"
  ).get(userId)).n; // created_at is UTC — acceptable proxy for MVP
  return {
    habit_count: habitCount,
    habit_streak: bestHabitStreak,
    user_streak: us ? us.best_streak : 0,
    total_completions: totalCompletions,
    perfect_days: us ? us.best_perfect_day : 0,
    redeem_count: redeemCount,
    early_bird: earlyBird,
  };
}

async function categoryCompletions(userId, categoryId) {
  return (await prepare(
    `SELECT COUNT(*) AS n FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id
     WHERE hl.user_id = ? AND hl.status = 'completed' AND h.category_id = ?`
  ).get(userId, categoryId)).n;
}

/**
 * Evaluate all active achievements for a user; unlock any newly satisfied ones.
 * Unlocks award bonus points (via creditEarned — respects daily cap) and XP,
 * and create a notification. Returns the list of newly unlocked achievements.
 */
async function evaluateAchievements(userId, { timezone = 'UTC', creditFn } = {}) {
  const credit = creditFn || require('./wallet').creditEarned;
  const counters = await countersFor(userId);
  const unlocked = [];

  const achievements = await prepare('SELECT * FROM achievements WHERE is_active = 1 ORDER BY sort_order').all();
  const owned = new Set(
    (await prepare('SELECT achievement_id FROM user_achievements WHERE user_id = ?').all(userId)).map((r) => r.achievement_id)
  );

  for (const a of achievements) {
    if (owned.has(a.id)) continue;
    let satisfied = false;
    switch (a.condition_type) {
      case 'category_completions':
        satisfied = a.condition_meta
          ? (await categoryCompletions(userId, a.condition_meta)) >= a.threshold
          : false;
        break;
      default:
        satisfied = (counters[a.condition_type] ?? 0) >= a.threshold;
    }
    if (!satisfied) continue;

    const already = await prepare(
      'SELECT 1 AS ok FROM user_achievements WHERE user_id = ? AND achievement_id = ?'
    ).get(userId, a.id);
    if (already) continue;

    await prepare(
      'INSERT INTO user_achievements (id, user_id, achievement_id, points_awarded, achieved_at) VALUES (?,?,?,?,?)'
    ).run(uuid(), userId, a.id, a.points_bonus, nowIso());
    unlocked.push(a);

    if (a.points_bonus > 0) {
      await credit(userId, a.points_bonus, {
        type: 'bonus',
        sourceType: 'achievement',
        sourceId: a.id,
        description: `Achievement: ${a.name_en}`,
        timezone,
      });
    } else {
      // XP still ticks for non-monetary achievements
      const { ensureProfile } = require('./wallet');
      await ensureProfile(userId, '—');
      await prepare('UPDATE profiles SET xp = xp + ?, updated_at = ? WHERE user_id = ?').run(a.xp_bonus, nowIso(), userId);
    }
    await notify(
      userId,
      'achievement',
      `Achievement unlocked: ${a.name_en}`,
      `إنجاز جديد: ${a.name_ar}`,
      a.description_en,
      a.description_ar,
      { achievement_id: a.id }
    );
  }
  return unlocked;
}

module.exports = { evaluateAchievements, countersFor };
