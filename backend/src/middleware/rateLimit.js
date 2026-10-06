const { tooMany } = require('../utils/http');

// Simple in-memory sliding-window limiter. Adequate for MVP single-process;
// swap for Redis-based limiting when scaling out.
const buckets = new Map();

function rateLimit({ windowMs = 60_000, max = 100, key = 'global' } = {}) {
  return (req, res, next) => {
    const id = `${key}:${req.ip}`;
    const now = Date.now();
    let bucket = buckets.get(id);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(id, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return next(tooMany('Too many requests. Please slow down and try again shortly.'));
    }
    next();
  };
}

module.exports = { rateLimit };
