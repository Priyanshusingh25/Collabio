/**
 * In-memory sliding-window rate limiter factory.
 * Suitable for a single-node personal SaaS; swap for a Redis-backed
 * limiter when horizontally scaling (interface stays identical).
 */
const { RateLimitError } = require('../utils/AppError');

const buckets = new Map(); // key -> { count, firstAttempt }

// Periodic cleanup so stale entries do not leak memory (audit finding #7).
const CLEANUP_INTERVAL_MS = 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.firstAttempt > bucket.windowMs) buckets.delete(key);
  }
}, CLEANUP_INTERVAL_MS).unref();

/**
 * @param {{windowMs: number, max: number, keyFn?: (req) => string, message?: string}} options
 */
function rateLimit(options) {
  const { windowMs, max, keyFn = (req) => req.ip || 'unknown' } = options;
  return function rateLimiter(req, res, next) {
    const key = `${options.name || 'global'}:${keyFn(req)}`;
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, firstAttempt: now, windowMs };

    if (now - bucket.firstAttempt > windowMs) {
      bucket.count = 1;
      bucket.firstAttempt = now;
    } else {
      bucket.count += 1;
    }
    buckets.set(key, bucket);

    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil((bucket.firstAttempt + windowMs - now) / 1000);
      return next(new RateLimitError(retryAfterSeconds));
    }
    next();
  };
}

module.exports = { rateLimit };
