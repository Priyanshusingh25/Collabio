/** Global search across all workspace entities. Escapes LIKE wildcards. */
const { all } = require('../database/db');

function term(q) {
  return `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
}

async function search(userId, rawQuery, { limit = 5 } = {}) {
  const q = term(rawQuery);
  const [deals, brands, contacts, invoices, notes, services, tasks] = await Promise.all([
    all(
      `SELECT id, title, brand_name, status, deal_value, currency FROM deals
       WHERE user_id = ? AND deleted_at IS NULL AND (title LIKE ? ESCAPE '\\' OR brand_name LIKE ? ESCAPE '\\' OR deliverable LIKE ? ESCAPE '\\')
       ORDER BY updated_at DESC LIMIT ?`,
      [userId, q, q, q, limit]
    ),
    all(
      `SELECT id, name, industry, logo_emoji FROM brands
       WHERE user_id = ? AND deleted_at IS NULL AND (name LIKE ? ESCAPE '\\' OR industry LIKE ? ESCAPE '\\' OR contact_name LIKE ? ESCAPE '\\')
       ORDER BY updated_at DESC LIMIT ?`,
      [userId, q, q, q, limit]
    ),
    all(
      `SELECT id, name, company, email FROM contacts
       WHERE user_id = ? AND deleted_at IS NULL AND (name LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\')
       ORDER BY updated_at DESC LIMIT ?`,
      [userId, q, q, q, limit]
    ),
    all(
      `SELECT id, invoice_number, status, total_amount, currency FROM invoices
       WHERE user_id = ? AND deleted_at IS NULL AND (invoice_number LIKE ? ESCAPE '\\' OR notes LIKE ? ESCAPE '\\')
       ORDER BY created_at DESC LIMIT ?`,
      [userId, q, q, limit]
    ),
    all(
      `SELECT id, title, content FROM quick_notes
       WHERE user_id = ? AND (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\')
       ORDER BY updated_at DESC LIMIT ?`,
      [userId, q, q, limit]
    ),
    all(
      `SELECT id, name, category, rate FROM services
       WHERE user_id = ? AND (name LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')
       ORDER BY updated_at DESC LIMIT ?`,
      [userId, q, q, limit]
    ),
    all(
      `SELECT id, title, status, due_date FROM tasks
       WHERE user_id = ? AND deleted_at IS NULL AND title LIKE ? ESCAPE '\\'
       ORDER BY updated_at DESC LIMIT ?`,
      [userId, q, limit]
    ),
  ]);
  return { deals, brands, contacts, invoices, notes, services, tasks };
}

module.exports = { search };
