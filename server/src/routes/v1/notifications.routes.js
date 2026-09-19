/** Smart notification center routes (cursor-paginated feed). */
const express = require('express');
const { z } = require('zod');
const notificationService = require('../../services/notificationService');
const { requireAuth } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');
const { idParam } = require('../../validators/schemas');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const cursor = require('../../utils/apiResponse').parseCursor(req.query);
  const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
  const result = await notificationService.list(req.userId, {
    cursor, limit,
    unread_only: req.query.unread_only === 'true',
    category: req.query.category,
  });
  const unread = await notificationService.unreadCount(req.userId);
  return ok(res, result.items, { meta: { next_cursor: result.next_cursor, unread } });
}));

router.get('/unread-count', asyncHandler(async (req, res) => {
  return ok(res, { count: await notificationService.unreadCount(req.userId) });
}));

router.post('/:id/read', validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  const marked = await notificationService.markRead(req.userId, req.validated.params.id);
  return ok(res, { marked });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  const changed = await notificationService.markAllRead(req.userId);
  return ok(res, { marked: changed });
}));

module.exports = router;
