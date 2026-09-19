/* Temporary diagnostic — inspect smoke-test DB state. */
const path = require('path');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(path.join(process.env.TEMP, 'collabio-smoke.db'));
const q = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (e, r) => (e ? rej(e) : res(r))));

(async () => {
  console.log('invoices:', JSON.stringify(await q('SELECT id, invoice_number, total_amount, amount_paid, status, subtotal, tax_rate, discount FROM invoices')));
  const queries = {
    monthly: [`SELECT month, COALESCE(SUM(value),0) as value FROM (
        SELECT strftime('%Y-%m', paid_at) as month, SUM(amount) as value FROM payments WHERE user_id = ? GROUP BY month
        UNION ALL
        SELECT strftime('%Y-%m', d.paid_at) as month, SUM(d.deal_value) as value FROM deals d
        WHERE d.user_id = ? AND d.status = 'paid' AND d.deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.deal_id = d.id AND i.status = 'paid' AND i.deleted_at IS NULL)
      ) GROUP BY month ORDER BY month DESC LIMIT ?`, [1, 1, 12]],
    quarterly: [`SELECT CAST((CAST(strftime('%m', paid_at) AS INTEGER) - 1) / 3.0 AS INTEGER) + 1 as quarter, strftime('%Y', paid_at) as year,
        COALESCE(SUM(amount), 0) as value FROM payments WHERE user_id = ? AND paid_at IS NOT NULL GROUP BY year, quarter ORDER BY year DESC, quarter DESC LIMIT 8`, [1]],
    byBrand: [`SELECT b.name, b.logo_emoji, COALESCE(SUM(p.amount), 0) as value, COUNT(p.id) as payments
        FROM payments p JOIN invoices i ON p.invoice_id = i.id LEFT JOIN deals d ON i.deal_id = d.id
        LEFT JOIN brands b ON d.brand_id = b.id
        WHERE p.user_id = ? GROUP BY b.name HAVING b.name IS NOT NULL ORDER BY value DESC LIMIT 10`, [1]],
    byPlatform: [`SELECT d.platform, COALESCE(SUM(p.amount), 0) as value
        FROM payments p JOIN invoices i ON p.invoice_id = i.id JOIN deals d ON i.deal_id = d.id
        WHERE p.user_id = ? GROUP BY d.platform ORDER BY value DESC`, [1]],
  };
  for (const [name, [sql, params]] of Object.entries(queries)) {
    try { console.log(name, 'OK', JSON.stringify(await q(sql, params))); } catch (e) { console.log(name, 'ERR', e.message); }
  }
  for (const table of ['templates', 'communications', 'quick_notes', 'services']) {
    try { await q(`SELECT created_by FROM ${table} LIMIT 1`); console.log(table, 'has created_by'); } catch { console.log(table, 'MISSING created_by'); }
  }
  db.close();
})();
