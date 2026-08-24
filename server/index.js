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

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/brands', brandsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/notes', notesRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Collabio API', version: '1.0.0' });
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

// Start server after DB init
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

module.exports = app;
