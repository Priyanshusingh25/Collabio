const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/database');
const { requireAuth } = require('./auth');

// GET all services
router.get('/', requireAuth, async (req, res) => {
  try {
    const services = await all('SELECT * FROM services WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single service
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const service = await get('SELECT * FROM services WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create service
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, category, rate, rate_type, platforms, description, status = 'active' } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await run(
      'INSERT INTO services (user_id, name, category, rate, rate_type, platforms, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId, name, category, rate, rate_type, platforms, description, status]
    );
    const service = await get('SELECT * FROM services WHERE id = ?', [result.lastID]);
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update service
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const service = await get('SELECT id FROM services WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const fields = ['name', 'category', 'rate', 'rate_type', 'platforms', 'description', 'status'];
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

    await run(`UPDATE services SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);
    const updated = await get('SELECT * FROM services WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE service
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await run('DELETE FROM services WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (result.changes === 0) return res.status(404).json({ error: 'Service not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
