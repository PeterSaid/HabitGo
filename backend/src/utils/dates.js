// Date helpers — all habit dates are calendar dates (YYYY-MM-DD) in the
// user's timezone. The server works with plain date strings to avoid UTC drift.

/** Local calendar date string for a JS Date: YYYY-MM-DD */
function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today's date in a named IANA timezone (falls back to server-local). */
function todayIn(timezone) {
  try {
    return toDateStr(new Date(new Date().toLocaleString('en-US', { timeZone: timezone })));
  } catch {
    return toDateStr(new Date());
  }
}

function isValidDateStr(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

function diffDays(a, b) {
  // a - b in whole days
  return Math.round((parseDate(a) - parseDate(b)) / 86400000);
}

/** ISO weekday: 1=Monday .. 7=Sunday */
function isoWeekday(s) {
  const day = parseDate(s).getDay(); // 0=Sun..6=Sat
  return day === 0 ? 7 : day;
}

/** Range of the week containing `s`, starting Monday. Returns [monday, sunday] date strings. */
function weekRange(s) {
  const start = addDays(s, -(isoWeekday(s) - 1));
  return [start, addDays(start, 6)];
}

function monthRange(ym) {
  // ym = "YYYY-MM"
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return [toDateStr(first), toDateStr(last)];
}

function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function eachDay(from, to) {
  const out = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

module.exports = {
  toDateStr,
  todayIn,
  isValidDateStr,
  parseDate,
  addDays,
  diffDays,
  isoWeekday,
  weekRange,
  monthRange,
  daysInMonth,
  eachDay,
};
