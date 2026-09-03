const express = require('express');
const router = express.Router();
const { run, get } = require('../db/database');
const { requireAuth } = require('./auth');

// GET settings
router.get('/', requireAuth, async (req, res) => {
  try {
    let settings = await get('SELECT * FROM user_settings WHERE user_id = ?', [req.userId]);
    if (!settings) {
      // Create empty settings if none exist
      await run('INSERT INTO user_settings (user_id) VALUES (?)', [req.userId]);
      settings = await get('SELECT * FROM user_settings WHERE user_id = ?', [req.userId]);
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update settings
router.put('/', requireAuth, async (req, res) => {
  try {
    const fields = ['linkedin', 'gmail', 'instagram', 'github', 'youtube', 'bio', 'invoice_business_name', 'invoice_address'];
    const updates = [];
    const params = [];
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(req.body[field]);
      }
    }
    
    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(req.userId);
      await run(`UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`, params);
    }
    
    const updated = await get('SELECT * FROM user_settings WHERE user_id = ?', [req.userId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET export all workspace data for backup
router.get('/export', requireAuth, async (req, res) => {
  try {
    const { all } = require('../db/database');
    const user = await get('SELECT id, username, email, display_name, avatar_emoji, created_at FROM users WHERE id = ?', [req.userId]);
    const settings = await get('SELECT * FROM user_settings WHERE user_id = ?', [req.userId]);
    const deals = await all('SELECT * FROM deals WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    const brands = await all('SELECT * FROM brands WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    const contacts = await all('SELECT * FROM contacts WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    const services = await all('SELECT * FROM services WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    const invoices = await all('SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    const notes = await all('SELECT * FROM quick_notes WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);

    res.json({
      exported_at: new Date().toISOString(),
      app: 'Collabio Deal Manager',
      database: 'SQLite 3 (WAL Mode)',
      user,
      settings,
      data: {
        deals,
        brands,
        contacts,
        services,
        invoices,
        notes
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
