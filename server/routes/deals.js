const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/database');
const { requireAuth } = require('./auth');

// GET all deals for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, platform, search } = req.query;
    let sql = 'SELECT * FROM deals WHERE user_id = ?';
    const params = [req.userId];

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (platform) { sql += ' AND platform = ?'; params.push(platform); }
    if (search) { sql += ' AND (brand_name LIKE ? OR title LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    sql += ' ORDER BY status, position, created_at DESC';
    const deals = await all(sql, params);
    res.json(deals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single deal
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const deal = await get('SELECT * FROM deals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const notes = await all('SELECT * FROM deal_notes WHERE deal_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json({ ...deal, notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create deal
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      brand_id, brand_name, title, platform, status = 'outreach',
      deal_value = 0, currency = 'USD', payment_terms = 'net-30',
      deliverable, deadline, publish_date, notes, priority = 'medium',
      contact_name, contact_email, contract_url, invoice_number, position = 0
    } = req.body;

    if (!brand_name || !title || !platform) {
      return res.status(400).json({ error: 'brand_name, title and platform are required' });
    }

    const result = await run(
      `INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, currency,
        payment_terms, deliverable, deadline, publish_date, notes, priority, contact_name, contact_email,
        contract_url, invoice_number, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, brand_id || null, brand_name, title, platform, status, deal_value, currency,
       payment_terms, deliverable, deadline, publish_date, notes, priority, contact_name, contact_email,
       contract_url, invoice_number, position]
    );
    const deal = await get('SELECT * FROM deals WHERE id = ?', [result.lastID]);
    res.status(201).json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update deal
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const deal = await get('SELECT id FROM deals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });

    const fields = ['brand_id', 'brand_name', 'title', 'platform', 'status', 'deal_value',
                    'currency', 'payment_terms', 'deliverable', 'deadline', 'publish_date',
                    'notes', 'priority', 'contact_name', 'contact_email', 'contract_url',
                    'invoice_number', 'paid_at', 'position'];

    const updates = [];
    const params = [];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id, req.userId);

    await run(`UPDATE deals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);
    const updated = await get('SELECT * FROM deals WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE deal
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await run('DELETE FROM deals WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (result.changes === 0) return res.status(404).json({ error: 'Deal not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST add note to deal
router.post('/:id/notes', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content is required' });

    const result = await run(
      'INSERT INTO deal_notes (deal_id, user_id, content) VALUES (?, ?, ?)',
      [req.params.id, req.userId, content]
    );
    const note = await get('SELECT * FROM deal_notes WHERE id = ?', [result.lastID]);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE note
router.delete('/:id/notes/:noteId', requireAuth, async (req, res) => {
  try {
    await run('DELETE FROM deal_notes WHERE id = ? AND user_id = ?', [req.params.noteId, req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
