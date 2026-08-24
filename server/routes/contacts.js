const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/database');
const { requireAuth } = require('./auth');

// GET all contacts
router.get('/', requireAuth, async (req, res) => {
  try {
    const contacts = await all(`
      SELECT c.*, COUNT(d.id) as linked_deals_count 
      FROM contacts c
      LEFT JOIN deals d ON (d.contact_email = c.email OR d.contact_name = c.name) AND d.user_id = c.user_id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [req.userId]);
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single contact
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const contact = await get('SELECT * FROM contacts WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });
    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create contact
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, company, email, phone, platform, source, status = 'lead', notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await run(
      'INSERT INTO contacts (user_id, name, company, email, phone, platform, source, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId, name, company, email, phone, platform, source, status, notes]
    );
    const contact = await get('SELECT * FROM contacts WHERE id = ?', [result.lastID]);
    res.status(201).json(contact);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update contact
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const contact = await get('SELECT id FROM contacts WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    const fields = ['name', 'company', 'email', 'phone', 'platform', 'source', 'status', 'notes'];
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

    await run(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);
    const updated = await get('SELECT * FROM contacts WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE contact
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await run('DELETE FROM contacts WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (result.changes === 0) return res.status(404).json({ error: 'Contact not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
