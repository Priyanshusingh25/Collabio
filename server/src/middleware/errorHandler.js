/** Global error handler — maps every error to the standardized envelope. */
const { AppError, ConflictError } = require('../utils/AppError');
const logger = require('../utils/logger');

// SQLite error codes that map to operational errors.
const SQLITE_UNIQUE = 'SQLITE_CONSTRAINT_UNIQUE';
const SQLITE_FOREIGN_KEY = 'SQLITE_CONSTRAINT_FOREIGNKEY';

function errorHandler(err, req, res, _next) {
  // Known driver errors -> operational responses (never leak raw message)
  if (err && (err.code === SQLITE_UNIQUE || /UNIQUE constraint failed/i.test(err.message || ''))) {
    err = new ConflictError('A record with the same unique value already exists');
  } else if (err && (err.code === SQLITE_FOREIGN_KEY || /FOREIGN KEY constraint failed/i.test(err.message || ''))) {
    err = new AppError('Referenced record does not exist', 400, 'INVALID_REFERENCE');
  }

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error('request_failed', { requestId: req.id, userId: req.userId, route: req.originalUrl, code: err.code, message: err.message });
    }
    return require('../utils/apiResponse').fail(res, err);
  }

  // Unexpected error: log fully server-side, return generic message.
  logger.error('unhandled_error', {
    requestId: req.id,
    userId: req.userId,
    route: req.originalUrl,
    message: err?.message,
    stack: err?.stack?.split('\n').slice(0, 4).join('\n'),
  });
  return require('../utils/apiResponse').fail(res, new AppError('An unexpected error occurred', 500, 'INTERNAL_ERROR'));
}

/** Wrap async route handlers so rejections reach the error handler. */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
