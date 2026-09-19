/** Workspace backup (JSON export/restore) + CSV import/export. */
const express = require('express');
const { z } = require('zod');
const backupService = require('../../services/backupService');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { restoreSchema, importRowsSchema } = require('../../validators/schemas');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');
const activityService = require('../../services/activityService');
const { ValidationError } = require('../../utils/AppError');

const router = express.Router();
router.use(requireAuth, requireRole('member'));

/** Full workspace JSON backup. */
router.get('/export', asyncHandler(async (req, res) => {
  const backup = await backupService.exportWorkspace(req.userId);
  await activityService.log({ userId: req.userId, action: 'workspace.exported', entityType: 'workspace', ip: req.ip });
  return ok(res, backup);
}));

/** Restore from validated backup (merge or replace) inside one transaction. */
router.post('/restore', validate(restoreSchema), asyncHandler(async (req, res) => {
  const { mode, data } = req.validated.body;
  const summary = await backupService.restore(req.userId, { data }, mode, req.ip);
  return ok(res, { mode, summary });
}));

/** CSV export (deals / contacts). */
router.get('/export/:entity', asyncHandler(async (req, res) => {
  const entity = req.params.entity;
  if (!['deals', 'contacts'].includes(entity)) {
    throw new ValidationError('Unsupported export entity', { entity: 'Must be deals or contacts' });
  }
  const csv = await backupService.exportCsv(req.userId, entity);
  await activityService.log({ userId: req.userId, action: 'data.exported', entityType: entity, ip: req.ip });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="collabio-${entity}-${new Date().toISOString().slice(0, 10)}.csv"`);
  return res.status(200).send(csv);
}));

/** CSV/JSON import preview — parse, validate, dedupe. Nothing persisted. */
router.post('/import/preview', asyncHandler(async (req, res) => {
  let rows = req.body?.rows;
  if (req.body?.csv) rows = backupService.parseCsv(String(req.body.csv));
  const entity = req.body?.entity;
  if (!['deals', 'contacts'].includes(entity)) {
    throw new ValidationError('Unsupported import entity', { entity: 'Must be deals or contacts' });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ValidationError('No rows found in the uploaded file');
  }
  if (rows.length > 5000) {
    throw new ValidationError('Too many rows (max 5000 per import)');
  }
  const preview = await backupService.previewImport(req.userId, entity, rows);
  return ok(res, {
    entity,
    total: preview.total,
    valid: preview.valid.length,
    invalid: preview.invalid,
    duplicates: preview.duplicates,
    // Rows are returned validated so the confirm step re-sends exactly these.
    validated_rows: preview.valid,
  });
}));

/** Import confirmation — all-or-nothing transaction. */
router.post('/import/commit', asyncHandler(async (req, res) => {
  // Accept either the validated rows from preview or a fresh csv payload.
  let rows = req.body?.validated_rows || req.body?.rows;
  if (!rows && req.body?.csv) rows = backupService.parseCsv(String(req.body.csv));
  const entity = req.body?.entity;
  if (!['deals', 'contacts'].includes(entity)) {
    throw new ValidationError('Unsupported import entity', { entity: 'Must be deals or contacts' });
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ValidationError('No rows to import');
  }
  if (rows.length > 5000) {
    throw new ValidationError('Too many rows (max 5000 per import)');
  }
  const summary = await backupService.commitImport(req.userId, entity, rows, req.ip);
  return ok(res, summary);
}));

module.exports = router;
