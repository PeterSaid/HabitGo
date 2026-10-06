const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { config, DEFAULT_APP_SETTINGS } = require('./config');
const { uuid } = require('./utils/ids');

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

const db = new DatabaseSync(config.dbFile);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const nowIso = () => new Date().toISOString();

function migrate() {
  const ddl = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(ddl);

  // App settings defaults (only inserts what is missing)
  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)'
  );
  for (const [key, value] of Object.entries(DEFAULT_APP_SETTINGS)) {
    insertSetting.run(key, value, nowIso());
  }
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : undefined;
}

function getSettingNumber(key, fallback) {
  const v = Number(getSetting(key));
  return Number.isFinite(v) ? v : fallback;
}

function setSetting(key, value) {
  db.prepare(
    'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ' +
      'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
  ).run(key, String(value), nowIso());
}

function getAllSettings() {
  return db.prepare('SELECT key, value, updated_at FROM app_settings ORDER BY key').all();
}

module.exports = { db, migrate, nowIso, uuid, getSetting, getSettingNumber, setSetting, getAllSettings };
