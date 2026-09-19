/** Global search across deals, brands, contacts, invoices, notes, services, tasks. */
const express = require('express');
const { z } = require('zod');
const searchService = require('../../services/searchService');
const { requireAuth } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', validate(z.object({ q: z.string().trim().min(1, 'Search query is required').max(120) }), 'query'), asyncHandler(async (req, res) => {
  const results = await searchService.search(req.userId, req.validated.query.q, {
    limit: Math.min(parseInt(req.query.limit, 10) || 5, 20),
  });
  const total = Object.values(results).reduce((sum, arr) => sum + arr.length, 0);
  return ok(res, results, { meta: { total } });
}));

module.exports = router;
