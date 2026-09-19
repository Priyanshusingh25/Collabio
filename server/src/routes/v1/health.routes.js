/** Health endpoints — useful diagnostics without exposing secrets. */
const express = require('express');
const { get } = require('../../database/db');
const env = require('../../config/env');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');
const { AppError } = require('../../utils/AppError');

const router = express.Router();

const startedAt = Date.now();

router.get('/', (req, res) => {
  return ok(res, {
    status: 'ok',
    app: 'Collabio API',
    version: '2.0.0',
    env: env.env,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

router.get('/database', asyncHandler(async (req, res) => {
  try {
    const users = await get('SELECT COUNT(*) as count FROM users');
    const deals = await get('SELECT COUNT(*) as count FROM deals');
    const brands = await get('SELECT COUNT(*) as count FROM brands');
    const invoices = await get('SELECT COUNT(*) as count FROM invoices');
    return ok(res, {
      status: 'connected',
      engine: 'SQLite (WAL)',
      counts: { users: users.count, deals: deals.count, brands: brands.count, invoices: invoices.count },
    });
  } catch (err) {
    throw new AppError('Database health check failed', 503, 'DATABASE_UNAVAILABLE');
  }
}));

module.exports = router;
