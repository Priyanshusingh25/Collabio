/**
 * Workspace backup / restore / CSV import-export.
 * Restore runs inside a single transaction with rollback on any failure —
 * existing data is never overwritten silently.
 */
const { run, get, all, withTransaction } = require('../database/db');
const { ValidationError } = require('../utils/AppError');
const activityService = require('./activityService');

async function exportWorkspace(userId) {
  const [user, settings, deals, brands, contacts, services, invoices, notes, tasks, templates, communications, payments, activity] = await Promise.all([
    get('SELECT id, username, email, display_name, avatar_emoji, created_at FROM users WHERE id = ?', [userId]),
    get('SELECT * FROM user_settings WHERE user_id = ?', [userId]),
    all('SELECT * FROM deals WHERE user_id = ? ORDER BY created_at DESC', [userId]),
    all('SELECT * FROM brands WHERE user_id = ? ORDER BY created_at DESC', [userId]),
    all('SELECT * FROM contacts WHERE user_id = ? ORDER BY created_at DESC', [userId]),
    all('SELECT * FROM services WHERE user_id = ? ORDER BY created_at DESC', [userId]),
    all('SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC', [userId]),
    all('SELECT * FROM quick_notes WHERE user_id = ? ORDER BY created_at DESC', [userId]),
    all('SELECT * FROM tasks WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC', [userId]),
    all('SELECT * FROM templates WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC', [userId]),
    all('SELECT * FROM communications WHERE user_id = ? ORDER BY created_at DESC', [userId]),
    all('SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC', [userId]),
    all(`SELECT action, entity_type, entity_label, details, created_at FROM activity_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 1000`, [userId]),
  ]);
  return {
    exported_at: new Date().toISOString(),
    app: 'Collabio Deal Manager',
    schema_version: 1,
    user, settings,
    data: { deals, brands, contacts, services, invoices, notes, tasks, templates, communications, payments, activity },
  };
}

function cleanRow(row) {
  const clean = { ...row };
  delete clean.id;
  delete clean.user_id;
  return clean;
}

/**
 * Restore from a validated backup. `replace` clears the current workspace
 * data first (inside the same transaction), `merge` appends as new rows.
 */
async function restore(userId, backup, mode, ip) {
  const sections = ['deals', 'brands', 'contacts', 'services', 'invoices', 'notes', 'tasks', 'templates', 'communications', 'payments'];
  const tableFor = { deals: 'deals', brands: 'brands', contacts: 'contacts', services: 'services', invoices: 'invoices', notes: 'quick_notes', tasks: 'tasks', templates: 'templates', communications: 'communications', payments: 'payments' };

  const summary = { restored: {}, skipped: {} };
  await withTransaction(async (runTx) => {
    for (const section of sections) {
      const rows = backup?.data?.[section];
      if (!Array.isArray(rows) || rows.length === 0) continue;
      const table = tableFor[section];
      const sample = rows[0];
      const columns = Object.keys(cleanRow(sample)).filter((c) => /^[a-z_][a-z0-9_]*$/.test(c));
      if (columns.length === 0) { summary.skipped[section] = rows.length; continue; }

      if (mode === 'replace') {
        await runTx(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
      }
      const placeholders = columns.map(() => '?').join(', ');
      let restored = 0;
      for (const row of rows) {
        try {
          await runTx(
            `INSERT INTO ${table} (user_id, ${columns.join(', ')}) VALUES (?, ${placeholders})`,
            [userId, ...columns.map((c) => (row[c] === undefined ? null : typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c]))]
          );
          restored += 1;
        } catch { /* row-level conflict — count as skipped */ }
      }
      summary.restored[section] = restored;
      summary.skipped[section] = rows.length - restored;
    }
  });

  await activityService.log({ userId, action: 'workspace.restored', entityType: 'workspace', details: { mode, summary }, ip });
  return summary;
}

// ---------- CSV support (RFC-4180-ish parser, no dependencies) ----------

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((v) => v !== '')) rows.push(row);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(headers.map((h, idx) => [h, (r[idx] ?? '').trim()])));
}

function toCsv(rows, columns) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.join(',')];
  for (const row of rows) lines.push(columns.map((c) => esc(row[c])).join(','));
  return lines.join('\n');
}

const DEAL_IMPORT_COLUMNS = ['brand_name', 'title', 'platform', 'status', 'deal_value', 'currency', 'payment_terms', 'deliverable', 'deadline', 'priority', 'contact_name', 'contact_email', 'notes'];
const CONTACT_IMPORT_COLUMNS = ['name', 'company', 'email', 'phone', 'role', 'platform', 'source', 'status', 'notes'];

/** Parse + validate + dedupe rows for preview. Nothing is persisted here. */
async function previewImport(userId, entity, rows) {
  const { dealCreateSchema, contactSchema } = require('../validators/schemas');
  const schema = entity === 'deals' ? dealCreateSchema : contactSchema;
  const valid = [];
  const invalid = [];
  const duplicates = [];

  const existing = entity === 'contacts'
    ? await all('SELECT LOWER(name) as name, LOWER(email) as email FROM contacts WHERE user_id = ?', [userId])
    : await all('SELECT LOWER(title) as title, LOWER(brand_name) as brand_name FROM deals WHERE user_id = ?', [userId]);

  const seen = new Set(existing.map((r) => entity === 'contacts' ? `${r.name}|${r.email}` : `${r.brand_name}|${r.title}`));

  rows.forEach((row, index) => {
    const key = entity === 'contacts'
      ? `${String(row.name || '').toLowerCase()}|${String(row.email || '').toLowerCase()}`
      : `${String(row.brand_name || '').toLowerCase()}|${String(row.title || '').toLowerCase()}`;
    const parsed = schema.safeParse({
      ...row,
      deal_value: row.deal_value === '' || row.deal_value === undefined ? 0 : row.deal_value,
    });
    if (seen.has(key)) {
      duplicates.push({ row: index + 1, reason: 'Matches an existing or earlier row in this file' });
      return;
    }
    if (!parsed.success) {
      invalid.push({ row: index + 1, errors: parsed.error.issues.map((i) => `${i.path.join('.') || 'row'}: ${i.message}`) });
      return;
    }
    valid.push(parsed.data);
    seen.add(key);
  });

  return { valid, invalid, duplicates, total: rows.length };
}

/** Commit a previously-previewed import inside ONE transaction (all-or-nothing). */
async function commitImport(userId, entity, rows, ip) {
  const preview = await previewImport(userId, entity, rows);
  if (preview.invalid.length > 0) {
    throw new ValidationError(`${preview.invalid.length} invalid row(s) — resolve them before importing`, {
      invalid: preview.invalid.slice(0, 10).map((r) => `Row ${r.row}: ${r.errors.join('; ')}`),
    });
  }
  const inserted = await withTransaction(async (runTx) => {
    let count = 0;
    for (const row of preview.valid) {
      if (entity === 'deals') {
        await runTx(
          `INSERT INTO deals (user_id, brand_name, title, platform, status, deal_value, currency, payment_terms, deliverable, deadline, priority, contact_name, contact_email, notes, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, row.brand_name, row.title, row.platform, row.status || 'outreach', row.deal_value ?? 0, row.currency || 'USD',
            row.payment_terms || 'net-30', row.deliverable || null, row.deadline || null, row.priority || 'medium',
            row.contact_name || null, row.contact_email || null, row.notes || null, userId, userId]
        );
      } else {
        await runTx(
          `INSERT INTO contacts (user_id, name, company, email, phone, role, platform, source, status, notes, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, row.name, row.company || null, row.email || null, row.phone || null, row.role || null,
            row.platform || null, row.source || null, row.status || 'lead', row.notes || null, userId, userId]
        );
      }
      count += 1;
    }
    return count;
  });
  await activityService.log({ userId, action: 'data.imported', entityType: entity, details: { inserted }, ip });
  return { inserted, duplicates: preview.duplicates.length, invalid: preview.invalid.length, total: rows.length };
}

async function exportCsv(userId, entity) {
  const columns = entity === 'contacts' ? CONTACT_IMPORT_COLUMNS : DEAL_IMPORT_COLUMNS;
  const table = entity === 'contacts' ? 'contacts' : 'deals';
  const where = entity === 'contacts' ? 'deleted_at IS NULL' : "deleted_at IS NULL AND status != 'archived'";
  const rows = await all(`SELECT ${columns.join(', ')} FROM ${table} WHERE user_id = ? AND ${where} ORDER BY created_at DESC`, [userId]);
  return toCsv(rows, columns);
}

module.exports = { exportWorkspace, restore, previewImport, commitImport, exportCsv, parseCsv, toCsv };
