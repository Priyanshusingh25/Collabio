/**
 * Deal service — all deal business logic lives here, NOT in route handlers.
 * Includes: filtered/paginated listing, stage-transition validation,
 * soft deletion, and the explainable Deal Health Score.
 */
const { run, get, all, withTransaction } = require('../database/db');
const { NotFoundError, ValidationError } = require('../utils/AppError');
const { STAGE_FLOW } = require('../validators/schemas');
const activityService = require('./activityService');
const { emit, EVENTS } = require('../events/bus');

/** Baseline win probability per stage (used for weighted pipeline value). */
const STAGE_PROBABILITY = Object.freeze({
  outreach: 10, negotiating: 30, contract_sent: 50, active: 70,
  in_review: 75, published: 85, invoiced: 95, paid: 100, archived: 0,
});

function tagsToJson(tags) {
  return tags && tags.length ? JSON.stringify(tags) : null;
}

function parseTags(row) {
  if (!row) return row;
  try { row.tags = row.tags ? JSON.parse(row.tags) : []; } catch { row.tags = []; }
  return row;
}

const DEAL_BY_ID = 'SELECT d.*, b.logo_emoji as brand_logo FROM deals d LEFT JOIN brands b ON b.id = d.brand_id WHERE d.id = ?';

async function list(userId, filters = {}, { page = 1, limit = 200, sort = 'created_at', order = 'desc' } = {}) {
  const params = [userId];
  let where = '';
  if (filters.status) { where += ' AND d.status = ?'; params.push(filters.status); }
  if (filters.platform) { where += ' AND d.platform = ?'; params.push(filters.platform); }
  if (filters.priority) { where += ' AND d.priority = ?'; params.push(filters.priority); }
  if (filters.tag) { where += ' AND d.tags LIKE ?'; params.push(`%"${filters.tag.replace(/[%_]/g, '')}"%`); }
  if (filters.search) {
    const term = `%${filters.search.replace(/[%_]/g, '')}%`;
    where += ' AND (d.title LIKE ? OR d.brand_name LIKE ? OR d.deliverable LIKE ?)';
    params.push(term, term, term);
  }
  if (filters.from) { where += ' AND d.deadline >= ?'; params.push(filters.from); }
  if (filters.to) { where += ' AND d.deadline <= ?'; params.push(filters.to); }

  const sortCol = { created_at: 'd.created_at', deadline: 'd.deadline', deal_value: 'd.deal_value', title: 'd.title', updated_at: 'd.updated_at' }[sort] || 'd.created_at';
  const count = await get(`SELECT COUNT(*) as count FROM deals d WHERE d.user_id = ? AND d.deleted_at IS NULL${where}`, [userId, ...params.slice(1)]);

  const deals = await all(
    `SELECT d.*, b.logo_emoji as brand_logo FROM deals d
     LEFT JOIN brands b ON b.id = d.brand_id
     WHERE d.user_id = ? AND d.deleted_at IS NULL${where}
     ORDER BY ${sortCol} ${order === 'asc' ? 'ASC' : 'DESC'}, d.position ASC
     LIMIT ? OFFSET ?`,
    [userId, ...params.slice(1), limit, (page - 1) * limit]
  );

  return { items: deals.map(parseTags), meta: { page, limit, total: count.count, total_pages: Math.max(1, Math.ceil(count.count / limit)) } };
}

async function getById(userId, id) {
  const deal = await get(`${DEAL_BY_ID} AND d.user_id = ? AND d.deleted_at IS NULL`, [id, userId]);
  if (!deal) throw new NotFoundError('Deal');
  const [notes, tasks, invoices, comms, attachments, timeline] = await Promise.all([
    all('SELECT * FROM deal_notes WHERE deal_id = ? ORDER BY created_at DESC', [id]),
    all(`SELECT * FROM tasks WHERE deal_id = ? AND user_id = ? AND deleted_at IS NULL ORDER BY status, due_date`, [id, userId]),
    all(`SELECT * FROM invoices WHERE deal_id = ? AND user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`, [id, userId]),
    all('SELECT * FROM communications WHERE deal_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 50', [id, userId]),
    all('SELECT * FROM deal_attachments WHERE deal_id = ? AND user_id = ? ORDER BY created_at DESC', [id, userId]),
    activityService.dealTimeline(userId, id),
  ]);
  const invoicesParsed = invoices.map((inv) => ({ ...inv, line_items: JSON.parse(inv.line_items || '[]') }));
  return { ...parseTags(deal), notes, tasks, invoices: invoicesParsed, communications: comms, attachments, timeline };
}

/**
 * Deal Health Score — fully explainable. Starts at 100 and deducts for
 * concrete, observable risk signals. Returns score, label and rule breakdown.
 */
async function computeHealthScore(userId, deal) {
  const breakdown = [];
  let score = 100;
  const deduct = (points, rule, reason) => { score -= points; breakdown.push({ rule, points: -points, reason }); };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Deadline proximity
  if (deal.deadline && !['paid', 'archived'].includes(deal.status)) {
    const days = Math.ceil((new Date(`${deal.deadline}T00:00:00`) - today) / 86400000);
    if (days < 0) deduct(25, 'deadline_overdue', `Deadline passed ${Math.abs(days)} day(s) ago`);
    else if (days <= 3) deduct(8, 'deadline_soon', `Deadline in ${days} day(s)`);
    else if (days <= 7) deduct(3, 'deadline_approaching', 'Deadline within a week');
  }

  // 2. Stage age (stalled deal)
  const stageAgeDays = Math.floor((today - new Date(deal.updated_at || deal.created_at)) / 86400000);
  if (['outreach', 'negotiating'].includes(deal.status)) {
    if (stageAgeDays > 35) deduct(18, 'stage_stalled', `In ${deal.status} for ${stageAgeDays} days`);
    else if (stageAgeDays > 21) deduct(10, 'stage_stalled', `In ${deal.status} for ${stageAgeDays} days`);
  }

  // 3. Missing contract once past negotiation
  if (['contract_sent', 'active', 'in_review', 'published', 'invoiced'].includes(deal.status) && !deal.contract_url) {
    deduct(15, 'missing_contract', 'No contract on file for this stage');
  }

  // 4. Missing deliverable definition
  if (!deal.deliverable && !['paid', 'archived'].includes(deal.status)) {
    deduct(10, 'missing_deliverables', 'Deliverables are not defined');
  }

  // 5. Overdue open tasks
  const overdueTasks = await get(
    `SELECT COUNT(*) as count FROM tasks
     WHERE user_id = ? AND deal_id = ? AND deleted_at IS NULL
     AND status IN ('todo', 'in_progress') AND due_date IS NOT NULL AND due_date < date('now')`,
    [userId, deal.id]
  );
  if (overdueTasks.count > 0) deduct(Math.min(20, overdueTasks.count * 10), 'overdue_tasks', `${overdueTasks.count} overdue task(s)`);

  // 6. Invoice/payment signals
  const invoice = await get(
    `SELECT * FROM invoices WHERE deal_id = ? AND user_id = ? AND deleted_at IS NULL
     AND status NOT IN ('paid', 'cancelled', 'draft') ORDER BY created_at DESC LIMIT 1`,
    [userId, deal.id]
  );
  if (invoice) {
    if (invoice.status === 'overdue') deduct(20, 'invoice_overdue', 'Outstanding invoice is overdue');
    else if (invoice.status === 'partially_paid') deduct(5, 'partial_payment', 'Invoice is only partially paid');
    if (invoice.due_date && invoice.due_date < new Date().toISOString().slice(0, 10) && invoice.status === 'sent') {
      deduct(10, 'invoice_due_soon', 'Sent invoice is past its due date');
    }
  }

  // 7. Communication recency
  const lastComms = await get(
    `SELECT MAX(COALESCE(occurred_at, created_at)) as last_at FROM communications WHERE deal_id = ? AND user_id = ?`,
    [userId, deal.id]
  );
  if (lastComms?.last_at) {
    const days = Math.floor((today - new Date(lastComms.last_at)) / 86400000);
    if (days > 21 && !['paid', 'archived'].includes(deal.status)) {
      deduct(10, 'communication_gap', `No logged communication in ${days} days`);
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 75 ? 'Healthy' : score >= 45 ? 'Attention' : 'At Risk';
  return { score, label, breakdown };
}

async function create(userId, data, ip) {
  if (data.brand_id) {
    const brand = await get('SELECT id FROM brands WHERE id = ? AND user_id = ?', [data.brand_id, userId]);
    if (!brand) throw new ValidationError('Selected brand does not exist', { brand_id: 'Unknown brand' });
  }
  const probability = data.probability ?? STAGE_PROBABILITY[data.status] ?? 0;
  const position = await get('SELECT COALESCE(MIN(position), 0) - 1 as min FROM deals WHERE user_id = ? AND status = ?', [userId, data.status]);

  const result = await run(
    `INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, currency,
      payment_terms, deliverable, deadline, publish_date, notes, priority, contact_name, contact_email,
      contract_url, probability, tags, position, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, data.brand_id || null, data.brand_name, data.title, data.platform, data.status, data.deal_value,
      data.currency, data.payment_terms, data.deliverable || null, data.deadline || null, data.publish_date || null,
      data.notes || null, data.priority, data.contact_name || null, data.contact_email || null,
      data.contract_url || null, probability, tagsToJson(data.tags), position.min || 0, userId, userId]
  );
  const deal = parseTags(await get(DEAL_BY_ID, [result.lastID]));
  await activityService.log({ userId, action: 'deal.created', entityType: 'deal', entityId: deal.id, entityLabel: `${deal.brand_name} — ${deal.title}`, details: { status: deal.status, value: deal.deal_value }, ip });
  emit(EVENTS.DEAL_CREATED, { userId, deal });
  emit(EVENTS.STATS_CHANGED, { userId });
  return deal;
}

async function update(userId, id, data, ip) {
  const existing = await get('SELECT * FROM deals WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [id, userId]);
  if (!existing) throw new NotFoundError('Deal');

  const fields = ['brand_id', 'brand_name', 'title', 'platform', 'status', 'deal_value', 'currency',
    'payment_terms', 'deliverable', 'deadline', 'publish_date', 'notes', 'priority', 'contact_name',
    'contact_email', 'contract_url', 'probability', 'position', 'paid_at'];
  const updates = [];
  const params = [];
  for (const field of fields) {
    if (data[field] !== undefined) { updates.push(`${field} = ?`); params.push(data[field] ?? null); }
  }
  if (data.tags !== undefined) { updates.push('tags = ?'); params.push(tagsToJson(data.tags)); }
  if (updates.length === 0) return parseTags(existing);

  updates.push('updated_at = CURRENT_TIMESTAMP', 'updated_by = ?');
  params.push(userId, id, userId);
  await run(`UPDATE deals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);

  const updated = parseTags(await get(DEAL_BY_ID, [id]));
  if (existing.status !== updated.status) {
    await activityService.log({ userId, action: 'deal.stage_changed', entityType: 'deal', entityId: id, entityLabel: updated.title, details: { from: existing.status, to: updated.status }, ip });
    emit(EVENTS.DEAL_MOVED, { userId, deal: updated, from: existing.status });
  } else {
    await activityService.log({ userId, action: 'deal.updated', entityType: 'deal', entityId: id, entityLabel: updated.title, details: { fields: Object.keys(data) }, ip });
    emit(EVENTS.DEAL_UPDATED, { userId, deal: updated });
  }
  emit(EVENTS.STATS_CHANGED, { userId });
  return updated;
}

/** Validate then persist a stage transition. Throws 400 on invalid transitions. */
async function moveStage(userId, id, toStatus, position, ip) {
  const deal = await get('SELECT * FROM deals WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [id, userId]);
  if (!deal) throw new NotFoundError('Deal');
  if (deal.status === toStatus) {
    if (position === undefined) return parseTags(deal);
    await run('UPDATE deals SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [position, id]);
    return parseTags(await get(DEAL_BY_ID, [id]));
  }

  const allowed = STAGE_FLOW[deal.status] || [];
  if (!allowed.includes(toStatus)) {
    throw new ValidationError(
      `Cannot move from "${deal.status}" to "${toStatus}"`,
      { status: `Allowed transitions from ${deal.status}: ${allowed.join(', ')}` }
    );
  }

  // Business rule: cannot mark paid while the linked invoice still has an
  // outstanding balance — payment must be recorded first.
  if (toStatus === 'paid' && deal.status === 'invoiced') {
    const invoice = await get(
      `SELECT total_amount, amount_paid FROM invoices WHERE deal_id = ? AND user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`,
      [userId, id]
    );
    if (invoice && invoice.amount_paid < invoice.total_amount) {
      throw new ValidationError(
        'This deal has an outstanding invoice. Record the payment before marking the deal as paid.',
        { status: 'Outstanding invoice balance must be settled before marking as paid' }
      );
    }
  }

  return update(userId, id, {
    status: toStatus,
    position: position ?? deal.position,
    probability: STAGE_PROBABILITY[toStatus],
    paid_at: toStatus === 'paid' && !deal.paid_at ? new Date().toISOString().slice(0, 10) : undefined,
  }, ip);
}

/** Soft delete (audit-safe). Related invoices/tasks are hidden, not destroyed. */
async function softDelete(userId, id, ip) {
  const deal = await get('SELECT * FROM deals WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [id, userId]);
  if (!deal) throw new NotFoundError('Deal');
  await withTransaction(async (runTx) => {
    await runTx('UPDATE deals SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    await runTx('UPDATE tasks SET deleted_at = CURRENT_TIMESTAMP WHERE deal_id = ?', [id]);
  });
  await activityService.log({ userId, action: 'deal.deleted', entityType: 'deal', entityId: id, entityLabel: deal.title, ip });
  emit(EVENTS.DEAL_DELETED, { userId, dealId: id });
  emit(EVENTS.STATS_CHANGED, { userId });
  return { id };
}

/** Comments (deal notes) — ownership of the parent deal is always verified. */
async function addNote(userId, dealId, content, ip) {
  const deal = await get('SELECT id, title FROM deals WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [dealId, userId]);
  if (!deal) throw new NotFoundError('Deal');
  const result = await run('INSERT INTO deal_notes (deal_id, user_id, content) VALUES (?, ?, ?)', [dealId, userId, content]);
  const note = await get('SELECT * FROM deal_notes WHERE id = ?', [result.lastID]);
  await activityService.log({ userId, action: 'deal.comment_added', entityType: 'deal', entityId: dealId, entityLabel: deal.title, details: { excerpt: content.slice(0, 120) }, ip });
  return note;
}

async function deleteNote(userId, dealId, noteId) {
  // Both the note AND its parent deal must belong to the caller (IDOR fix).
  const result = await run(
    `DELETE FROM deal_notes WHERE id = ? AND user_id = ? AND deal_id IN (SELECT id FROM deals WHERE id = ? AND user_id = ?)`,
    [noteId, userId, dealId, userId]
  );
  if (result.changes === 0) throw new NotFoundError('Note');
  return { id: noteId };
}

async function addAttachment(userId, dealId, attachment, ip) {
  const deal = await get('SELECT id FROM deals WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [dealId, userId]);
  if (!deal) throw new NotFoundError('Deal');
  const result = await run(
    'INSERT INTO deal_attachments (user_id, deal_id, name, url, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, dealId, attachment.name, attachment.url, attachment.mime_type || null, attachment.size_bytes || null]
  );
  await activityService.log({ userId, action: 'deal.attachment_added', entityType: 'deal', entityId: dealId, entityLabel: attachment.name, ip });
  return get('SELECT * FROM deal_attachments WHERE id = ?', [result.lastID]);
}

module.exports = {
  list, getById, create, update, moveStage, softDelete, addNote, deleteNote,
  addAttachment, computeHealthScore, STAGE_PROBABILITY, parseTags,
};
