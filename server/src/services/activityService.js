/**
 * Activity / audit service.
 * Records WHO did WHAT, WHEN, from which entity state — and fans out
 * realtime events. Recording failures never break the parent operation.
 */
const { run, get, all } = require('../database/db');
const { emit, EVENTS } = require('../events/bus');

/**
 * @param {object} p
 * @param {number} p.userId
 * @param {string} p.action        e.g. 'deal.created', 'auth.login', 'invoice.payment'
 * @param {string} [p.entityType]  e.g. 'deal'
 * @param {number} [p.entityId]
 * @param {string} [p.entityLabel] human readable name
 * @param {object} [p.details]     JSON-safe diff/details (scrubbed upstream)
 * @param {string} [p.ip]
 */
async function log({ userId, action, entityType, entityId, entityLabel, details, ip }) {
  try {
    const result = await run(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label, details, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType || null, entityId || null, entityLabel || null, details ? JSON.stringify(details) : null, ip || null]
    );
    const entry = await get('SELECT * FROM activity_log WHERE id = ?', [result.lastID]);
    if (entry) emit(EVENTS.ACTIVITY_LOGGED, { userId, activity: { ...entry, details: details || null } });
    return entry;
  } catch (err) {
    console.error('[activity] failed to record audit entry:', err.message);
    return null;
  }
}

/** Cursor-paginated audit feed (WHO / WHAT / WHEN / FROM / TO). */
async function list(userId, { cursor, limit = 50, entity_type, entity_id, action }) {
  const params = [userId];
  let where = 'user_id = ?';
  if (entity_type) { where += ' AND entity_type = ?'; params.push(entity_type); }
  if (entity_id) { where += ' AND entity_id = ?'; params.push(entity_id); }
  if (action) { where += ' AND action LIKE ?'; params.push(`${action}%`); }
  if (cursor) { where += ' AND id < ?'; params.push(cursor); }

  const rows = await all(
    `SELECT * FROM activity_log WHERE ${where} ORDER BY id DESC LIMIT ?`,
    [...params, limit + 1]
  );
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: items.map((r) => ({ ...r, details: r.details ? JSON.parse(r.details) : null })),
    next_cursor: hasMore ? items[items.length - 1].id : null,
  };
}

/** Deal timeline = deal-scoped audit entries + notes, merged chronologically. */
async function dealTimeline(userId, dealId) {
  const activities = await all(
    `SELECT id, action, entity_type, entity_label, details, created_at FROM activity_log
     WHERE user_id = ? AND entity_type = 'deal' AND entity_id = ?
     ORDER BY id DESC LIMIT 200`,
    [userId, dealId]
  );
  const notes = await all(
    `SELECT id, content, created_at FROM deal_notes WHERE deal_id = ? ORDER BY created_at DESC`,
    [dealId]
  );
  const comms = await all(
    `SELECT id, channel, direction, summary, occurred_at, created_at FROM communications WHERE deal_id = ? ORDER BY created_at DESC`,
    [dealId]
  );
  const timeline = [
    ...activities.map((a) => ({ kind: 'activity', id: `a${a.id}`, action: a.action, label: a.entity_label, details: a.details ? JSON.parse(a.details) : null, at: a.created_at })),
    ...notes.map((n) => ({ kind: 'comment', id: `n${n.id}`, content: n.content, at: n.created_at })),
    ...comms.map((c) => ({ kind: 'communication', id: `c${c.id}`, channel: c.channel, direction: c.direction, summary: c.summary, at: c.occurred_at || c.created_at })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));
  return timeline;
}

module.exports = { log, list, dealTimeline };
