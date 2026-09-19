/**
 * Centralized environment configuration.
 * Fails fast when mandatory configuration is missing in production.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
// Only enforce production requirements when explicitly running as production.
// (NODE_ENV is often unset or set to 'production' by hosting tooling; dotenv
// v18's configDotenv auto-loads server/.env which can shadow intent.)
const isProd = NODE_ENV.trim().toLowerCase() === 'production';

const requiredInProd = ['JWT_SECRET'];
const missing = isProd ? requiredInProd.filter((k) => !process.env[k]) : [];
if (missing.length > 0) {
  console.error(`[config] FATAL: missing required environment variables in production: ${missing.join(', ')}`);
  process.exit(1);
}

if (!process.env.JWT_SECRET && !isProd) {
  console.warn('[config] WARNING: JWT_SECRET not set — using an ephemeral development secret. Set JWT_SECRET for anything non-local.');
}

const config = {
  env: NODE_ENV,
  isProd,
  port: parseInt(process.env.PORT || '3001', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', '..', 'db', 'collabio.db'),
  jwt: {
    secret: process.env.JWT_SECRET || `dev-${require('crypto').randomBytes(32).toString('hex')}`,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '50', 10),
    apiMax: parseInt(process.env.RATE_LIMIT_API_MAX || '600', 10),
  },
  logLevel: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
};

module.exports = config;
