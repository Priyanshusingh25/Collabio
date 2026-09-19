/** Standardized API response envelope helpers. */

/** @returns {{success: true, data: any, meta?: object}} */
function ok(res, data, { status = 200, meta = undefined } = {}) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

/** @returns {{success: false, error: {code, message, fields?}}} */
function fail(res, error) {
  const body = {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
    },
  };
  if (error.fields) body.error.fields = error.fields;
  if (error.retryAfterSeconds) {
    res.setHeader('Retry-After', String(error.retryAfterSeconds));
    body.error.retryAfterSeconds = error.retryAfterSeconds;
  }
  return res.status(error.status || 500).json(body);
}

/** Parse pagination query params with sane bounds. */
function parsePagination(query, { defaultLimit = 50, maxLimit = 200 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = parseInt(query.limit, 10) || defaultLimit;
  limit = Math.min(maxLimit, Math.max(1, limit));
  return { page, limit, offset: (page - 1) * limit };
}

/** Cursor used for high-volume feeds (activity/notifications). */
function parseCursor(query) {
  const cursor = query.cursor ? parseInt(query.cursor, 10) : null;
  return Number.isFinite(cursor) && cursor > 0 ? cursor : null;
}

module.exports = { ok, fail, parsePagination, parseCursor };
