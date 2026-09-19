/** Auth controller/routes. Thin — all logic in services. */
const express = require('express');
const bcrypt = require('bcryptjs');
const { run, get } = require('../../database/db');
const env = require('../../config/env');
const { requireAuth, signToken } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { registerSchema, loginSchema, profileSchema, changePasswordSchema } = require('../../validators/schemas');
const { ok } = require('../../utils/apiResponse');
const { AuthenticationError, NotFoundError, ConflictError, ValidationError } = require('../../utils/AppError');
const { asyncHandler } = require('../../middleware/errorHandler');
const activityService = require('../../services/activityService');
const notificationService = require('../../services/notificationService');
const seed = require('../../database/seed');

const router = express.Router();

function safeUser(user) {
  if (!user) return user;
  const { password_hash, token_version, ...safe } = user;
  return safe;
}

router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const { username, email, password, display_name } = req.validated.body;
  const existing = await get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
  if (existing) throw new ConflictError('An account with that email or username already exists');

  const password_hash = bcrypt.hashSync(password, env.bcryptRounds);
  const result = await run(
    'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)',
    [username, email, password_hash, display_name || username]
  );
  const user = await get('SELECT * FROM users WHERE id = ?', [result.lastID]);
  await seed.seedStarterData(user.id);
  await activityService.log({ userId: user.id, action: 'auth.register', entityType: 'auth', entityLabel: email, ip: req.ip });
  await notificationService.create(user.id, {
    category: 'system', title: 'Welcome to Collabio 🎉',
    message: 'Start by adding a brand, then create your first deal.',
  });

  const token = signToken(user);
  return ok(res, { token, user: safeUser(user) }, { status: 201 });
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const user = await get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new AuthenticationError('Invalid email or password');
  }
  await run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
  await activityService.log({ userId: user.id, action: 'auth.login', entityType: 'auth', entityLabel: email, ip: req.ip });
  return ok(res, { token: signToken(user), user: safeUser(user) });
}));

router.post('/demo', asyncHandler(async (req, res) => {
  await seed.seedDemoUserIfMissing();
  const user = await get('SELECT * FROM users WHERE email = ?', [seed.DEMO_EMAIL]);
  if (!user) throw new NotFoundError('Demo user');
  await activityService.log({ userId: user.id, action: 'auth.login', entityType: 'auth', entityLabel: 'demo', ip: req.ip });
  return ok(res, { token: signToken(user), user: safeUser(user) });
}));

router.post('/logout', requireAuth, asyncHandler(async (req, res) => {
  // Invalidate every token issued so far (server-side logout).
  await run('UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id = ?', [req.userId]);
  await activityService.log({ userId: req.userId, action: 'auth.logout', entityType: 'auth', ip: req.ip });
  return ok(res, { loggedOut: true });
}));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await get(
    'SELECT id, username, email, display_name, avatar_emoji, role, created_at, last_login_at FROM users WHERE id = ?',
    [req.userId]
  );
  if (!user) throw new NotFoundError('User');
  return ok(res, user);
}));

router.put('/me', requireAuth, validate(profileSchema), asyncHandler(async (req, res) => {
  const { display_name, avatar_emoji } = req.validated.body;
  if (display_name !== undefined) await run('UPDATE users SET display_name = ? WHERE id = ?', [display_name, req.userId]);
  if (avatar_emoji !== undefined) await run('UPDATE users SET avatar_emoji = ? WHERE id = ?', [avatar_emoji, req.userId]);
  const user = await get('SELECT id, username, email, display_name, avatar_emoji, role FROM users WHERE id = ?', [req.userId]);
  return ok(res, user);
}));

router.post('/change-password', requireAuth, validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.validated.body;
  const user = await get('SELECT * FROM users WHERE id = ?', [req.userId]);
  if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
    throw new AuthenticationError('Current password is incorrect');
  }
  const password_hash = bcrypt.hashSync(new_password, env.bcryptRounds);
  await run('UPDATE users SET password_hash = ?, token_version = COALESCE(token_version, 0) + 1 WHERE id = ?', [password_hash, req.userId]);
  await activityService.log({ userId: req.userId, action: 'auth.password_changed', entityType: 'auth', ip: req.ip });
  const updated = await get('SELECT * FROM users WHERE id = ?', [req.userId]);
  return ok(res, { token: signToken(updated), user: safeUser(updated) });
}));

module.exports = router;
