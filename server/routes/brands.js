const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/database');
const { requireAuth } = require('./auth');

// GET all brands with deal stats
router.get('/', requireAuth, async (req, res) => {
  try {
    const brands = await all(
      `SELECT b.*,
        COUNT(d.id) as total_deals,
        COALESCE(SUM(d.deal_value), 0) as total_value,
        COALESCE(SUM(CASE WHEN d.status = 'paid' THEN d.deal_value ELSE 0 END), 0) as total_paid
       FROM brands b
       LEFT JOIN deals d ON d.brand_id = b.id AND d.user_id = b.user_id
       WHERE b.user_id = ?
       GROUP BY b.id
       ORDER BY total_value DESC`,
      [req.userId]
    );
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single brand with all deals
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const brand = await get('SELECT * FROM brands WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });

    const deals = await all('SELECT * FROM deals WHERE brand_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json({ ...brand, deals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create brand
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, industry, contact_name, contact_email, website, notes, logo_emoji = '🏢' } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await run(
      'INSERT INTO brands (user_id, name, industry, contact_name, contact_email, website, notes, logo_emoji) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId, name, industry, contact_name, contact_email, website, notes, logo_emoji]
    );
    const brand = await get('SELECT * FROM brands WHERE id = ?', [result.lastID]);
    res.status(201).json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update brand
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const brand = await get('SELECT id FROM brands WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!brand) return res.status(404).json({ error: 'Brand not found' });

    const fields = ['name', 'industry', 'contact_name', 'contact_email', 'website', 'notes', 'logo_emoji'];
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

    await run(`UPDATE brands SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);
    const updated = await get('SELECT * FROM brands WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE brand
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await run('DELETE FROM brands WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (result.changes === 0) return res.status(404).json({ error: 'Brand not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
