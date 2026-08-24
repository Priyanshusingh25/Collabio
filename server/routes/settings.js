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

module.exports = router;
