/** JWT authentication middleware. Enforces token version (logout invalidation). */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AuthenticationError, AuthorizationError } = require('../utils/AppError');
const { get } = require('../database/db');

const ROLES = Object.freeze(['owner', 'admin', 'manager', 'member', 'viewer']);

function signToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, ver: user.token_version ?? 0 },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
}

async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) throw new AuthenticationError();
    const payload = jwt.verify(header.slice(7), env.jwt.secret);

    // Reject tokens issued before a logout / password change (token rotation).
    const user = await get('SELECT id, username, token_version, role FROM users WHERE id = ?', [payload.userId]);
    if (!user) throw new AuthenticationError('Account no longer exists');
    if ((user.token_version ?? 0) !== (payload.ver ?? 0)) {
      throw new AuthenticationError('Session revoked. Please sign in again.');
    }

    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (err) {
    if (err instanceof AuthenticationError) return next(err);
    next(new AuthenticationError('Invalid or expired token'));
  }
}

/** Role hierarchy for backend authorization (not just hidden UI). */
const ROLE_RANK = Object.freeze({ owner: 100, admin: 80, manager: 60, member: 40, viewer: 20 });

function requireRole(minimumRole) {
  return (req, _res, next) => {
    if (ROLE_RANK[req.userRole] >= ROLE_RANK[minimumRole]) return next();
    next(new AuthorizationError(`Requires ${minimumRole} role or higher`));
  };
}

module.exports = { requireAuth, requireRole, signToken, ROLES, ROLE_RANK };
