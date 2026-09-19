/**
 * Notification center service.
 * Creates in-app notifications (realtime via bus) and reads them back
 * with cursor pagination. Category filtering respects user preferences.
 */
const { run, get, all } = require('../database/db');
const { emit, EVENTS } = require('../events/bus');

const CATEGORIES = Object.freeze(['deal', 'invoice', 'payment', 'task', 'deadline', 'follow_up', 'system']);

async function create(userId, { category, title, message, entity_type, entity_id }) {
  const prefs = await get('SELECT notification_prefs FROM user_preferences WHERE user_id = ?', [userId]);
  if (prefs?.notification_prefs) {
    try {
      const parsed = JSON.parse(prefs.notification_prefs);
      if (parsed[category] === false) return null; // user opted out of this category
    } catch { /* malformed prefs — deliver anyway */ }
  }

  const result = await run(
    `INSERT INTO notifications (user_id, category, title, message, entity_type, entity_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, category, title, message || null, entity_type || null, entity_id || null]
  );
  const notification = await get('SELECT * FROM notifications WHERE id = ?', [result.lastID]);
  emit(EVENTS.NOTIFICATION_CREATED, { userId, notification });
  return notification;
}

async function list(userId, { cursor, limit = 30, unread_only = false, category }) {
  const params = [userId];
  let where = 'user_id = ?';
  if (unread_only) where += ' AND is_read = 0';
  if (category && CATEGORIES.includes(category)) { where += ' AND category = ?'; params.push(category); }
  if (cursor) { where += ' AND id < ?'; params.push(cursor); }

  const rows = await all(
    `SELECT * FROM notifications WHERE ${where} ORDER BY id DESC LIMIT ?`,
    [...params, limit + 1]
  );
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, next_cursor: hasMore ? items[items.length - 1].id : null };
}

async function unreadCount(userId) {
  const row = await get('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
  return row.count;
}

async function markRead(userId, id) {
  const result = await run(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.changes > 0;
}

async function markAllRead(userId) {
  const result = await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  return result.changes;
}

module.exports = { create, list, unreadCount, markRead, markAllRead, CATEGORIES };
