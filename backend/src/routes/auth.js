const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { prepare, nowIso, uuid, withTransaction } = require('../db');
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

// In-memory OTP store (MVP): email -> { hash, expires, attempts, userId }
const crypto = require('crypto');
const otpStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

async function publicUser(u) {
  const profile = await prepare('SELECT * FROM profiles WHERE user_id = ?').get(u.id);
  const settings = await prepare('SELECT * FROM user_settings WHERE user_id = ?').get(u.id);
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

async function findUserByEmail(email) {
  return prepare('SELECT * FROM users WHERE email = ? AND status = ?').get(email, 'active');
}

router.post(
  '/register',
  rateLimit({ key: 'register', max: 20 }),
  asyncHandler(async (req, res) => {
    const data = validate(registerSchema, req.body);
    if (await findUserByEmail(data.email)) throw badRequest('An account with this email already exists', 'email_taken');
    if (data.phone && (await prepare('SELECT 1 AS ok FROM users WHERE phone = ?').get(data.phone))) {
      throw badRequest('An account with this phone already exists', 'phone_taken');
    }

    const id = uuid();
    const now = nowIso();
    const hash = bcrypt.hashSync(data.password, 10);

    // Atomic: either the whole account exists or nothing does
    await withTransaction(async (tx) => {
      await tx.execute({
        sql: `INSERT INTO users (id, email, phone, password_hash, role, status, date_of_birth, gender, country, city, created_at, updated_at)
              VALUES (?,?,?,?,'user','active',?,?,?,?,?,?)`,
        args: [id, data.email, data.phone || null, hash, data.date_of_birth || null, data.gender || null, data.country || null, data.city || null, now, now],
      });
      await tx.execute({
        sql: 'INSERT INTO profiles (user_id, name, timezone, created_at, updated_at) VALUES (?,?,?,?,?)',
        args: [id, data.name, 'UTC', now, now],
      });
      await tx.execute({
        sql: 'INSERT INTO user_settings (user_id, locale, theme, updated_at) VALUES (?,?,?,?)',
        args: [id, data.locale, data.theme, now],
      });
      await tx.execute({
        sql: 'INSERT INTO points_wallets (user_id, updated_at) VALUES (?, ?)',
        args: [id, now],
      });
      await tx.execute({
        sql: 'INSERT INTO user_streaks (user_id, updated_at) VALUES (?, ?)',
        args: [id, now],
      });
    });

    audit(req, 'auth.register', 'user', id);
    const user = await prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json({ token: signToken(user), user: await publicUser(user) });
  })
);

router.post(
  '/login',
  rateLimit({ key: 'login', max: 30 }),
  asyncHandler(async (req, res) => {
    const data = validate(loginSchema, req.body);
    const user = await findUserByEmail(data.email);
    if (!user || !bcrypt.compareSync(data.password, user.password_hash)) {
      throw unauthorized('Incorrect email or password', 'bad_credentials');
    }
    audit(req, 'auth.login', 'user', user.id);
    res.json({ token: signToken(user), user: await publicUser(user) });
  })
);

router.post(
  '/forgot-password',
  rateLimit({ key: 'forgot', max: 10 }),
  asyncHandler(async (req, res) => {
    const { email } = validate(z.object({ email: z.string().email().toLowerCase() }), req.body);
    const user = await findUserByEmail(email);

    const mail = require('../services/email');
    // Never reveal whether the account exists
    if (!user) return res.json({ ok: true, delivered: mail.isMailConfigured() });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(email, {
      hash: sha256(otp),
      expires: Date.now() + OTP_TTL_MS,
      attempts: 0,
      userId: user.id,
    });

    let delivered = false;
    try {
      const result = await mail.sendOtpEmail(email, otp);
      delivered = result.sent;
    } catch (e) {
      console.error('[mail]', e.message);
    }

    require('../services/notifications')
      .notify(
        user.id,
        'system',
        'Password reset requested',
        'طلب إعادة تعيين كلمة المرور',
        delivered ? 'We emailed you a 6-digit code.' : `Demo mode (no SMTP configured). Your code: ${otp}`,
        delivered ? 'أرسلنا لك كودًا من 6 أرقام على بريدك.' : `وضع التجربة (بدون SMTP). الكود: ${otp}`,
        null
      )
      .catch(() => {});

    // Demo mode only: expose the OTP so the flow is testable without SMTP
    res.json({ ok: true, delivered, ...(delivered ? {} : { otp }) });
  })
);

router.post(
  '/reset-password',
  rateLimit({ key: 'reset', max: 15 }),
  asyncHandler(async (req, res) => {
    const { email, otp, new_password } = validate(
      z.object({
        email: z.string().email().toLowerCase(),
        otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
        new_password: passwordSchema,
      }),
      req.body
    );

    const entry = otpStore.get(email);
    if (!entry) throw badRequest('Request a new code first', 'otp_invalid');
    if (entry.expires < Date.now()) {
      otpStore.delete(email);
      throw badRequest('This code expired — request a new one', 'otp_expired');
    }
    if (entry.attempts >= OTP_MAX_ATTEMPTS) {
      otpStore.delete(email);
      throw badRequest('Too many wrong attempts — request a new code', 'otp_locked');
    }
    if (entry.hash !== sha256(otp)) {
      entry.attempts += 1;
      throw badRequest('Wrong code — check your email', 'otp_invalid');
    }

    otpStore.delete(email);
    const hash = bcrypt.hashSync(new_password, 10);
    await prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, nowIso(), entry.userId);
    audit(req, 'auth.reset_password', 'user', entry.userId);
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const profile = await prepare('SELECT * FROM profiles WHERE user_id = ?').get(user.id);
    const level = wallet.levelForXp(profile ? profile.xp : 0);
    res.json({ user: await publicUser(user), level });
  })
);

module.exports = { router, publicUser, findUserByEmail, passwordSchema };
