const { db, nowIso, uuid } = require('../db');

function notify(userId, type, titleEn, titleAr, bodyEn, bodyAr, payload) {
  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title_en, title_ar, body_en, body_ar, payload, is_read, created_at)
     VALUES (?,?,?,?,?,?,?,?,0,?)`
  ).run(
    uuid(),
    userId,
    type,
    titleEn,
    titleAr,
    bodyEn,
    bodyAr,
    payload ? JSON.stringify(payload) : null,
    nowIso()
  );
}

module.exports = { notify };
