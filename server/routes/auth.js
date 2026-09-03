const { run, get, all } = require('../db/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'collabio-secret-key-change-in-production';

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, display_name } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }

    const existing = await get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing) {
      return res.status(409).json({ error: 'User with that email or username already exists' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const result = await run(
      'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
      [username, email, password_hash, display_name || username]
    );
    const userId = result.lastID;

    await seedDemoData(userId);

    const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' });
    const user = await get('SELECT id, username, email, display_name, avatar_emoji FROM users WHERE id = ?', [userId]);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1-Click Demo Login
router.post('/demo', async (req, res) => {
  try {
    let user = await get('SELECT * FROM users WHERE email = ?', ['demo@collabio.app']);
    if (!user) {
      const { seedDemoUserIfMissing } = require('../db/database');
      const userId = await seedDemoUserIfMissing();
      user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    }
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await get(
      'SELECT id, username, email, display_name, avatar_emoji, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update profile
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { display_name, avatar_emoji } = req.body;
    await run('UPDATE users SET display_name = ?, avatar_emoji = ? WHERE id = ?', [display_name, avatar_emoji, req.userId]);
    const user = await get('SELECT id, username, email, display_name, avatar_emoji FROM users WHERE id = ?', [req.userId]);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function seedDemoData(userId) {
  const d = (offset) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split('T')[0];
  };

  // Pre-fill user settings for Priyanshu
  await run(
    'INSERT INTO user_settings (user_id, linkedin, bio) VALUES (?, ?, ?)',
    [userId, 'https://www.linkedin.com/in/priyanshu-singh-0x12', 'Creator & Software Developer']
  );

  // Add one sample brand and deal
  const b1 = await run('INSERT INTO brands (user_id, name, industry, logo_emoji) VALUES (?, ?, ?, ?)', [userId, 'Sample Brand', 'Tech', '🏢']);
  
  await run(`INSERT INTO deals (user_id, brand_id, brand_name, title, platform, status, deal_value, payment_terms, deadline, priority)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, b1.lastID, 'Sample Brand', 'Sample Integration', 'YouTube', 'active', 1000, 'net-30', d(14), 'medium']);
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { router, requireAuth };
