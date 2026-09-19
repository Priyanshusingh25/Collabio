/** Reusable CRUD route factory: auth + validation + pagination + envelope. */
const express = require('express');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');
const { listQuerySchema, idParam } = require('../../validators/schemas');
const { z } = require('zod');

/**
 * @param {object} service   result of createCrudService
 * @param {z.ZodSchema} writeSchema
 * @param {object} options   { buildFilters(q), extraWhere }
 */
function crudRouter(service, writeSchema, options = {}) {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/', validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
    const q = req.validated.query;
    const result = await service.list(req.userId, {
      search: q.search,
      page: q.page || 1,
      limit: Math.min(q.limit || 100, 200),
      filters: options.buildFilters ? options.buildFilters(q) : {},
    });
    return ok(res, result.items, { meta: result.meta });
  }));

  router.post('/', requireRole('member'), validate(writeSchema), asyncHandler(async (req, res) => {
    const row = await service.create(req.userId, req.validated.body, req.ip);
    return ok(res, row, { status: 201 });
  }));

  router.get('/:id', validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
    return ok(res, await service.getById(req.userId, req.validated.params.id));
  }));

  router.put('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), validate(writeSchema.partial()), asyncHandler(async (req, res) => {
    return ok(res, await service.update(req.userId, req.validated.params.id, req.validated.body, req.ip));
  }));

  router.delete('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
    return ok(res, await service.remove(req.userId, req.validated.params.id, req.ip));
  }));

  return router;
}

module.exports = { crudRouter };
