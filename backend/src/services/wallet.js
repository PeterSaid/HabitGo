const { db, nowIso, uuid } = require('../db');
const { getSettingNumber } = require('../db');
const { todayIn } = require('../utils/dates');

// XP levels (spec section 46). Index+1 = level.
const LEVELS = [
  { level: 1, name: 'Starter', minXp: 0 },
  { level: 2, name: 'Builder', minXp: 500 },
  { level: 3, name: 'Consistent', minXp: 1500 },
  { level: 4, name: 'Achiever', minXp: 3000 },
  { level: 5, name: 'Master', minXp: 6000 },
  { level: 6, name: 'Legend', minXp: 10000 },
];

function levelForXp(xp) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.minXp) current = l;
  const next = LEVELS.find((l) => l.minXp > current.minXp && l.minXp > xp);
  return {
    level: current.level,
    name: current.name,
    currentLevelXp: current.minXp,
    nextLevelXp: next ? next.minXp : null,
  };
}

function ensureWallet(userId) {
  db.prepare('INSERT OR IGNORE INTO points_wallets (user_id, updated_at) VALUES (?, ?)').run(userId, nowIso());
  return db.prepare('SELECT * FROM points_wallets WHERE user_id = ?').get(userId);
}

function ensureUserStreak(userId) {
  db.prepare('INSERT OR IGNORE INTO user_streaks (user_id, updated_at) VALUES (?, ?)').run(userId, nowIso());
}

function ensureProfile(userId, name, extra = {}) {
  const now = nowIso();
  db.prepare(
    'INSERT OR IGNORE INTO profiles (user_id, name, timezone, created_at, updated_at) VALUES (?,?,?,?,?)'
  ).run(userId, name, extra.timezone || 'UTC', now, now);
}

function earnedToday(wallet, timezone) {
  const today = todayIn(timezone);
  if (wallet.earned_today_date !== today) return 0;
  return wallet.earned_today;
}

/**
 * Credit earned points + matching XP. Creates a completed transaction.
 * Enforces the daily earn cap (anti-cheat, spec section 36) and returns
 * the amount actually credited (may be less than requested).
 */
function creditEarned(userId, points, { type = 'earn', sourceType, sourceId, description, timezone = 'UTC' } = {}) {
  const wallet = ensureWallet(userId);
  const cap = getSettingNumber('daily_points_cap', 500);
  const room = Math.max(0, cap - earnedToday(wallet, timezone));
  const credited = Math.min(points, room);
  const capped = credited < points;

  if (credited > 0) {
    const today = todayIn(timezone);
    const todayBase = wallet.earned_today_date === today ? wallet.earned_today : 0;
    db.prepare(
      `UPDATE points_wallets SET available = available + ?, lifetime = lifetime + ?,
        earned_today_date = ?, earned_today = ?, updated_at = ? WHERE user_id = ?`
    ).run(credited, credited, today, todayBase + credited, nowIso(), userId);
    db.prepare(
      `INSERT INTO points_transactions (id, user_id, type, source_type, source_id, points, status, description, created_at)
       VALUES (?,?,?,?,?,?, 'completed', ?, ?)`
    ).run(uuid(), userId, type, sourceType, sourceId || null, credited, description, nowIso());
    db.prepare('UPDATE profiles SET xp = xp + ?, updated_at = ? WHERE user_id = ?').run(credited, nowIso(), userId);
  }

  return { credited, capped };
}

/** Move points from available to pending for a redemption (transaction stays pending until admin finalizes). */
function holdForRedemption(userId, points, { sourceId, description }) {
  const wallet = ensureWallet(userId);
  db.prepare('UPDATE points_wallets SET available = available - ?, pending = pending + ?, updated_at = ? WHERE user_id = ?').run(
    points, points, nowIso(), userId
  );
  const txId = uuid();
  db.prepare(
    `INSERT INTO points_transactions (id, user_id, type, source_type, source_id, points, status, description, created_at)
     VALUES (?,?,?,?,?,?, 'pending', ?, ?)`
  ).run(txId, userId, 'redeem', 'redemption', sourceId, -points, description, nowIso());
  return txId;
}

/** Redemption approved/completed: pending -> redeemed. */
function finalizeRedemption(userId, points, txId) {
  db.prepare('UPDATE points_wallets SET pending = pending - ?, redeemed = redeemed + ?, updated_at = ? WHERE user_id = ?').run(
    points, points, nowIso(), userId
  );
  db.prepare("UPDATE points_transactions SET status = 'completed' WHERE id = ?").run(txId);
}

/** Redemption rejected: return points to available. */
function refundRedemption(userId, points, originalTxId) {
  const wallet = ensureWallet(userId);
  db.prepare('UPDATE points_wallets SET pending = pending - ?, available = available + ?, updated_at = ? WHERE user_id = ?').run(
    points, points, nowIso(), userId
  );
  db.prepare("UPDATE points_transactions SET status = 'completed' WHERE id = ?").run(originalTxId);
  db.prepare(
    `INSERT INTO points_transactions (id, user_id, type, source_type, source_id, points, status, description, created_at)
     VALUES (?,?,?,?,?,?, 'completed', ?, ?)`
  ).run(uuid(), userId, 'refund', 'redemption', originalTxId, points, 'Refund — redemption rejected', nowIso());
}

/** Reverse part/all of a habit log's earned points (uncomplete within cutoff). */
function reverseHabitPoints(userId, points, { sourceId, description }) {
  if (points <= 0) return;
  db.prepare('UPDATE points_wallets SET available = available - ?, lifetime = lifetime - ?, updated_at = ? WHERE user_id = ?').run(
    points, points, nowIso(), userId
  );
  db.prepare(
    `INSERT INTO points_transactions (id, user_id, type, source_type, source_id, points, status, description, created_at)
     VALUES (?,?,?,?,?,?, 'completed', ?, ?)`
  ).run(uuid(), userId, 'adjustment', 'habit_log', sourceId, -points, description, nowIso());
  db.prepare('UPDATE profiles SET xp = MAX(0, xp - ?), updated_at = ? WHERE user_id = ?').run(points, nowIso(), userId);
}

module.exports = {
  LEVELS,
  levelForXp,
  ensureWallet,
  ensureUserStreak,
  ensureProfile,
  earnedToday,
  creditEarned,
  holdForRedemption,
  finalizeRedemption,
  refundRedemption,
  reverseHabitPoints,
};
