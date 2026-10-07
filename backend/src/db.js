/**
 * Database layer — libSQL (Turso-compatible SQLite).
 *
 * Local dev: no env needed → file-backed DB at ../data/habitgo.db (same as before).
 * Production: set DATABASE_URL (libsql://…turso.io) + DATABASE_TOKEN → hosted, permanent.
 *
 * All helpers are async. `prepare(sql)` mirrors the old node:sqlite shape:
 *   (await db.prepare(sql)).get(args…) / .all(args…) / .run(args…)
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');
const { config, DEFAULT_APP_SETTINGS } = require('./config');
const { uuid } = require('./utils/ids');

const url = process.env.DATABASE_URL || `file:${config.dbFile}`;
const client = createClient({
  url,
  authToken: process.env.DATABASE_TOKEN || undefined,
});

const nowIso = () => new Date().toISOString();

function prepare(sql) {
  return {
    get: async (...args) => {
      const r = await client.execute({ sql, args });
      return r.rows[0];
    },
    all: async (...args) => {
      const r = await client.execute({ sql, args });
      return r.rows;
    },
    run: async (...args) => {
      await client.execute({ sql, args });
    },
  };
}

/** Split a .sql file into individual statements (comment lines removed). */
function splitStatements(ddl) {
  const cleaned = ddl
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return cleaned
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function migrate() {
  const ddl = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const statements = splitStatements(ddl);
  // PRAGMAs can't run inside libSQL's batch transaction ("cannot change into
  // wal mode from within a transaction") — run them separately, tolerate hosts
  // that reject them (e.g. managed Turso).
  for (const pragma of statements.filter((s) => /^PRAGMA\b/i.test(s))) {
    await client.execute(pragma).catch(() => {});
  }
  const ddlStatements = statements.filter((s) => !/^PRAGMA\b/i.test(s));
  await client.batch(ddlStatements.map((sql) => ({ sql, args: [] })), 'write');

  // App settings defaults (only inserts what is missing)
  for (const [key, value] of Object.entries(DEFAULT_APP_SETTINGS)) {
    await client.execute({
      sql: 'INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)',
      args: [key, value, nowIso()],
    });
  }
}

async function getSetting(key) {
  const row = await client.execute({ sql: 'SELECT value FROM app_settings WHERE key = ?', args: [key] });
  return row.rows[0] ? row.rows[0].value : undefined;
}

async function getSettingNumber(key, fallback) {
  const v = Number(await getSetting(key));
  return Number.isFinite(v) ? v : fallback;
}

async function setSetting(key, value) {
  await client.execute({
    sql: 'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ' +
      'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    args: [key, String(value), nowIso()],
  });
}

async function getAllSettings() {
  const r = await client.execute({ sql: 'SELECT key, value, updated_at FROM app_settings ORDER BY key', args: [] });
  return r.rows;
}

/**
 * Run `fn` inside a libSQL transaction. fn receives a tx whose .execute has the
 * same shape as client.execute. Commits on success, rolls back on throw.
 */
async function withTransaction(fn) {
  const tx = await client.transaction('write');
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (e) {
    await tx.rollback().catch(() => {});
    throw e;
  }
}

module.exports = {
  client,
  prepare,
  withTransaction,
  migrate,
  nowIso,
  uuid,
  getSetting,
  getSettingNumber,
  setSetting,
  getAllSettings,
};
