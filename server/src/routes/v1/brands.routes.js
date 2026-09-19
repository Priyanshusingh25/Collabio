/** Brands — CRM relationship management routes. */
const express = require('express');
const { z } = require('zod');
const { createCrudService } = require('../../services/crudFactory');
const { brandSchema, idParam, listQuerySchema } = require('../../validators/schemas');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');
const { all, get } = require('../../database/db');
const { NotFoundError } = require('../../utils/AppError');

const brandService = createCrudService({
  table: 'brands',
  label: 'brand',
  fields: ['name', 'company', 'industry', 'location', 'contact_name', 'contact_email', 'website',
    'relationship_status', 'notes', 'logo_emoji', 'tags', 'socials', 'last_contact_at'],
  searchColumns: ['name', 'industry', 'contact_name', 'contact_email'],
  jsonFields: ['tags', 'socials'],
  eventName: 'brand:updated',
});

const router = express.Router();
router.use(requireAuth);

/** Enriched list: deal stats + revenue (single aggregate query, no N+1). */
router.get('/', validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const q = req.validated.query;
  const params = [req.userId];
  let where = 'b.user_id = ? AND b.deleted_at IS NULL';
  if (q.search) {
    const term = `%${q.search.replace(/[%_]/g, '')}%`;
    where += ' AND (b.name LIKE ? OR b.industry LIKE ? OR b.contact_name LIKE ?)';
    params.push(term, term, term);
  }
  if (q.status) { where += ' AND b.relationship_status = ?'; params.push(q.status); }

  const limit = Math.min(q.limit || 100, 200);
  const page = q.page || 1;
  const count = await get(`SELECT COUNT(*) as count FROM brands b WHERE ${where}`, params);
  const brands = await all(
    `SELECT b.*,
       COUNT(d.id) as total_deals,
       COALESCE(SUM(d.deal_value), 0) as total_value,
       COALESCE(SUM(CASE WHEN d.status = 'paid' THEN d.deal_value ELSE 0 END), 0) as total_revenue,
       MAX(d.updated_at) as last_deal_activity
     FROM brands b
     LEFT JOIN deals d ON d.brand_id = b.id AND d.deleted_at IS NULL
     WHERE ${where}
     GROUP BY b.id
     ORDER BY total_revenue DESC, b.name ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  const items = brands.map((b) => ({
    ...b,
    tags: b.tags ? JSON.parse(b.tags) : [],
    socials: b.socials ? JSON.parse(b.socials) : null,
  }));
  return ok(res, items, { meta: { page, limit, total: count.count, total_pages: Math.max(1, Math.ceil(count.count / limit)) } });
}));

/** Brand detail with relationship history (deals + communications). */
router.get('/:id', validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const brand = await get('SELECT * FROM brands WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [id, req.userId]);
  if (!brand) throw new NotFoundError('Brand');
  const [deals, communications] = await Promise.all([
    all('SELECT * FROM deals WHERE brand_id = ? AND user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC', [id, req.userId]),
    all('SELECT * FROM communications WHERE brand_id = ? AND user_id = ? ORDER BY COALESCE(occurred_at, created_at) DESC LIMIT 50', [id, req.userId]),
  ]);
  return ok(res, {
    ...brand,
    tags: brand.tags ? JSON.parse(brand.tags) : [],
    socials: brand.socials ? JSON.parse(brand.socials) : null,
    deals, communications,
  });
}));

router.post('/', requireRole('member'), validate(brandSchema), asyncHandler(async (req, res) => {
  return ok(res, await brandService.create(req.userId, req.validated.body, req.ip), { status: 201 });
}));

router.put('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), validate(brandSchema.partial()), asyncHandler(async (req, res) => {
  return ok(res, await brandService.update(req.userId, req.validated.params.id, req.validated.body, req.ip));
}));

router.delete('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  return ok(res, await brandService.remove(req.userId, req.validated.params.id, req.ip));
}));

module.exports = router;

