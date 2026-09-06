const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./db/database');
const { router: authRouter } = require('./routes/auth');
const dealsRouter = require('./routes/deals');
const brandsRouter = require('./routes/brands');
const statsRouter = require('./routes/stats');
const servicesRouter = require('./routes/services');
const contactsRouter = require('./routes/contacts');
const invoicesRouter = require('./routes/invoices');
const notesRouter = require('./routes/notes');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;

// Security Middleware: Hardening HTTP response headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Security Rate Limiting (In-Memory sliding window for Auth endpoints)
const authAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 mins
const MAX_AUTH_ATTEMPTS = 50;

function authRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const userRecord = authAttempts.get(ip) || { count: 0, firstAttempt: now };

  if (now - userRecord.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    userRecord.count = 1;
    userRecord.firstAttempt = now;
  } else {
    userRecord.count += 1;
  }
  authAttempts.set(ip, userRecord);

  if (userRecord.count > MAX_AUTH_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((userRecord.firstAttempt + RATE_LIMIT_WINDOW_MS - now) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds);
    return res.status(429).json({
      error: 'Too many authentication attempts. Please try again later for security reasons.',
      retryAfterSeconds
    });
  }
  next();
}

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes with security hardening
app.use('/api/auth', authRateLimiter, authRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/brands', brandsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/notes', notesRouter);
app.use('/api/settings', settingsRouter);

// Health check & System Diagnostics
app.get('/api/health', async (req, res) => {
  try {
    const { get } = require('./db/database');
    const userCount = await get('SELECT COUNT(*) as count FROM users');
    const dealCount = await get('SELECT COUNT(*) as count FROM deals');
    const brandCount = await get('SELECT COUNT(*) as count FROM brands');
    const invoiceCount = await get('SELECT COUNT(*) as count FROM invoices');

    res.json({
      status: 'ok',
      app: 'Collabio API',
      version: '1.0.0',
      database: {
        engine: 'SQLite 3',
        mode: 'WAL (Write-Ahead Logging)',
        status: 'connected',
        file: 'server/db/collabio.db',
        persistent: true,
        counts: {
          users: userCount?.count || 0,
          deals: dealCount?.count || 0,
          brands: brandCount?.count || 0,
          invoices: invoiceCount?.count || 0,
        }
      },
      security: {
        headersEnforced: true,
        rateLimiterActive: true,
        sqlInjectionProtection: 'Parameterized Statements',
        passwordHashing: 'bcrypt (10 rounds)',
        tokenVerification: 'HMAC-SHA256 JWT'
      },
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server after DB init if executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Collabio API running at http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

module.exports = app;
