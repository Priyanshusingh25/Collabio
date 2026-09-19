/** Tasks & follow-ups. */
const express = require('express');
const { z } = require('zod');
const { createCrudService } = require('../../services/crudFactory');
const { taskSchema, idParam } = require('../../validators/schemas');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { ok } = require('../../utils/apiResponse');
const { asyncHandler } = require('../../middleware/errorHandler');
const { run, get, all } = require('../../database/db');
const { NotFoundError } = require('../../utils/AppError');
const activityService = require('../../services/activityService');
const { emit } = require('../../events/bus');

const taskService = createCrudService({
  table: 'tasks',
  label: 'task',
  fields: ['title', 'description', 'due_date', 'priority', 'status', 'deal_id', 'brand_id',
    'contact_id', 'assignee', 'reminder_at', 'tags'],
  searchColumns: ['title'],
  jsonFields: ['tags'],
  eventName: 'task:updated',
});

const router = express.Router();
router.use(requireAuth);

const listSchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  deal_id: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  overdue: z.coerce.boolean().optional(),
});

router.get('/', validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  const q = req.validated.query;
  const params = [req.userId];
  let where = 't.user_id = ? AND t.deleted_at IS NULL';
  if (q.search) { where += ' AND t.title LIKE ?'; params.push(`%${q.search.replace(/[%_]/g, '')}%`); }
  if (q.status) { where += ' AND t.status = ?'; params.push(q.status); }
  if (q.priority) { where += ' AND t.priority = ?'; params.push(q.priority); }
  if (q.deal_id) { where += ' AND t.deal_id = ?'; params.push(q.deal_id); }
  if (q.overdue) {
    where += ` AND t.status IN ('todo', 'in_progress') AND t.due_date IS NOT NULL AND t.due_date < date('now')`;
  }

  const limit = Math.min(q.limit || 100, 200);
  const page = q.page || 1;
  const count = await get(`SELECT COUNT(*) as count FROM tasks t WHERE ${where}`, params);
  const tasks = await all(
    `SELECT t.*, d.title as deal_title, b.name as brand_name
     FROM tasks t
     LEFT JOIN deals d ON t.deal_id = d.id
     LEFT JOIN brands b ON t.brand_id = b.id
     WHERE ${where}
     ORDER BY CASE t.status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, t.due_date ASC, t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  return ok(res, tasks, { meta: { page, limit, total: count.count, total_pages: Math.max(1, Math.ceil(count.count / limit)) } });
}));

/** Status change endpoint — validates transitions and timestamps completion. */
router.post('/:id/status', requireRole('member'), validate(z.object({ id: idParam }), 'params'), validate(z.object({
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']),
}), 'body'), asyncHandler(async (req, res) => {
  const task = await get('SELECT * FROM tasks WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [req.validated.params.id, req.userId]);
  if (!task) throw new NotFoundError('Task');
  const completed = req.validated.body.status === 'completed';
  await run(
    `UPDATE tasks SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?`,
    [req.validated.body.status, completed ? new Date().toISOString() : null, req.userId, task.id]
  );
  await activityService.log({ userId: req.userId, action: 'task.status_changed', entityType: 'task', entityId: task.id, entityLabel: task.title, details: { from: task.status, to: req.validated.body.status }, ip: req.ip });
  emit('task:updated', { userId: req.userId, taskId: task.id, status: req.validated.body.status });
  return ok(res, await get('SELECT * FROM tasks WHERE id = ?', [task.id]));
}));

router.post('/', requireRole('member'), validate(taskSchema), asyncHandler(async (req, res) => {
  // Validate linked entities exist and belong to the caller.
  const { deal_id, brand_id, contact_id } = req.validated.body;
  if (deal_id && !(await get('SELECT id FROM deals WHERE id = ? AND user_id = ?', [deal_id, req.userId]))) {
    const { ValidationError } = require('../../utils/AppError');
    throw new ValidationError('Linked deal does not exist', { deal_id: 'Unknown deal' });
  }
  if (brand_id && !(await get('SELECT id FROM brands WHERE id = ? AND user_id = ?', [brand_id, req.userId]))) {
    const { ValidationError } = require('../../utils/AppError');
    throw new ValidationError('Linked brand does not exist', { brand_id: 'Unknown brand' });
  }
  return ok(res, await taskService.create(req.userId, req.validated.body, req.ip), { status: 201 });
}));

router.put('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), validate(taskSchema.partial()), asyncHandler(async (req, res) => {
  return ok(res, await taskService.update(req.userId, req.validated.params.id, req.validated.body, req.ip));
}));

router.delete('/:id', requireRole('member'), validate(z.object({ id: idParam }), 'params'), asyncHandler(async (req, res) => {
  return ok(res, await taskService.remove(req.userId, req.validated.params.id, req.ip));
}));

module.exports = router;
