const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/database');
const { requireAuth } = require('./auth');

// GET all invoices
router.get('/', requireAuth, async (req, res) => {
  try {
    const invoices = await all(`
      SELECT i.*, d.title as deal_title, c.name as contact_name
      FROM invoices i
      LEFT JOIN deals d ON i.deal_id = d.id
      LEFT JOIN contacts c ON i.contact_id = c.id
      WHERE i.user_id = ? ORDER BY i.created_at DESC
    `, [req.userId]);
    res.json(invoices.map(inv => ({ ...inv, line_items: JSON.parse(inv.line_items || '[]') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single invoice
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const invoice = await get('SELECT * FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ ...invoice, line_items: JSON.parse(invoice.line_items || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create invoice
router.post('/', requireAuth, async (req, res) => {
  try {
    const { deal_id, contact_id, invoice_number, status = 'draft', issue_date, due_date, line_items = [], total_amount, currency = 'USD', notes } = req.body;
    
    const result = await run(
      'INSERT INTO invoices (user_id, deal_id, contact_id, invoice_number, status, issue_date, due_date, line_items, total_amount, currency, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId, deal_id, contact_id, invoice_number, status, issue_date, due_date, JSON.stringify(line_items), total_amount, currency, notes]
    );
    const invoice = await get('SELECT * FROM invoices WHERE id = ?', [result.lastID]);
    res.status(201).json({ ...invoice, line_items: JSON.parse(invoice.line_items || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update invoice
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const invoice = await get('SELECT id FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const fields = ['deal_id', 'contact_id', 'invoice_number', 'status', 'issue_date', 'due_date', 'line_items', 'total_amount', 'currency', 'notes'];
    const updates = [];
    const params = [];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(field === 'line_items' ? JSON.stringify(req.body[field]) : req.body[field]);
      }
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id, req.userId);

    await run(`UPDATE invoices SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);
    const updated = await get('SELECT * FROM invoices WHERE id = ?', [req.params.id]);
    res.json({ ...updated, line_items: JSON.parse(updated.line_items || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE invoice
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await run('DELETE FROM invoices WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (result.changes === 0) return res.status(404).json({ error: 'Invoice not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
