const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { prepare } = require('../db');
const { unauthorized, forbidden } = require('../utils/http');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(unauthorized());
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return next(unauthorized('Session expired or invalid', 'token_invalid'));
  }
  const user = await prepare('SELECT id, email, phone, role, status FROM users WHERE id = ?').get(payload.sub);
  if (!user) return next(unauthorized('Account not found', 'token_invalid'));
  if (user.status !== 'active') return next(forbidden('Account suspended', 'account_suspended'));
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return next(forbidden('Admin access required', 'admin_required'));
  next();
}

module.exports = { signToken, requireAuth, requireAdmin };
