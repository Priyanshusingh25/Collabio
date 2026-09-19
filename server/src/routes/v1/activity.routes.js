/** Activity / audit log feed (cursor pagination for high volume). */
const express = require('express');
const activityService = require('../../services/activityService');
const { requireAuth } = require('../../middleware/auth');
const { ok, parseCursor } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const cursor = parseCursor(req.query);
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const result = await activityService.list(req.userId, {
    cursor, limit,
    entity_type: req.query.entity_type,
    entity_id: req.query.entity_id ? parseInt(req.query.entity_id, 10) : undefined,
    action: req.query.action,
  });
  return ok(res, result.items, { meta: { next_cursor: result.next_cursor } });
}));

module.exports = router;
