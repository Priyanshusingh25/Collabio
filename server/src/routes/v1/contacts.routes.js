/** Contacts — CRM contact profiles with duplicate prevention. */
const express = require('express');
const { z } = require('zod');
const { createCrudService } = require('../../services/crudFactory');
const { contactSchema, idParam, listQuerySchema } = require('../../validators/schemas');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');
const { all, get } = require('../../database/db');
const { NotFoundError, ValidationError } = require('../../utils/AppError');

const contactService = createCrudService({
  table: 'contacts',
  label: 'contact',
  fields: ['name', 'company', 'email', 'phone', 'role', 'linkedin', 'instagram',
    'preferred_channel', 'platform', 'source', 'status', 'notes', 'tags'],
  searchColumns: ['name', 'company', 'email'],
  jsonFields: ['tags'],
  eventName: 'contact:updated',
});

const router = express.Router();
router.use(requireAuth);

router.get('/', validate(listQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const q = req.validated.query;
  const params = [req.userId];
  let where = 'c.user_id = ? AND c.deleted_at IS NULL';
  if (q.search) {
    const term = `%${q.search.replace(/[%_]/g, '')}%`;
    where += ' AND (c.name LIKE ? OR c.company LIKE ? OR c.email LIKE ?)';
    params.push(term, term, term);
  }
  if (q.status) { where += ' AND c.status = ?'; params.push(q.status); }

  const limit = Math.min(q.limit || 100, 200);
  const page = q.page || 1;
  const count = await get(`SELECT COUNT(*) as count FROM contacts c WHERE ${where}`, params);
  // Deals are linked by verified ownership + matching email (string-match join
  // is scoped to the same user, fixing the legacy cross-tenant read).
  const contacts = await all(
    `SELECT c.*,
       (SELECT COUNT(*) FROM deals d WHERE d.user_id = c.user_id AND d.deleted_at IS NULL
          AND (d.contact_email = c.email OR (c.email IS NULL AND d.contact_name = c.name))) as linked_deals_count
     FROM contacts c
     WHERE ${where}
     ORDER BY c.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  const items = contacts.map((c) => ({ ...c, tags: c.tags ? JSON.parse(c.tags) : [] }));
  return ok(res, items, { meta: { page, limit, total: count.count, total_pages: Math.max(1, Math.ceil(count.count / limit)) } });
}));

router.get('/:id', validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const contact = await get('SELECT * FROM contacts WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [id, req.userId]);
  if (!contact) throw new NotFoundError('Contact');
  const [communications, deals] = await Promise.all([
    all('SELECT * FROM communications WHERE contact_id = ? AND user_id = ? ORDER BY COALESCE(occurred_at, created_at) DESC LIMIT 50', [id, req.userId]),
    all(`SELECT * FROM deals WHERE user_id = ? AND deleted_at IS NULL AND (contact_email = ? OR (? IS NULL AND contact_name = ?)) ORDER BY created_at DESC`,
      [req.userId, contact.email, contact.email, contact.name]),
  ]);
  return ok(res, { ...contact, tags: contact.tags ? JSON.parse(contact.tags) : [], communications, deals });
}));

/** Duplicate prevention: same email (or same name when email absent). */
async function assertNoDuplicate(userId, body, excludeId) {
  if (body.email) {
    const row = await get('SELECT id FROM contacts WHERE user_id = ? AND email = ? AND deleted_at IS NULL AND id != COALESCE(?, -1)', [userId, body.email, excludeId || null]);
    if (row) throw new ValidationError('A contact with this email already exists', { email: 'Duplicate email — edit the existing contact instead' });
  } else {
    const row = await get('SELECT id FROM contacts WHERE user_id = ? AND LOWER(name) = LOWER(?) AND email IS NULL AND deleted_at IS NULL AND id != COALESCE(?, -1)', [userId, body.name, excludeId || null]);
    if (row) throw new ValidationError('A contact with this name already exists', { name: 'Duplicate contact name' });
  }
}

router.post('/', requireRole('member'), validate(contactSchema), asyncHandler(async (req, res) => {
  await assertNoDuplicate(req.userId, req.validated.body);
  return ok(res, await contactService.create(req.userId, req.validated.body, req.ip), { status: 201 });
}));

router.put('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), validate(contactSchema.partial()), asyncHandler(async (req, res) => {
  await assertNoDuplicate(req.userId, req.validated.body, req.validated.params.id);
  return ok(res, await contactService.update(req.userId, req.validated.params.id, req.validated.body, req.ip));
}));

router.delete('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  return ok(res, await contactService.remove(req.userId, req.validated.params.id, req.ip));
}));

module.exports = router;
