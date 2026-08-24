const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/database');
const { requireAuth } = require('./auth');

// GET all notes
router.get('/', requireAuth, async (req, res) => {
  try {
    const notes = await all('SELECT * FROM quick_notes WHERE user_id = ? ORDER BY is_pinned DESC, created_at DESC', [req.userId]);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create note
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, content, color = 'blue', is_pinned = 0 } = req.body;

    const result = await run(
      'INSERT INTO quick_notes (user_id, title, content, color, is_pinned) VALUES (?, ?, ?, ?, ?)',
      [req.userId, title, content, color, is_pinned]
    );
    const note = await get('SELECT * FROM quick_notes WHERE id = ?', [result.lastID]);
    res.status(201).json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update note
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const note = await get('SELECT id FROM quick_notes WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const fields = ['title', 'content', 'color', 'is_pinned'];
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

    await run(`UPDATE quick_notes SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);
    const updated = await get('SELECT * FROM quick_notes WHERE id = ?', [req.params.id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE note
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await run('DELETE FROM quick_notes WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (result.changes === 0) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
