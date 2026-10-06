const { db, nowIso, uuid } = require('../db');
const { notify } = require('./notifications');
const wallet = require('./wallet');

/** Progress = distinct qualifying completion dates since joining. */
function qualifyingDates(userId, challenge, joinedAt) {
  const since = joinedAt.slice(0, 10);
  if (challenge.category_id) {
    return db
      .prepare(
        `SELECT DISTINCT hl.date AS d FROM habit_logs hl
         JOIN habits h ON h.id = hl.habit_id
         WHERE hl.user_id = ? AND hl.status = 'completed' AND hl.date >= ? AND h.category_id = ?`
      )
      .all(userId, since, challenge.category_id).map((r) => r.d);
  }
  return db
    .prepare(
      "SELECT DISTINCT date AS d FROM habit_logs WHERE user_id = ? AND status = 'completed' AND date >= ?"
    )
    .all(userId, since).map((r) => r.d);
}

function recomputeParticipant(userId, challenge, participant) {
  const dates = qualifyingDates(userId, challenge, participant.joined_at);
  const progress = dates.length;
  let status = participant.status;
  let completedAt = participant.completed_at;

  if (participant.status === 'active' && progress >= challenge.target_days) {
    status = 'completed';
    completedAt = nowIso();
    // creditEarned adds the bonus points and the matching XP in one step
    wallet.creditEarned(userId, challenge.points_bonus, {
      type: 'bonus',
      sourceType: 'challenge',
      sourceId: challenge.id,
      description: `Challenge complete: ${challenge.name_en}`,
    });
    notify(
      userId,
      'challenge',
      `Challenge complete: ${challenge.name_en} 🎉`,
      `اكتمل التحدي: ${challenge.name_ar} 🎉`,
      `You finished the "${challenge.name_en}" challenge and earned ${challenge.points_bonus} bonus points.`,
      `أنهيت تحدي "${challenge.name_ar}" وحصلت على ${challenge.points_bonus} نقطة إضافية.`,
      { challenge_id: challenge.id }
    );
  } else if (participant.status === 'completed' && progress < challenge.target_days) {
    // completion reverted by uncomplete — back to active (bonus not clawed back, MVP)
    status = 'active';
    completedAt = null;
  }

  db.prepare(
    'UPDATE challenge_participants SET progress_days = ?, status = ?, completed_at = ? WHERE id = ?'
  ).run(progress, status, completedAt, participant.id);
  return { progress, status };
}

/** Called from the completion pipeline. */
function updateProgressOnCompletion(userId, habit, date) {
  const rows = db
    .prepare(
      `SELECT cp.*, c.* FROM challenge_participants cp
       JOIN challenges c ON c.id = cp.challenge_id
       WHERE cp.user_id = ? AND cp.status = 'active'`
    )
    .all(userId);
  for (const row of rows) {
    // row has both participant and challenge columns
    const challenge = {
      id: row.challenge_id,
      name_en: row.name_en,
      name_ar: row.name_ar,
      category_id: row.category_id,
      target_days: row.target_days,
      points_bonus: row.points_bonus,
    };
    const participant = { id: row.id, challenge_id: row.challenge_id, joined_at: row.joined_at, status: row.status, completed_at: row.completed_at };
    recomputeParticipant(userId, challenge, participant);
  }
}

function joinChallenge(userId, challengeId) {
  const challenge = db.prepare('SELECT * FROM challenges WHERE id = ? AND is_active = 1').get(challengeId);
  if (!challenge) return null;
  const existing = db
    .prepare('SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?')
    .get(challengeId, userId);
  if (existing) return { challenge, participant: existing, already: true };
  const id = uuid();
  db.prepare(
    "INSERT INTO challenge_participants (id, challenge_id, user_id, progress_days, status, joined_at) VALUES (?,?,?,0,'active',?)"
  ).run(id, challengeId, userId, nowIso());
  notify(
    userId,
    'challenge',
    `Challenge joined: ${challenge.name_en}`,
    `تم الانضمام للتحدي: ${challenge.name_ar}`,
    `Complete ${challenge.target_days} days to earn ${challenge.points_bonus} bonus points.`,
    `أكمل ${challenge.target_days} يومًا للحصول على ${challenge.points_bonus} نقطة إضافية.`,
    { challenge_id: challenge.id }
  );
  const participant = db.prepare('SELECT * FROM challenge_participants WHERE id = ?').get(id);
  recomputeParticipant(userId, challenge, participant);
  return { challenge, participant, already: false };
}

module.exports = { updateProgressOnCompletion, joinChallenge, recomputeParticipant, qualifyingDates };
