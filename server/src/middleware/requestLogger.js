/** Structured request logging with request ids and duration. Never logs tokens/passwords. */
const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  req.id = randomUUID();
  req.startedAt = process.hrtime.bigint();
  res.setHeader('X-Request-Id', req.id);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - req.startedAt) / 1e6;
    logger.info('http_request', {
      requestId: req.id,
      userId: req.userId,
      method: req.method,
      route: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
    });
  });
  next();
}

module.exports = { requestLogger };
