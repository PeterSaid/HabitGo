const { ApiError } = require('../utils/http');
const { prepare, nowIso, uuid } = require('../db');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  // Unique constraint violations -> friendly conflict
  if (err && err.code && String(err.code).startsWith('SQLITE_CONSTRAINT')) {
    return res.status(409).json({ error: { code: 'conflict', message: 'This record already exists' } });
  }
  console.error('[unhandled]', err);
  res.status(500).json({ error: { code: 'internal_error', message: 'Something went wrong. Please try again.' } });
}

/** Fire-and-forget audit trail. */
function audit(req, action, entityType, entityId, metadata) {
  prepare(
    'INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, metadata, ip, created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).run(
    uuid(),
    req.user ? req.user.id : null,
    action,
    entityType || null,
    entityId || null,
    metadata ? JSON.stringify(metadata) : null,
    req.ip || null,
    nowIso()
  ).catch((e) => console.error('[audit]', e.message));
}

module.exports = { errorHandler, audit };
