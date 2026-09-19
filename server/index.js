/**
 * Collabio API — application entry point.
 * Layering: routes (controllers) -> services -> database (repository layer).
 * Configuration, logging, auth, validation, rate limiting and realtime
 * are all wired here.
 */
const http = require('http');
const express = require('express');
const cors = require('cors');
const env = require('./src/config/env');
const { open } = require('./src/database/db');
const { createBaseTables } = require('./src/database/schema');
const { runMigrations } = require('./src/database/migrations');
const { seedDemoUserIfMissing } = require('./src/database/seed');
const { rateLimit } = require('./src/middleware/rateLimit');
const { requestLogger } = require('./src/middleware/requestLogger');
const { errorHandler } = require('./src/middleware/errorHandler');
const { initWebsocket } = require('./src/websocket');
const jobs = require('./src/services/jobsService');
const logger = require('./src/utils/logger');

const apiLimiter = rateLimit({
  name: 'api',
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.apiMax,
  keyFn: (req) => `${req.ip}:${req.userId || 'anon'}`,
});
const authLimiter = rateLimit({
  name: 'auth',
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.authMax,
  keyFn: (req) => req.ip || 'unknown',
});

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (env.isProd) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  app.use(cors({
    origin: [env.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLogger);

  // Global API rate limit (auth endpoints get a stricter one below).
  app.use('/api', apiLimiter);

  // ---- versioned routes ----
  const v1 = express.Router();
  v1.use('/auth', authLimiter, require('./src/routes/v1/auth.routes'));
  v1.use('/deals', require('./src/routes/v1/deals.routes'));
  v1.use('/brands', require('./src/routes/v1/brands.routes'));
  v1.use('/contacts', require('./src/routes/v1/contacts.routes'));
  v1.use('/invoices', require('./src/routes/v1/invoices.routes'));
  v1.use('/services', require('./src/routes/v1/services.routes'));
  v1.use('/notes', require('./src/routes/v1/notes.routes'));
  v1.use('/tasks', require('./src/routes/v1/tasks.routes'));
  v1.use('/communications', require('./src/routes/v1/communications.routes'));
  v1.use('/templates', require('./src/routes/v1/templates.routes'));
  v1.use('/notifications', require('./src/routes/v1/notifications.routes'));
  v1.use('/activity', require('./src/routes/v1/activity.routes'));
  v1.use('/search', require('./src/routes/v1/search.routes'));
  v1.use('/stats', require('./src/routes/v1/stats.routes'));
  v1.use('/preferences', require('./src/routes/v1/preferences.routes'));
  v1.use('/workspace', require('./src/routes/v1/workspace.routes'));
  v1.use('/health', require('./src/routes/v1/health.routes'));
  app.use('/api/v1', v1);

  // Legacy compatibility: existing clients calling /api/* get the same routers.
  app.use('/api/auth', authLimiter, require('./src/routes/v1/auth.routes'));
  for (const [prefix, file] of [
    ['/deals', 'deals'], ['/brands', 'brands'], ['/contacts', 'contacts'],
    ['/invoices', 'invoices'], ['/services', 'services'], ['/notes', 'notes'],
    ['/tasks', 'tasks'], ['/communications', 'communications'], ['/templates', 'templates'],
    ['/notifications', 'notifications'], ['/activity', 'activity'], ['/search', 'search'],
    ['/stats', 'stats'], ['/preferences', 'preferences'], ['/workspace', 'workspace'],
  ]) {
    app.use(`/api${prefix}`, require(`./src/routes/v1/${file}.routes`));
  }
  app.use('/api/health', require('./src/routes/v1/health.routes'));

  // 404
  app.use((req, res) => {
    res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' } });
  });

  app.use(errorHandler);
  return app;
}

async function start() {
  logger.info('server:starting', { env: env.env, port: env.port });
  open();
  await createBaseTables();
  await runMigrations();
  await seedDemoUserIfMissing();

  const app = createApp();
  const server = http.createServer(app);
  initWebsocket(server);

  jobs.startScheduler();

  server.listen(env.port, () => {
    logger.info('server:listening', { url: `http://localhost:${env.port}`, api: '/api/v1', ws: '/ws' });
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info('server:shutdown', { signal });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) {
  start().catch((err) => {
    logger.error('server:failed_to_start', { error: err.message, stack: err.stack?.split('\n').slice(0, 4).join('\n') });
    process.exit(1);
  });
}

module.exports = { createApp, start };
