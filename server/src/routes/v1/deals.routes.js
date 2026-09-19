/** Deals routes — controllers only; business logic in dealService. */
const express = require('express');
const dealService = require('../../services/dealService');
const statsService = require('../../services/statsService');
const activityService = require('../../services/activityService');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { dealCreateSchema, dealUpdateSchema, dealMoveSchema, listQuerySchema, idParam } = require('../../validators/schemas');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');
const { z } = require('zod');

const router = express.Router();
router.use(requireAuth);

const noteSchema = z.object({ content: z.string().trim().min(1, 'Content is required').max(5000) });
const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  url: z.string().trim().url('Must be a valid URL').max(2000),
  mime_type: z.string().trim().max(100).nullish(),
  size_bytes: z.coerce.number().int().min(0).max(1_000_000_000).nullish(),
});

router.get('/', validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const q = req.validated.query;
  const result = await dealService.list(req.userId, q, {
    page: q.page || 1, limit: Math.min(q.limit || 200, 200), sort: q.sort || 'created_at', order: q.order || 'desc',
  });
  return ok(res, result.items, { meta: result.meta });
}));

router.post('/', requireRole('member'), validate(dealCreateSchema), asyncHandler(async (req, res) => {
  const deal = await dealService.create(req.userId, req.validated.body, req.ip);
  return ok(res, deal, { status: 201 });
}));

router.get('/:id', validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  const deal = await dealService.getById(req.userId, req.validated.params.id);
  const health = await dealService.computeHealthScore(req.userId, deal);
  return ok(res, { ...deal, health });
}));

router.put('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), validate(dealUpdateSchema), asyncHandler(async (req, res) => {
  const deal = await dealService.update(req.userId, req.validated.params.id, req.validated.body, req.ip);
  return ok(res, deal);
}));

/** Explicit, validated stage transition endpoint (Kanban drag/drop). */
router.post('/:id/move', requireRole('member'), validate(z.object({ id: idParam }), 'params'), validate(dealMoveSchema), asyncHandler(async (req, res) => {
  const deal = await dealService.moveStage(req.userId, req.validated.params.id, req.validated.body.status, req.validated.body.position, req.ip);
  return ok(res, deal);
}));

router.get('/:id/health', validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  const deal = await dealService.getById(req.userId, req.validated.params.id);
  return ok(res, await dealService.computeHealthScore(req.userId, deal));
}));

router.get('/:id/timeline', validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  return ok(res, await activityService.dealTimeline(req.userId, req.validated.params.id));
}));

router.delete('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  return ok(res, await dealService.softDelete(req.userId, req.validated.params.id, req.ip));
}));

router.post('/:id/notes', requireRole('member'), validate(z.object({ id: idParam }), 'params'), validate(noteSchema), asyncHandler(async (req, res) => {
  const note = await dealService.addNote(req.userId, req.validated.params.id, req.validated.body.content, req.ip);
  return ok(res, note, { status: 201 });
}));

router.delete('/:id/notes/:noteId', requireRole('member'), validate(z.object({ id: idParam, noteId: idParam }), 'params'), asyncHandler(async (req, res) => {
  return ok(res, await dealService.deleteNote(req.userId, req.validated.params.id, req.validated.params.noteId));
}));

router.post('/:id/attachments', requireRole('member'), validate(z.object({ id: idParam }), 'params'), validate(attachmentSchema), asyncHandler(async (req, res) => {
  const attachment = await dealService.addAttachment(req.userId, req.validated.params.id, req.validated.body, req.ip);
  return ok(res, attachment, { status: 201 });
}));

module.exports = router;
