/** User preferences (theme, currency, density, notifications, follow-up rules) + saved views. */
const express = require('express');
const { z } = require('zod');
const { run, get, all } = require('../../database/db');
const seed = require('../../database/seed');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { preferencesSchema } = require('../../validators/schemas');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');
const { NotFoundError } = require('../../utils/AppError');

const router = express.Router();
router.use(requireAuth);

function parsePrefs(row) {
  if (!row) return row;
  return {
    ...row,
    dashboard_layout: row.dashboard_layout ? JSON.parse(row.dashboard_layout) : null,
    notification_prefs: row.notification_prefs ? JSON.parse(row.notification_prefs) : null,
    followup_rules: row.followup_rules ? JSON.parse(row.followup_rules) : null,
  };
}

router.get('/', asyncHandler(async (req, res) => {
  await seed.ensurePreferences(req.userId);
  return ok(res, parsePrefs(await get('SELECT * FROM user_preferences WHERE user_id = ?', [req.userId])));
}));

router.put('/', requireRole('member'), validate(preferencesSchema), asyncHandler(async (req, res) => {
  await seed.ensurePreferences(req.userId);
  const existing = parsePrefs(await get('SELECT * FROM user_preferences WHERE user_id = ?', [req.userId]));
  const merged = {
    ...existing,
    ...req.validated.body,
    dashboard_layout: req.validated.body.dashboard_layout ?? existing.dashboard_layout,
    notification_prefs: req.validated.body.notification_prefs
      ? { ...(existing.notification_prefs || {}), ...req.validated.body.notification_prefs }
      : existing.notification_prefs,
    followup_rules: req.validated.body.followup_rules
      ? { ...(existing.followup_rules || {}), ...req.validated.body.followup_rules }
      : existing.followup_rules,
  };
  await run(
    `UPDATE user_preferences SET theme = ?, currency = ?, timezone = ?, date_format = ?, density = ?,
      dashboard_layout = ?, default_pipeline_view = ?, notification_prefs = ?, followup_rules = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ?`,
    [merged.theme, merged.currency, merged.timezone, merged.date_format, merged.density,
      merged.dashboard_layout ? JSON.stringify(merged.dashboard_layout) : null,
      merged.default_pipeline_view,
      merged.notification_prefs ? JSON.stringify(merged.notification_prefs) : null,
      merged.followup_rules ? JSON.stringify(merged.followup_rules) : null,
      req.userId]
  );
  return ok(res, parsePrefs(await get('SELECT * FROM user_preferences WHERE user_id = ?', [req.userId])));
}));

// ---------- saved views (pipeline/table filter presets) ----------
const savedViewSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  entity_type: z.enum(['deals', 'contacts', 'invoices', 'tasks']).default('deals'),
  config: z.record(z.any()),
});

router.get('/views', asyncHandler(async (req, res) => {
  const views = await all('SELECT * FROM saved_views WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
  return ok(res, views.map((v) => ({ ...v, config: JSON.parse(v.config) })));
}));

router.post('/views', requireRole('member'), validate(savedViewSchema), asyncHandler(async (req, res) => {
  const result = await run(
    'INSERT INTO saved_views (user_id, name, entity_type, config) VALUES (?, ?, ?, ?)',
    [req.userId, req.validated.body.name, req.validated.body.entity_type, JSON.stringify(req.validated.body.config)]
  );
  const view = await get('SELECT * FROM saved_views WHERE id = ?', [result.lastID]);
  return ok(res, { ...view, config: JSON.parse(view.config) }, { status: 201 });
}));

router.delete('/views/:id', requireRole('member'), validate(z.object({ id: require('../../validators/schemas').idParam }), 'params'), asyncHandler(async (req, res) => {
  const result = await run('DELETE FROM saved_views WHERE id = ? AND user_id = ?', [req.validated.params.id, req.userId]);
  if (result.changes === 0) throw new NotFoundError('Saved view');
  return ok(res, { id: req.validated.params.id });
}));

module.exports = router;
