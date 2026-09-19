/** Dashboard overview, revenue analytics and forecasting. */
const express = require('express');
const statsService = require('../../services/statsService');
const { requireAuth } = require('../../middleware/auth');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/overview', asyncHandler(async (req, res) => {
  return ok(res, await statsService.overview(req.userId));
}));

router.get('/revenue', asyncHandler(async (req, res) => {
  const months = Math.min(parseInt(req.query.months, 10) || 12, 24);
  return ok(res, await statsService.revenueAnalytics(req.userId, { months }));
}));

router.get('/forecast', asyncHandler(async (req, res) => {
  return ok(res, await statsService.forecast(req.userId));
}));

module.exports = router;
