/** Invoice lifecycle + payment tracking routes. */
const express = require('express');
const { z } = require('zod');
const invoiceService = require('../../services/invoiceService');
const { invoiceCreateSchema, invoiceUpdateSchema, paymentSchema, idParam } = require('../../validators/schemas');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');
const { parsePagination } = require('../../utils/apiResponse');

const router = express.Router();
router.use(requireAuth);

router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const { page, limit } = parsePagination(req.query, { defaultLimit: 50 });
  const result = await invoiceService.list(req.userId, {
    page, limit, status: req.query.status, search: req.query.search,
  });
  return ok(res, result.items, { meta: result.meta });
}));

router.post('/', requireRole('member'), validate(invoiceCreateSchema), asyncHandler(async (req, res) => {
  const invoice = await invoiceService.create(req.userId, req.validated.body, req.ip);
  return ok(res, invoice, { status: 201 });
}));

router.get('/:id', validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  return ok(res, await invoiceService.getById(req.userId, req.validated.params.id));
}));

router.put('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), validate(invoiceUpdateSchema), asyncHandler(async (req, res) => {
  return ok(res, await invoiceService.update(req.userId, req.validated.params.id, req.validated.body, req.ip));
}));

router.post('/:id/payments', requireRole('member'), validate(z.object({ id: idParam }), 'params'), validate(paymentSchema), asyncHandler(async (req, res) => {
  const result = await invoiceService.recordPayment(req.userId, req.validated.params.id, req.validated.body, req.ip);
  return ok(res, result, { status: 201 });
}));

router.delete('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  const { run, get } = require('../../database/db');
  const { NotFoundError } = require('../../utils/AppError');
  const invoice = await get('SELECT id FROM invoices WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.validated.params.id, req.userId]);
  if (!invoice) throw new NotFoundError('Invoice');
  await run('UPDATE invoices SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [invoice.id, req.userId]);
  return ok(res, { id: invoice.id });
}));

module.exports = router;
