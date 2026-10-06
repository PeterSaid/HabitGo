const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { db, nowIso, uuid } = require('../db');
const { asyncHandler, validate, badRequest, unauthorized, notFound } = require('../utils/http');
const { signToken, requireAuth } = require('../middleware/auth');
const { audit } = require('../middleware/errors');
const { rateLimit } = require('../middleware/rateLimit');
const wallet = require('../services/wallet');

const router = express.Router();

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a digit');

const registerSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: passwordSchema,
  name: z.string().min(2).max(60),
  phone: z.string().min(6).max(20).optional(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  country: z.string().max(60).optional(),
  city: z.string().max(60).optional(),
  locale: z.enum(['ar', 'en']).default('ar'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

// In-memory password reset tokens (MVP; documented limitation)
const resetTokens = new Map();

function publicUser(u) {
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(u.id);
  const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(u.id);
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    role: u.role,
    name: profile ? profile.name : '',
    avatar_url: profile ? profile.avatar_url : null,
    timezone: profile ? profile.timezone : 'UTC',
    xp: profile ? profile.xp : 0,
    interests: profile && profile.interests ? JSON.parse(profile.interests) : [],
    onboarded: profile ? !!profile.onboarded : false,
    joined_at: u.created_at,
    settings: settings || null,
  };
}

function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ? AND status = ?').get(email, 'active');
}

router.post(
  '/register',
  rateLimit({ key: 'register', max: 20 }),
  asyncHandler(async (req, res) => {
    const data = validate(registerSchema, req.body);
    if (findUserByEmail(data.email)) throw badRequest('An account with this email already exists', 'email_taken');
    if (data.phone && db.prepare('SELECT 1 FROM users WHERE phone = ?').get(data.phone)) {
      throw badRequest('An account with this phone already exists', 'phone_taken');
    }

    const id = uuid();
    const now = nowIso();
    const hash = bcrypt.hashSync(data.password, 10);
    db.prepare(
      `INSERT INTO users (id, email, phone, password_hash, role, status, date_of_birth, gender, country, city, created_at, updated_at)
       VALUES (?,?,?,?,'user','active',?,?,?,?,?,?)`
    ).run(id, data.email, data.phone || null, hash, data.date_of_birth || null, data.gender || null, data.country || null, data.city || null, now, now);

    wallet.ensureProfile(id, data.name);
    db.prepare('INSERT INTO user_settings (user_id, locale, theme, updated_at) VALUES (?,?,?,?,?)').run(
      id, data.locale, data.theme, now
    );
    wallet.ensureWallet(id);
    wallet.ensureUserStreak(id);

    audit(req, 'auth.register', 'user', id);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

router.post(
  '/login',
  rateLimit({ key: 'login', max: 30 }),
  asyncHandler(async (req, res) => {
    const data = validate(loginSchema, req.body);
    const user = findUserByEmail(data.email);
    if (!user || !bcrypt.compareSync(data.password, user.password_hash)) {
      throw unauthorized('Incorrect email or password', 'bad_credentials');
    }
    audit(req, 'auth.login', 'user', user.id);
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

router.post(
  '/forgot-password',
  rateLimit({ key: 'forgot', max: 10 }),
  asyncHandler(async (req, res) => {
    const { email } = validate(z.object({ email: z.string().email().toLowerCase() }), req.body);
    const user = findUserByEmail(email);
    // Always answer 200 to avoid account enumeration
    if (!user) return res.json({ ok: true });
    const token = uuid() + uuid().slice(0, 8);
    resetTokens.set(token, { userId: user.id, expires: Date.now() + 30 * 60 * 1000 });
    require('../services/notifications').notify(
      user.id,
      'system',
      'Password reset requested',
      'طلب إعادة تعيين كلمة المرور',
      'Use the reset code shown in the app (MVP: no email delivery configured).',
      'استخدم رمز إعادة التعيين الظاهر في التطبيق (نسخة الاختبار: لا يوجد بريد إلكتروني).',
      null
    );
    const expose = config_allowsDevReset();
    res.json({ ok: true, ...(expose ? { reset_token: token } : {}) });
  })
);

function config_allowsDevReset() {
  const { config } = require('../config');
  return config.env !== 'production';
}

router.post(
  '/reset-password',
  rateLimit({ key: 'reset', max: 10 }),
  asyncHandler(async (req, res) => {
    const { token, new_password } = validate(
      z.object({ token: z.string().min(10), new_password: passwordSchema }),
      req.body
    );
    const entry = resetTokens.get(token);
    if (!entry || entry.expires < Date.now()) throw badRequest('Reset link is invalid or expired', 'reset_invalid');
    resetTokens.delete(token);
    const hash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, nowIso(), entry.userId);
    audit(req, 'auth.reset_password', 'user', entry.userId);
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id);
    const level = wallet.levelForXp(profile ? profile.xp : 0);
    res.json({ user: publicUser(user), level });
  })
);

module.exports = { router, publicUser, findUserByEmail, passwordSchema };
