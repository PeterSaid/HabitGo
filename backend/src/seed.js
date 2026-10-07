/**
 * HabitGo seed data (spec sections 27, 39, 47, 48, 72, 73, 86).
 *
 *   npm run seed          -> insert categories/achievements/challenges/rewards + demo users (idempotent-ish)
 *   npm run seed:fresh    -> wipe everything, then seed from scratch
 *
 * Works against the local file DB or a hosted libSQL DB — set DATABASE_URL
 * and DATABASE_TOKEN env vars to seed the production database.
 *
 * Demo accounts (documented in README):
 *   peter@habitgo.app  / Peter@12345   (user, 4850 points, 12-day streak, level 3)
 *   admin@habitgo.app  / Admin@12345   (admin)
 */
const bcrypt = require('bcryptjs');
const { client, prepare, migrate, nowIso, uuid } = require('./db');
const { config } = require('./config');
const { todayIn, addDays, isoWeekday } = require('./utils/dates');

const TZ = 'Africa/Cairo';

const HABIT_CATEGORIES = [
  ['health', 'Health', 'صحة', 'heart', 1],
  ['sports', 'Sports', 'رياضة', 'dumbbell', 2],
  ['learning', 'Learning', 'تعلم', 'book', 3],
  ['reading', 'Reading', 'قراءة', 'open-book', 4],
  ['work', 'Work', 'عمل', 'briefcase', 5],
  ['productivity', 'Productivity', 'إنتاجية', 'zap', 6],
  ['money', 'Money', 'مال', 'coins', 7],
  ['sleep', 'Sleep', 'نوم', 'moon', 8],
  ['meditation', 'Meditation', 'تأمل', 'flower', 9],
  ['water', 'Drink Water', 'شرب المياه', 'droplet', 10],
  ['nutrition', 'Nutrition', 'تغذية', 'apple', 11],
  ['relationships', 'Relationships', 'علاقات', 'users', 12],
  ['personal-growth', 'Personal Growth', 'تطوير شخصي', 'sprout', 13],
  ['other', 'Other', 'أخرى', 'star', 14],
];

const REWARD_CATEGORIES = [
  ['cash', 'Cash Rewards', 'مكافآت نقدية', 'banknote', 1],
  ['gift-cards', 'Gift Cards', 'بطاقات هدايا', 'gift', 2],
  ['discounts', 'Discounts', 'خصومات', 'tag', 3],
  ['food', 'Food & Drinks', 'مأكولات ومشروبات', 'coffee', 4],
  ['shopping', 'Shopping', 'تسوق', 'shopping-bag', 5],
  ['fitness', 'Fitness', 'لياقة', 'dumbbell', 6],
  ['entertainment', 'Entertainment', 'ترفيه', 'clapperboard', 7],
  ['subscriptions', 'Subscriptions', 'اشتراكات', 'play', 8],
  ['premium', 'Premium', 'بريميوم', 'crown', 9],
  ['charity', 'Charity', 'تبرعات', 'hand-heart', 10],
];

const PARTNERS = [
  ['demo-cafe', 'Demo Café', 'كافيه ديمو'],
  ['demo-fit', 'DemoFit Club', 'نادي ديمو فيت'],
  ['demo-store', 'Demo Store', 'متجر ديمو'],
  ['habitgo', 'HabitGo', 'HabitGo'],
];

const ACHIEVEMENTS = [
  ['first_habit', 'First Habit', 'أول عادة', 'You created your first habit.', 'أنشأت أول عادة لك.', 'sprout', 0, 50, 'habit_count', null, 1, 1],
  ['first_week', 'First Week', 'أول أسبوع', 'You kept a 7-day streak going.', 'حافظت على استمرارية 7 أيام.', 'calendar-check', 0, 100, 'user_streak', null, 7, 2],
  ['streak_7', '7 Day Streak', 'استمرارية 7 أيام', 'A habit survived a full week.', 'عادة استمرت أسبوعًا كاملًا.', 'flame', 0, 100, 'habit_streak', null, 7, 3],
  ['streak_30', '30 Day Streak', 'استمرارية 30 يوم', 'A whole month of consistency!', 'شهر كامل من الالتزام!', 'flame', 0, 250, 'habit_streak', null, 30, 4],
  ['habits_100', '100 Habits Completed', 'إكمال 100 عادة', 'You completed 100 habit check-ins.', 'أكملت 100 تسجيل عادة.', 'medal', 0, 200, 'total_completions', null, 100, 5],
  ['perfect_week', 'Perfect Week', 'أسبوع مثالي', 'Every habit, every day, for a week.', 'كل عادة، كل يوم، لأسبوع كامل.', 'star', 0, 150, 'perfect_days', null, 7, 6],
  ['early_bird', 'Early Bird', 'طائر مبكر', '10 completions before 9 AM.', '10 إكمالات قبل التاسعة صباحًا.', 'sunrise', 0, 100, 'early_bird', null, 10, 7],
  ['fitness_hero', 'Fitness Hero', 'بطل اللياقة', '20 sports workouts completed.', '20 تمرينًا رياضيًا مكتملًا.', 'dumbbell', 0, 150, 'category_completions', 'sports', 20, 8],
  ['reading_master', 'Reading Master', 'سيد القراءة', '20 reading sessions completed.', '20 جلسة قراءة مكتملة.', 'open-book', 0, 150, 'category_completions', 'reading', 20, 9],
  ['habit_master', 'Habit Master', 'سيّد العادات', '500 completions. Legendary consistency.', '500 إكمال. التزام أسطوري.', 'trophy', 0, 500, 'total_completions', null, 500, 10],
  ['reward_collector', 'Reward Collector', 'جامع المكافآت', 'You redeemed 3 rewards.', 'استبدلت 3 مكافآت.', 'gift', 0, 100, 'redeem_count', null, 3, 11],
];

const CHALLENGES = [
  ['ch-reading-7', '7-Day Reading Challenge', 'تحدي القراءة 7 أيام', 'Read every day for a week.', 'اقرأ كل يوم لمدة أسبوع.', 'open-book', 'reading', 7, 7, 150, 'medium'],
  ['ch-fitness-30', '30-Day Fitness Challenge', 'تحدي اللياقة 30 يوم', 'Work out 30 days this month.', 'تمرّن 30 يومًا هذا الشهر.', 'dumbbell', 'sports', 30, 20, 600, 'hard'],
  ['ch-water-7', 'Drink Water Challenge', 'تحدي شرب المياه', 'Hit your water goal 7 days in a row.', 'حقق هدف المياه 7 أيام متتالية.', 'droplet', 'water', 7, 7, 120, 'easy'],
  ['ch-nosugar-7', 'No Sugar Week', 'أسبوع بدون سكر', 'Skip added sugar for a week.', 'تجنب السكر المضاف لأسبوع.', 'candy', 'nutrition', 7, 7, 150, 'medium'],
  ['ch-meditation-7', 'Meditation Week', 'أسبوع التأمل', 'Meditate every day this week.', 'تأمل كل يوم هذا الأسبوع.', 'flower', 'meditation', 7, 7, 120, 'easy'],
];

const REWARDS = [
  ['rw-coffee', 'food', 'demo-cafe', 'Coffee Voucher', 'قسيمة قهوة', 'A free coffee at Demo Café.', 'قهوة مجانية من كافيه ديمو.', 500, 100, 'code', null,
    'Valid for 30 days after redemption.', 'صالحة 30 يومًا بعد الاستبدال.'],
  ['rw-fitness-20', 'fitness', 'demo-fit', '20% Fitness Discount', 'خصم 20% على اللياقة', '20% off a DemoFit Club membership.', 'خصم 20% على عضوية نادي ديمو فيت.', 750, 50, 'code', null,
    'Applies to the first month.', 'يُطبق على الشهر الأول.'],
  ['rw-gift-card', 'gift-cards', 'demo-store', 'Shopping Gift Card', 'بطاقة هدايا تسوق', 'A demo gift card for Demo Store.', 'بطاقة هدايا تجريبية من متجر ديمو.', 1500, 30, 'code', null,
    'Demo data — no real monetary value.', 'بيانات تجريبية — بدون قيمة مالية حقيقية.'],
  ['rw-premium-1m', 'premium', 'habitgo', '1 Month Premium', 'شهر بريميوم', 'One month of HabitGo Premium.', 'شهر واحد من HabitGo بريميوم.', 2000, null, 'manual', null,
    'Activates after review.', 'يُفعّل بعد المراجعة.'],
  ['rw-cash-50', 'cash', 'habitgo', 'Cash Reward Request', 'طلب مكافأة نقدية', 'Convert points to a cash request (50 units).', 'تحويل النقاط إلى طلب نقدي (50 وحدة).', 5000, null, 'cash', 50,
    'Paid out after admin review. Demo only.', 'يُدفع بعد مراجعة الإدارة. للتجربة فقط.'],
];

async function freshWipe() {
  const tables = [
    'audit_logs', 'notifications', 'challenge_participants', 'challenges', 'user_achievements', 'achievements',
    'reward_redemptions', 'rewards', 'reward_partners', 'reward_categories', 'points_transactions', 'points_wallets',
    'user_streaks', 'streaks', 'habit_logs', 'habit_schedules', 'habits', 'habit_categories', 'user_settings',
    'profiles', 'devices', 'users', 'app_settings',
  ];
  await client.batch(tables.map((t) => ({ sql: `DELETE FROM ${t};`, args: [] })), 'write');
}

async function seedStatic() {
  const now = nowIso();
  const insCat = prepare('INSERT OR IGNORE INTO habit_categories (id, name_en, name_ar, icon, sort_order, is_active) VALUES (?,?,?,?,?,1)');
  for (const [id, en, ar, icon, order] of HABIT_CATEGORIES) await insCat.run(id, en, ar, icon, order);

  const insRCat = prepare('INSERT OR IGNORE INTO reward_categories (id, name_en, name_ar, icon, sort_order, is_active) VALUES (?,?,?,?,?,1)');
  for (const [id, en, ar, icon, order] of REWARD_CATEGORIES) await insRCat.run(id, en, ar, icon, order);

  const insPartner = prepare('INSERT OR IGNORE INTO reward_partners (id, name_en, name_ar, is_active) VALUES (?,?,?,1)');
  for (const [id, en, ar] of PARTNERS) await insPartner.run(id, en, ar);

  const insAch = prepare(
    `INSERT OR IGNORE INTO achievements (id, name_en, name_ar, description_en, description_ar, icon, points_bonus, xp_bonus, condition_type, condition_meta, threshold, sort_order, is_active)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`
  );
  for (const a of ACHIEVEMENTS) await insAch.run(...a);

  const insCh = prepare(
    `INSERT OR IGNORE INTO challenges (id, name_en, name_ar, description_en, description_ar, icon, category_id, duration_days, target_days, points_bonus, difficulty, is_active, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)`
  );
  for (const c of CHALLENGES) await insCh.run(...c, now, now);

  const insRw = prepare(
    `INSERT OR IGNORE INTO rewards (id, partner_id, category_id, name_en, name_ar, description_en, description_ar,
       image, points_cost, stock, expiry_date, terms_en, terms_ar, redemption_type, cash_amount, is_active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, ?, ?, ?, 1, ?, ?, ?)`
  );
  for (let i = 0; i < REWARDS.length; i++) {
    const [id, cat, partner, en, ar, dEn, dAr, cost, stock, type, cash, termsEn, termsAr] = REWARDS[i];
    await insRw.run(id, partner, cat, en, ar, dEn, dAr, cost, stock, termsEn, termsAr, type, cash, i + 1, now, now);
  }
}

async function upsertUser({ id, email, password, name, role = 'user', country = 'Egypt', city = 'Cairo', tz = TZ, locale = 'ar', theme = 'system', xp = 0, interests = [], onboarded = true }) {
  const now = nowIso();
  await prepare(
    `INSERT INTO users (id, email, password_hash, role, status, country, city, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`
  ).run(id, email, bcrypt.hashSync(password, 10), role, country, city, now, now);
  await prepare(
    `INSERT INTO profiles (user_id, name, timezone, xp, interests, onboarded, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET name = excluded.name, timezone = excluded.timezone, xp = excluded.xp, interests = excluded.interests, onboarded = excluded.onboarded`
  ).run(id, name, tz, xp, JSON.stringify(interests), onboarded ? 1 : 0, now, now);
  await prepare(
    `INSERT INTO user_settings (user_id, locale, theme, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET locale = excluded.locale, theme = excluded.theme`
  ).run(id, locale, theme, now);
  await prepare('INSERT OR IGNORE INTO points_wallets (user_id, updated_at) VALUES (?, ?)').run(id, now);
  await prepare('INSERT OR IGNORE INTO user_streaks (user_id, updated_at) VALUES (?, ?)').run(id, now);
}

async function seedPeter() {
  const pid = 'user-peter';
  await upsertUser({
    id: pid,
    email: 'peter@habitgo.app',
    password: config.seedPasswords.user,
    name: 'Peter',
    xp: 2400, // Level 3 (Consistent)
    interests: ['health', 'sports', 'learning', 'water', 'sleep'],
  });
  const today = todayIn(TZ);

  // ---- Habits (spec section 72) ----
  const habits = [
    { id: 'hb-water', name: 'Drink Water', ar: 'اشرب المياه', cat: 'water', icon: 'droplet', color: '#14B8A6', type: 'quantitative', goal: 8, unit: 'cups', diff: 'medium', points: 20, freq: 'daily', reminder: '15:00' },
    { id: 'hb-workout', name: 'Morning Workout', ar: 'تمرين الصباح', cat: 'sports', icon: 'dumbbell', color: '#22C55E', type: 'binary', goal: 1, unit: null, diff: 'hard', points: 30, freq: 'weekly_days', days: [1, 3, 5, 6], reminder: '07:00' },
    { id: 'hb-read', name: 'Read 20 Minutes', ar: 'اقرأ 20 دقيقة', cat: 'reading', icon: 'open-book', color: '#3B82F6', type: 'binary', goal: 1, unit: null, diff: 'medium', points: 20, freq: 'daily', reminder: '21:00' },
    { id: 'hb-english', name: 'Learn English', ar: 'تعلّم الإنجليزية', cat: 'learning', icon: 'book', color: '#F59E0B', type: 'binary', goal: 1, unit: null, diff: 'medium', points: 20, freq: 'weekly_days', days: [1, 2, 3, 4, 5], reminder: '19:00' },
    { id: 'hb-sleep', name: 'Sleep Before 11 PM', ar: 'نم قبل 11 مساءً', cat: 'sleep', icon: 'moon', color: '#8B5CF6', type: 'binary', goal: 1, unit: null, diff: 'easy', points: 10, freq: 'daily', reminder: '22:30' },
  ];
  const now = nowIso();
  const start = addDays(today, -34);
  for (const h of habits) {
    await prepare(
      `INSERT OR IGNORE INTO habits (id, user_id, name, description, category_id, icon, color, type, goal_value, goal_unit,
         difficulty, points, start_date, end_date, is_paused, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 0, ?, ?)`
    ).run(h.id, pid, h.name, h.ar, h.cat, h.icon, h.color, h.type, h.goal, h.unit, h.diff, h.points, start, now, now);
    await prepare(
      `INSERT OR IGNORE INTO habit_schedules (id, habit_id, freq_type, days_of_week, times_per_week, times_per_month, reminder_time, reminder_days, reminder_message, created_at)
       VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)`
    ).run(
      `sch-${h.id}`, h.id, h.freq,
      h.days ? h.days.join(',') : null,
      h.reminder, null, null, now
    );
  }

  // ---- 30 days of realistic history ----
  // Deterministic pseudo-random so seeding is reproducible.
  let seedNum = 42;
  const rnd = () => {
    seedNum = (seedNum * 1103515245 + 12345) % 2147483648;
    return seedNum / 2147483648;
  };

  const insLog = prepare(
    `INSERT OR IGNORE INTO habit_logs (id, habit_id, user_id, date, target, completed_value, status, points_earned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insTx = prepare(
    `INSERT OR IGNORE INTO points_transactions (id, user_id, type, source_type, source_id, points, status, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?)`
  );

  let lifetime = 0;
  for (const h of habits) {
    for (let i = 30; i >= 0; i--) {
      const d = addDays(today, -i);
      if (d < start) continue;
      const sched = h.freq === 'daily' || (h.days && h.days.includes(isoWeekday(d)));
      if (!sched) continue;
      if (d === today && (h.id === 'hb-water' || h.id === 'hb-read' || h.id === 'hb-sleep')) continue; // leave some for live testing
      const roll = rnd();
      let value = 0;
      if (h.type === 'quantitative') value = roll < 0.2 ? Math.ceil(rnd() * 6) : 8;
      else value = roll < 0.15 ? 0 : 1;
      if (value === 0) continue;
      const earned = Math.round((h.points * value) / h.goal);
      const ts = `${d}T${h.reminder || '20:00'}:00.000Z`;
      await insLog.run(uuid(), h.id, pid, d, h.goal, value, value >= h.goal ? 'completed' : 'partial', earned, ts, ts);
      await insTx.run(uuid(), pid, 'earn', 'habit_log', null, earned, `${h.name} (${d})`, ts);
      lifetime += earned;
    }
  }

  // ---- Streaks: 12-day user streak ending today (spec section 72) ----
  for (let i = 11; i >= 0; i--) {
    const d = addDays(today, -i);
    const any = (await prepare('SELECT COUNT(*) AS n FROM habit_logs WHERE user_id = ? AND date = ?').get(pid, d)).n;
    if (any === 0) {
      // keep the chain: log a sleep completion on that day
      const h = habits.find((x) => x.id === 'hb-sleep');
      const earned = h.points;
      const ts = `${d}T22:00:00.000Z`;
      await insLog.run(uuid(), h.id, pid, d, 1, 1, 'completed', earned, ts, ts);
      await insTx.run(uuid(), pid, 'earn', 'habit_log', null, earned, `${h.name} (${d})`, ts);
      lifetime += earned;
    }
  }
  const usBest = 18;
  await prepare(
    `UPDATE user_streaks SET current_streak = 12, best_streak = ?, perfect_day_streak = 5, best_perfect_day = 6,
       last_active_date = ?, last_perfect_date = ?, updated_at = ? WHERE user_id = ?`
  ).run(usBest, today, addDays(today, -1), now, pid);

  for (const h of habits) {
    const done = await prepare("SELECT MAX(date) AS d FROM habit_logs WHERE habit_id = ? AND status='completed'").get(h.id);
    let current = 0;
    if (done && done.d) {
      let cursor = done.d;
      for (;;) {
        const sched = h.freq === 'daily' || (h.days && h.days.includes(isoWeekday(cursor)));
        if (!sched) { cursor = addDays(cursor, -1); continue; }
        const ok = await prepare("SELECT 1 AS ok FROM habit_logs WHERE habit_id = ? AND date = ? AND status='completed'").get(h.id, cursor);
        if (!ok) break;
        current += 1;
        cursor = addDays(cursor, -1);
        if (current > 40) break;
      }
    }
    await prepare(
      `INSERT OR IGNORE INTO streaks (id, habit_id, user_id, current_streak, best_streak, last_completed_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(`stk-${h.id}`, h.id, pid, current, Math.max(current + 6, usBest), done ? done.d : null, now);
  }

  // ---- Wallet: land exactly on 4850 (spec section 72) ----
  const adjustment = 4850 - lifetime;
  if (adjustment !== 0) {
    await insTx.run(uuid(), pid, 'bonus', 'admin', null, adjustment, 'Welcome bonus & referrals', `${start}T10:00:00.000Z`);
  }
  const bonus50 = 50;
  await insTx.run(uuid(), pid, 'bonus', 'streak_bonus', null, bonus50, '7-day streak bonus', `${addDays(today, -5)}T21:00:00.000Z`);
  const total = 4850;
  await prepare(
    'UPDATE points_wallets SET available = ?, pending = 0, lifetime = ?, redeemed = 150, updated_at = ? WHERE user_id = ?'
  ).run(total - 150, total + bonus50, now, pid);

  // ---- A completed redemption so history looks real ----
  await prepare(
    `INSERT OR IGNORE INTO reward_redemptions (id, user_id, reward_id, points_cost, status, redemption_code, requested_at, approved_at, completed_at)
     VALUES ('red-demo-1', ?, 'rw-coffee', 500, 'completed', 'HG-RW1-A7X3K9', ?, ?, ?)`
  ).run(pid, addDays(today, -20), addDays(today, -20), addDays(today, -20));

  // ---- Achievements snapshot ----
  const achOwned = ['first_habit', 'first_week', 'streak_7', 'habits_100'];
  for (let i = 0; i < achOwned.length; i++) {
    await prepare(
      'INSERT OR IGNORE INTO user_achievements (id, user_id, achievement_id, points_awarded, achieved_at) VALUES (?, ?, ?, 0, ?)'
    ).run(uuid(), pid, achOwned[i], addDays(today, -(25 - i * 3)));
  }

  // ---- Challenge participation ----
  await prepare(
    `INSERT OR IGNORE INTO challenge_participants (id, challenge_id, user_id, progress_days, status, joined_at)
     VALUES (?, 'ch-water-7', ?, 5, 'active', ?)`
  ).run(uuid(), pid, addDays(today, -5));
  await prepare(
    `INSERT OR IGNORE INTO challenge_participants (id, challenge_id, user_id, progress_days, status, joined_at, completed_at)
     VALUES (?, 'ch-reading-7', ?, 7, 'completed', ?, ?)`
  ).run(uuid(), pid, addDays(today, -14), addDays(today, -7));

  // ---- Notifications ----
  const { notify } = require('./services/notifications');
  await notify(pid, 'bonus', '🔥 7-day streak bonus!', '🔥 مكافأة استمرارية 7 أيام!', 'You earned +50 bonus points.', 'حصلت على +50 نقطة إضافية.', null);
  await notify(pid, 'reward', 'Reward redeemed 🎁', 'تم استبدال المكافأة 🎁', 'Your Coffee Voucher code: HG-RW1-A7X3K9', 'كود قسيمة القهوة الخاص بك: HG-RW1-A7X3K9', null);
  await notify(pid, 'challenge', 'Challenge joined: Drink Water Challenge', 'تم الانضمام للتحدي: تحدي شرب المياه', 'Complete 7 days to earn 120 bonus points.', 'أكمل 7 أيام للحصول على 120 نقطة إضافية.', null);
  await notify(pid, 'system', 'Welcome to HabitGo 👋', 'مرحبًا بك في HabitGo 👋', 'Build better habits. Earn real rewards.', 'كوّن عادات أفضل. واكسب مكافآت حقيقية.', null);
}

async function seedAdmin() {
  await upsertUser({
    id: 'user-admin',
    email: 'admin@habitgo.app',
    password: config.seedPasswords.admin,
    name: 'HabitGo Admin',
    role: 'admin',
    xp: 0,
    interests: [],
    tz: TZ,
    locale: 'en',
  });
}

async function run({ fresh = false } = {}) {
  await migrate();
  if (fresh) {
    await freshWipe();
    console.log('• wiped existing data');
  }
  await seedStatic();
  await seedAdmin();
  const existing = (await prepare('SELECT COUNT(*) AS n FROM habits WHERE user_id = ?').get('user-peter')).n;
  if (existing === 0) {
    await seedPeter();
    console.log('• seeded demo user Peter (peter@habitgo.app)');
  } else {
    console.log('• demo user Peter already present — history not regenerated (use seed:fresh to reset)');
  }
  const users = (await prepare('SELECT COUNT(*) AS n FROM users').get()).n;
  const rewards = (await prepare('SELECT COUNT(*) AS n FROM rewards').get()).n;
  console.log(`✓ seed complete: ${users} users, ${rewards} rewards, ${ACHIEVEMENTS.length} achievements, ${CHALLENGES.length} challenges`);
  client.close();
}

const fresh = process.argv.includes('--fresh');
run({ fresh }).catch((e) => {
  console.error(e);
  process.exit(1);
});
