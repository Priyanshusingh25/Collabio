/** Centralized logger — structured, secret-safe. */
const env = require('../config/env');

const SENSITIVE_KEYS = /^(password|password_hash|token|authorization|secret|card_number)$/i;

function scrub(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const clean = { ...payload };
  for (const key of Object.keys(clean)) {
    if (SENSITIVE_KEYS.test(key)) clean[key] = '[redacted]';
  }
  return clean;
}

function line(level, message, meta) {
  if (!['error', 'warn', 'info', 'debug'].includes(level)) level = 'info';
  const levels = { error: 0, warn: 1, info: 2, debug: 3 };
  if (levels[level] > levels[env.logLevel]) return;
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: scrub(meta) } : {}),
  };
  const serialized = JSON.stringify(entry);
  if (level === 'error') console.error(serialized);
  else if (level === 'warn') console.warn(serialized);
  else console.log(serialized);
}

module.exports = {
  debug: (msg, meta) => line('debug', msg, meta),
  info: (msg, meta) => line('info', msg, meta),
  warn: (msg, meta) => line('warn', msg, meta),
  error: (msg, meta) => line('error', msg, meta),
  scrub,
};
