/**
 * Forward-only, idempotent, additive migration system.
 *
 * Every migration is applied once and recorded in `_migrations`.
 * Migrations NEVER drop columns or destroy data — they only:
 *   - add nullable / defaulted columns to existing tables
 *   - create new tables
 *   - create indexes
 *
 * This keeps existing user databases intact (audit requirement #23).
 * All DDL lives here so the persistence layer can later be ported
 * to PostgreSQL by rewriting only this file.
 */
const { run, get, all } = require('./db');

/** Helper: add a column to a table only when it does not already exist. */
async function addColumnIfMissing(tableName, columnName, columnDecl) {
  const cols = await all(`PRAGMA table_info(${tableName})`);
  if (cols.some((c) => c.name === columnName)) return;
  await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDecl}`);
}

/** Helper: create an index only when it does not already exist. */
async function createIndexIfMissing(indexName, ddl) {
  const existing = await get(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?`, [indexName]);
  if (!existing) await run(ddl);
}

const MIGRATIONS = [
  {
    id: '001',
    name: 'audit-fields-soft-deletes-crm-columns',
    async up() {
      // users: token revocation + role (RBAC-ready)
      await addColumnIfMissing('users', 'token_version', 'INTEGER NOT NULL DEFAULT 0');
      await addColumnIfMissing('users', 'role', "TEXT NOT NULL DEFAULT 'owner'");
      await addColumnIfMissing('users', 'last_login_at', 'TEXT');

      // deals: pipeline intelligence + soft delete + audit fields
      await addColumnIfMissing('deals', 'probability', 'INTEGER NOT NULL DEFAULT 0');
      await addColumnIfMissing('deals', 'tags', 'TEXT');
      await addColumnIfMissing('deals', 'deleted_at', 'TEXT');
      await addColumnIfMissing('deals', 'created_by', 'INTEGER');
      await addColumnIfMissing('deals', 'updated_by', 'INTEGER');
      await addColumnIfMissing('deals', 'last_contacted_at', 'TEXT');

      // brands: relationship CRM
      await addColumnIfMissing('brands', 'company', 'TEXT');
      await addColumnIfMissing('brands', 'location', 'TEXT');
      await addColumnIfMissing('brands', 'relationship_status', "TEXT NOT NULL DEFAULT 'prospect'");
      await addColumnIfMissing('brands', 'tags', 'TEXT');
      await addColumnIfMissing('brands', 'socials', 'TEXT');
      await addColumnIfMissing('brands', 'last_contact_at', 'TEXT');
      await addColumnIfMissing('brands', 'deleted_at', 'TEXT');
      await addColumnIfMissing('brands', 'created_by', 'INTEGER');
      await addColumnIfMissing('brands', 'updated_by', 'INTEGER');

      // contacts: richer profiles + duplicate prevention
      await addColumnIfMissing('contacts', 'role', 'TEXT');
      await addColumnIfMissing('contacts', 'linkedin', 'TEXT');
      await addColumnIfMissing('contacts', 'instagram', 'TEXT');
      await addColumnIfMissing('contacts', 'preferred_channel', 'TEXT');
      await addColumnIfMissing('contacts', 'tags', 'TEXT');
      await addColumnIfMissing('contacts', 'deleted_at', 'TEXT');
      await addColumnIfMissing('contacts', 'created_by', 'INTEGER');
      await addColumnIfMissing('contacts', 'updated_by', 'INTEGER');

      // invoices: full lifecycle + money math
      await addColumnIfMissing('invoices', 'subtotal', 'REAL NOT NULL DEFAULT 0');
      await addColumnIfMissing('invoices', 'tax_rate', 'REAL NOT NULL DEFAULT 0');
      await addColumnIfMissing('invoices', 'discount', 'REAL NOT NULL DEFAULT 0');
      await addColumnIfMissing('invoices', 'amount_paid', 'REAL NOT NULL DEFAULT 0');
      await addColumnIfMissing('invoices', 'sent_at', 'TEXT');
      await addColumnIfMissing('invoices', 'viewed_at', 'TEXT');
      await addColumnIfMissing('invoices', 'paid_at', 'TEXT');
      await addColumnIfMissing('invoices', 'cancelled_at', 'TEXT');
      await addColumnIfMissing('invoices', 'deleted_at', 'TEXT');
    },
  },
  {
    id: '002',
    name: 'new-entities-tasks-notifications-activity-comms-payments-templates-prefs',
    async up() {
      await run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        deal_id INTEGER,
        brand_id INTEGER,
        contact_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'todo',
        assignee TEXT,
        reminder_at TEXT,
        completed_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        created_by INTEGER,
        updated_by INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL,
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
      )`);

      await run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        entity_type TEXT,
        entity_id INTEGER,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        entity_label TEXT,
        details TEXT,
        ip TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);
    },
  },
  {
    id: '003',
    name: 'comms-payments-templates-views-prefs-attachments',
    async up() {
      await run(`CREATE TABLE IF NOT EXISTS communications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        contact_id INTEGER,
        brand_id INTEGER,
        deal_id INTEGER,
        channel TEXT NOT NULL,
        direction TEXT NOT NULL DEFAULT 'outbound',
        summary TEXT NOT NULL,
        occurred_at TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL
      )`);

      await run(`CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        invoice_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        method TEXT,
        reference TEXT,
        paid_at TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'outreach',
        subject TEXT,
        body TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS saved_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        entity_type TEXT NOT NULL DEFAULT 'deals',
        config TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        theme TEXT NOT NULL DEFAULT 'dark',
        currency TEXT NOT NULL DEFAULT 'USD',
        timezone TEXT,
        date_format TEXT NOT NULL DEFAULT 'us',
        density TEXT NOT NULL DEFAULT 'comfortable',
        dashboard_layout TEXT,
        default_pipeline_view TEXT NOT NULL DEFAULT 'kanban',
        notification_prefs TEXT,
        followup_rules TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS deal_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        deal_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        mime_type TEXT,
        size_bytes INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
      )`);

      await run(`CREATE TABLE IF NOT EXISTS job_state (
        id TEXT PRIMARY KEY,
        last_run_at TEXT,
        payload TEXT
      )`);
    },
  },
  {
    id: '004',
    name: 'performance-indexes',
    async up() {
      await createIndexIfMissing('idx_deals_user', 'CREATE INDEX idx_deals_user ON deals(user_id)');
      await createIndexIfMissing('idx_deals_status', 'CREATE INDEX idx_deals_status ON deals(user_id, status)');
      await createIndexIfMissing('idx_deals_deadline', 'CREATE INDEX idx_deals_deadline ON deals(user_id, deadline)');
      await createIndexIfMissing('idx_deals_brand', 'CREATE INDEX idx_deals_brand ON deals(brand_id)');
      await createIndexIfMissing('idx_deals_created', 'CREATE INDEX idx_deals_created ON deals(user_id, created_at DESC)');
      await createIndexIfMissing('idx_brands_user', 'CREATE INDEX idx_brands_user ON brands(user_id)');
      await createIndexIfMissing('idx_brands_email', 'CREATE INDEX idx_brands_email ON brands(user_id, contact_email)');
      await createIndexIfMissing('idx_contacts_user', 'CREATE INDEX idx_contacts_user ON contacts(user_id)');
      await createIndexIfMissing('idx_contacts_email', 'CREATE INDEX idx_contacts_email ON contacts(user_id, email)');
      await createIndexIfMissing('idx_invoices_user_status', 'CREATE INDEX idx_invoices_user_status ON invoices(user_id, status)');
      await createIndexIfMissing('idx_invoices_deal', 'CREATE INDEX idx_invoices_deal ON invoices(deal_id)');
      await createIndexIfMissing('idx_payments_invoice', 'CREATE INDEX idx_payments_invoice ON payments(invoice_id)');
      await createIndexIfMissing('idx_payments_user', 'CREATE INDEX idx_payments_user ON payments(user_id, paid_at)');
      await createIndexIfMissing('idx_tasks_user_status', 'CREATE INDEX idx_tasks_user_status ON tasks(user_id, status)');
      await createIndexIfMissing('idx_tasks_due', 'CREATE INDEX idx_tasks_due ON tasks(user_id, due_date)');
      await createIndexIfMissing('idx_tasks_deal', 'CREATE INDEX idx_tasks_deal ON tasks(deal_id)');
      await createIndexIfMissing('idx_notifications_user', 'CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC)');
      await createIndexIfMissing('idx_activity_user', 'CREATE INDEX idx_activity_user ON activity_log(user_id, created_at DESC)');
      await createIndexIfMissing('idx_comms_user', 'CREATE INDEX idx_comms_user ON communications(user_id, occurred_at DESC)');
      await createIndexIfMissing('idx_comms_deal', 'CREATE INDEX idx_comms_deal ON communications(deal_id)');
      await createIndexIfMissing('idx_notes_user', 'CREATE INDEX idx_notes_user ON quick_notes(user_id, is_pinned DESC, created_at DESC)');
      await createIndexIfMissing('idx_services_user', 'CREATE INDEX idx_services_user ON services(user_id)');
      await createIndexIfMissing('idx_deal_notes_deal', 'CREATE INDEX idx_deal_notes_deal ON deal_notes(deal_id, created_at DESC)');
      await createIndexIfMissing('idx_users_email', 'CREATE UNIQUE INDEX idx_users_email ON users(email)');
      await createIndexIfMissing('idx_users_username', 'CREATE UNIQUE INDEX idx_users_username ON users(username)');
    },
  },
  {
    id: '005',
    name: 'task-tags-column',
    async up() {
      await addColumnIfMissing('tasks', 'tags', 'TEXT');
    },
  },
  {
    id: '006',
    name: 'audit-columns-on-simple-entities',
    async up() {
      for (const table of ['templates', 'communications', 'quick_notes', 'services']) {
        await addColumnIfMissing(table, 'created_by', 'INTEGER');
        await addColumnIfMissing(table, 'updated_by', 'INTEGER');
      }
    },
  },
];

async function runMigrations() {
  await run(`CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const applied = new Set((await all('SELECT id FROM _migrations')).map((r) => r.id));

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    console.log(`[db] applying migration ${migration.id}: ${migration.name}`);
    await migration.up();
    await run('INSERT INTO _migrations (id, name) VALUES (?, ?)', [migration.id, migration.name]);
  }
}

module.exports = { runMigrations, addColumnIfMissing, createIndexIfMissing };
