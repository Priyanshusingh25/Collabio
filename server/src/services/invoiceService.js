/**
 * Invoice service — lifecycle management, server-side money math and
 * transactional payment recording. Totals are ALWAYS recomputed here;
 * the client can never dictate an invoice total.
 */
const { run, get, all, withTransaction } = require('../database/db');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/AppError');
const activityService = require('./activityService');
const notificationService = require('./notificationService');
const { emit, EVENTS } = require('../events/bus');

const TRANSITIONS = Object.freeze({
  draft: ['sent', 'cancelled'],
  sent: ['viewed', 'partially_paid', 'paid', 'overdue', 'cancelled'],
  viewed: ['partially_paid', 'paid', 'overdue', 'cancelled'],
  partially_paid: ['paid', 'cancelled'],
  overdue: ['partially_paid', 'paid', 'cancelled'],
  paid: [],
  cancelled: [],
});

function parseInvoice(row) {
  if (!row) return row;
  return { ...row, line_items: JSON.parse(row.line_items || '[]') };
}

/** Server-authoritative money math: subtotal − discount + tax. */
function computeTotals(lineItems, taxRate = 0, discount = 0) {
  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.amount) || 0) * (item.quantity || 1), 0);
  const afterDiscount = Math.max(0, subtotal - discount);
  const tax = (afterDiscount * taxRate) / 100;
  const total = Math.round((afterDiscount + tax) * 100) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, tax: Math.round(tax * 100) / 100, total };
}

async function generateInvoiceNumber(userId) {
  const year = new Date().getFullYear();
  const count = await get(`SELECT COUNT(*) as count FROM invoices WHERE user_id = ? AND invoice_number LIKE ?`, [userId, `INV-${year}-%`]);
  let seq = count.count + 1;
  for (let i = 0; i < 1000; i += 1) {
    const candidate = `INV-${year}-${String(seq).padStart(3, '0')}`;
    const exists = await get(`SELECT id FROM invoices WHERE user_id = ? AND invoice_number = ?`, [userId, candidate]);
    if (!exists) return candidate;
    seq += 1;
  }
  throw new ConflictError('Unable to generate a unique invoice number');
}

async function list(userId, { page = 1, limit = 50, status, search } = {}) {
  const params = [userId];
  let where = 'user_id = ? AND deleted_at IS NULL';
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (search) {
    const term = `%${search.replace(/[%_]/g, '')}%`;
    where += ' AND (invoice_number LIKE ? OR notes LIKE ?)'; params.push(term, term);
  }
  const count = await get(`SELECT COUNT(*) as count FROM invoices WHERE ${where}`, params);
  const invoices = await all(
    `SELECT i.*, d.title as deal_title, c.name as contact_name
     FROM invoices i
     LEFT JOIN deals d ON i.deal_id = d.id
     LEFT JOIN contacts c ON i.contact_id = c.id
     WHERE ${where} ORDER BY i.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  return { items: invoices.map(parseInvoice), meta: { page, limit, total: count.count, total_pages: Math.max(1, Math.ceil(count.count / limit)) } };
}

async function getById(userId, id) {
  const invoice = await get(
    `SELECT i.*, d.title as deal_title, c.name as contact_name FROM invoices i
     LEFT JOIN deals d ON i.deal_id = d.id LEFT JOIN contacts c ON i.contact_id = c.id
     WHERE i.id = ? AND i.user_id = ? AND i.deleted_at IS NULL`,
    [id, userId]
  );
  if (!invoice) throw new NotFoundError('Invoice');
  const payments = await all('SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at DESC, id DESC', [id]);
  return { ...parseInvoice(invoice), payments };
}

async function create(userId, data, ip) {
  if (data.deal_id) {
    const deal = await get('SELECT id FROM deals WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [data.deal_id, userId]);
    if (!deal) throw new ValidationError('Linked deal does not exist', { deal_id: 'Unknown deal' });
  }
  if (data.contact_id) {
    const contact = await get('SELECT id FROM contacts WHERE id = ? AND user_id = ?', [data.contact_id, userId]);
    if (!contact) throw new ValidationError('Linked contact does not exist', { contact_id: 'Unknown contact' });
  }
  if (data.due_date && data.issue_date && data.due_date < data.issue_date) {
    throw new ValidationError('Due date cannot be before the issue date', { due_date: 'Due date must be on or after the issue date' });
  }

  const totals = computeTotals(data.line_items, data.tax_rate, data.discount);
  const invoiceNumber = data.invoice_number || (await generateInvoiceNumber(userId));
  const dupe = await get('SELECT id FROM invoices WHERE user_id = ? AND invoice_number = ? AND deleted_at IS NULL', [userId, invoiceNumber]);
  if (dupe) throw new ValidationError('Duplicate invoice number', { invoice_number: 'This invoice number is already in use' });

  const result = await run(
    `INSERT INTO invoices (user_id, deal_id, contact_id, invoice_number, status, issue_date, due_date,
      line_items, subtotal, tax_rate, discount, total_amount, currency, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, data.deal_id || null, data.contact_id || null, invoiceNumber, data.status, data.issue_date || null,
      data.due_date || null, JSON.stringify(data.line_items), totals.subtotal, data.tax_rate, data.discount,
      totals.total, data.currency, data.notes || null]
  );
  const invoice = parseInvoice(await get('SELECT * FROM invoices WHERE id = ?', [result.lastID]));
  await activityService.log({ userId, action: 'invoice.created', entityType: 'invoice', entityId: invoice.id, entityLabel: invoiceNumber, details: { total: totals.total }, ip });
  emit(EVENTS.INVOICE_UPDATED, { userId, invoice });
  emit(EVENTS.STATS_CHANGED, { userId });
  return invoice;
}

async function update(userId, id, data, ip) {
  const existing = await get('SELECT * FROM invoices WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [id, userId]);
  if (!existing) throw new NotFoundError('Invoice');

  const updates = [];
  const params = [];
  let lineItems = parseInvoice(existing).line_items;
  let taxRate = existing.tax_rate;
  let discount = existing.discount;

  if (data.line_items !== undefined) { lineItems = data.line_items; updates.push('line_items = ?'); params.push(JSON.stringify(lineItems)); }
  if (data.tax_rate !== undefined) { taxRate = data.tax_rate; updates.push('tax_rate = ?'); params.push(taxRate); }
  if (data.discount !== undefined) { discount = data.discount; updates.push('discount = ?'); params.push(discount); }
  if (data.line_items !== undefined || data.tax_rate !== undefined || data.discount !== undefined) {
    const totals = computeTotals(lineItems, taxRate, discount);
    updates.push('subtotal = ?', 'total_amount = ?');
    params.push(totals.subtotal, totals.total);
  }

  const directFields = ['deal_id', 'contact_id', 'invoice_number', 'issue_date', 'due_date', 'currency', 'notes'];
  for (const field of directFields) {
    if (data[field] !== undefined) { updates.push(`${field} = ?`); params.push(data[field] ?? null); }
  }

  if (data.status !== undefined && data.status !== existing.status) {
    const allowed = TRANSITIONS[existing.status] || [];
    if (!allowed.includes(data.status)) {
      throw new ValidationError(`Cannot move invoice from "${existing.status}" to "${data.status}"`, { status: `Allowed: ${allowed.join(', ') || 'none'}` });
    }
    updates.push('status = ?'); params.push(data.status);
    if (data.status === 'sent') updates.push('sent_at = CURRENT_TIMESTAMP');
    if (data.status === 'cancelled') updates.push('cancelled_at = CURRENT_TIMESTAMP');
  }

  if (updates.length === 0) return getById(userId, id);
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id, userId);
  await run(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);

  const invoice = await getById(userId, id);
  await activityService.log({ userId, action: 'invoice.updated', entityType: 'invoice', entityId: id, entityLabel: invoice.invoice_number, details: { fields: Object.keys(data) }, ip });
  emit(EVENTS.INVOICE_UPDATED, { userId, invoice });
  emit(EVENTS.STATS_CHANGED, { userId });
  return invoice;
}

/**
 * Record a payment inside a single transaction:
 * payment row + invoice amount_paid/status + linked deal status + audit.
 */
async function recordPayment(userId, invoiceId, paymentData, ip) {
  const invoice = await get('SELECT * FROM invoices WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [invoiceId, userId]);
  if (!invoice) throw new NotFoundError('Invoice');
  if (invoice.status === 'cancelled') throw new ValidationError('Cannot record a payment on a cancelled invoice');
  if (invoice.status === 'draft') throw new ValidationError('Send the invoice before recording payments');

  const outstanding = Math.round((invoice.total_amount - invoice.amount_paid) * 100) / 100;
  if (paymentData.amount > outstanding + 0.001) {
    throw new ValidationError(
      `Payment exceeds the outstanding balance (${outstanding.toFixed(2)})`,
      { amount: `Maximum allowed payment is ${outstanding.toFixed(2)}` }
    );
  }

  const newPaid = Math.round((invoice.amount_paid + paymentData.amount) * 100) / 100;
  const fullyPaid = newPaid >= invoice.total_amount - 0.001;

  const paymentId = await withTransaction(async (runTx, getTx) => {
    const res = await runTx(
      `INSERT INTO payments (user_id, invoice_id, amount, currency, method, reference, paid_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, invoiceId, paymentData.amount, invoice.currency, paymentData.method,
        paymentData.reference || null, paymentData.paid_at || new Date().toISOString().slice(0, 10), paymentData.notes || null]
    );
    await runTx(
      `UPDATE invoices SET amount_paid = ?, status = ?, paid_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newPaid, fullyPaid ? 'paid' : 'partially_paid', fullyPaid ? new Date().toISOString().slice(0, 10) : invoice.paid_at, invoiceId]
    );
    return res.lastID;
  });

  const payment = await get('SELECT * FROM payments WHERE id = ?', [paymentId]);
  const updatedInvoice = await getById(userId, invoiceId);

  await activityService.log({ userId, action: 'invoice.payment_recorded', entityType: 'invoice', entityId: invoiceId, entityLabel: invoice.invoice_number, details: { amount: paymentData.amount, method: paymentData.method, fully_paid: fullyPaid }, ip });
  await notificationService.create(userId, {
    category: 'payment',
    title: fullyPaid ? `Payment received — ${invoice.invoice_number} fully paid` : `Partial payment recorded — ${invoice.invoice_number}`,
    message: `${paymentData.amount} ${invoice.currency} via ${paymentData.method.replace('_', ' ')}`,
    entity_type: 'invoice', entity_id: invoiceId,
  });

  // Fully paid invoice moves the linked deal to Paid (single source of truth: money received).
  if (fullyPaid && invoice.deal_id) {
    const deal = await get('SELECT id, status FROM deals WHERE id = ? AND user_id = ? AND deleted_at IS NULL', [invoice.deal_id, userId]);
    if (deal && deal.status !== 'paid') {
      await run(
        `UPDATE deals SET status = 'paid', paid_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [payment.paid_at, deal.id]
      );
      await activityService.log({ userId, action: 'deal.stage_changed', entityType: 'deal', entityId: deal.id, entityLabel: invoice.invoice_number, details: { from: deal.status, to: 'paid', reason: 'invoice_paid' }, ip });
      emit(EVENTS.DEAL_MOVED, { userId, deal: await get('SELECT * FROM deals WHERE id = ?', [deal.id]), from: deal.status });
    }
  }

  emit(EVENTS.PAYMENT_RECORDED, { userId, payment, invoice: updatedInvoice });
  emit(EVENTS.STATS_CHANGED, { userId });
  return { payment, invoice: updatedInvoice };
}

/** Mark sent invoices past due as overdue (also invoked by the scheduler job). */
async function refreshOverdue(userId) {
  const result = await run(
    `UPDATE invoices SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND status IN ('sent', 'viewed') AND due_date IS NOT NULL AND due_date < date('now')`,
    [userId]
  );
  if (result.changes > 0) emit(EVENTS.STATS_CHANGED, { userId });
  return result.changes;
}

module.exports = { list, getById, create, update, recordPayment, computeTotals, generateInvoiceNumber, refreshOverdue, TRANSITIONS };
