/** Communication log — email/call/meeting/DM interactions. */
const express = require('express');
const { z } = require('zod');
const { createCrudService } = require('../../services/crudFactory');
const { communicationSchema, idParam } = require('../../validators/schemas');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');
const { get, run } = require('../../database/db');
const { NotFoundError, ValidationError } = require('../../utils/AppError');

const commService = createCrudService({
  table: 'communications',
  label: 'communication',
  fields: ['channel', 'direction', 'summary', 'occurred_at', 'contact_id', 'brand_id', 'deal_id'],
  searchColumns: ['summary'],
  softDelete: false,
  orderBy: 'COALESCE(occurred_at, created_at) DESC',
});

const router = express.Router();
router.use(requireAuth);

router.get('/', validate(z.object({
  deal_id: z.coerce.number().int().positive().optional(),
  contact_id: z.coerce.number().int().positive().optional(),
  brand_id: z.coerce.number().int().positive().optional(),
  channel: z.string().trim().max(20).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
}), 'query'), asyncHandler(async (req, res) => {
  const q = req.validated.query;
  const result = await commService.list(req.userId, {
    page: q.page || 1,
    limit: Math.min(q.limit || 50, 200),
    filters: { deal_id: q.deal_id, contact_id: q.contact_id, brand_id: q.brand_id, channel: q.channel },
  });
  return ok(res, result.items, { meta: result.meta });
}));

router.post('/', requireRole('member'), validate(communicationSchema), asyncHandler(async (req, res) => {
  const { contact_id, brand_id, deal_id } = req.validated.body;
  const mustExist = [
    [contact_id, 'contacts', 'contact_id', 'Linked contact does not exist'],
    [brand_id, 'brands', 'brand_id', 'Linked brand does not exist'],
    [deal_id, 'deals', 'deal_id', 'Linked deal does not exist'],
  ];
  for (const [value, table, field, message] of mustExist) {
    if (value && !(await get(`SELECT id FROM ${table} WHERE id = ? AND user_id = ?`, [value, req.userId]))) {
      throw new ValidationError(message, { [field]: 'Unknown record' });
    }
  }
  const comm = await commService.create(req.userId, req.validated.body, req.ip);
  // Logging communication keeps the deal's "last contacted" freshness accurate.
  if (deal_id) {
    await run('UPDATE deals SET last_contacted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [comm.occurred_at || new Date().toISOString().slice(0, 10), deal_id, req.userId]);
  }
  if (brand_id) {
    await run('UPDATE brands SET last_contact_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [comm.occurred_at || new Date().toISOString().slice(0, 10), brand_id, req.userId]);
  }
  return ok(res, comm, { status: 201 });
}));

router.put('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), validate(communicationSchema.partial()), asyncHandler(async (req, res) => {
  return ok(res, await commService.update(req.userId, req.validated.params.id, req.validated.body, req.ip));
}));

router.delete('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  return ok(res, await commService.remove(req.userId, req.validated.params.id, req.ip));
}));

module.exports = router;
