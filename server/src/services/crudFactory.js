/**
 * Reusable CRUD service factory for simple owned entities.
 * Enforces user scoping on every query (multi-tenant safety), soft
 * deletion when the table supports it, audit logging and realtime events.
 */
const { run, get, all } = require('../database/db');
const { NotFoundError } = require('../utils/AppError');
const activityService = require('./activityService');
const { emit, EVENTS } = require('../events/bus');

function safeColumns(columns) {
  // Only real column names are ever interpolated; values are always bound.
  return columns.filter((c) => /^[a-z_][a-z0-9_]*$/.test(c));
}

function encodeJsonFields(spec, data) {
  const out = { ...data };
  for (const field of spec.jsonFields || []) {
    if (out[field] !== undefined && out[field] !== null) {
      out[field] = JSON.stringify(out[field]);
    }
  }
  return out;
}

function decodeJsonFields(spec, row) {
  if (!row) return row;
  const out = { ...row };
  for (const field of spec.jsonFields || []) {
    try { out[field] = out[field] ? JSON.parse(out[field]) : null; } catch { out[field] = null; }
  }
  return out;
}

/**
 * @param {object} spec
 * @param {string} spec.table              table name
 * @param {string} spec.label              human entity label
 * @param {string[]} spec.fields           mutable columns
 * @param {string[]} [spec.searchColumns]  LIKE-searchable columns
 * @param {string} [spec.eventName]        bus event for realtime updates
 * @param {boolean} [spec.softDelete]      table has deleted_at (default true)
 * @param {string} [spec.orderBy]          default ORDER BY
 */
function createCrudService(spec) {
  const { table, label, fields, searchColumns = [], eventName, softDelete = true, orderBy = 'created_at DESC' } = spec;
  const columns = safeColumns(fields);

  async function list(userId, { search, page = 1, limit = 200, filters = {} } = {}) {
    const params = [userId];
    let where = 'user_id = ?';
    if (softDelete) where += ' AND deleted_at IS NULL';
    if (search && searchColumns.length) {
      const term = `%${search.replace(/[%_]/g, '')}%`;
      where += ` AND (${searchColumns.map((c) => `${c} LIKE ?`).join(' OR ')})`;
      for (let i = 0; i < searchColumns.length; i += 1) params.push(term);
    }
    for (const [col, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;
      where += ` AND ${col} = ?`;
      params.push(value);
    }
    const count = await get(`SELECT COUNT(*) as count FROM ${table} WHERE ${where}`, params);
    const items = (await all(
      `SELECT * FROM ${table} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    )).map((r) => decodeJsonFields(spec, r));
    return { items, meta: { page, limit, total: count.count, total_pages: Math.max(1, Math.ceil(count.count / limit)) } };
  }

  async function getById(userId, id) {
    const row = decodeJsonFields(spec, await get(`SELECT * FROM ${table} WHERE id = ? AND user_id = ?${softDelete ? ' AND deleted_at IS NULL' : ''}`, [id, userId]));
    if (!row) throw new NotFoundError(label);
    return row;
  }

  async function create(userId, data, ip) {
    const dataEnc = encodeJsonFields(spec, data);
    const cols = ['user_id', ...columns, 'created_by', 'updated_by'];
    const values = [userId, ...columns.map((c) => (dataEnc[c] === undefined ? null : dataEnc[c])), userId, userId];
    const result = await run(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      values
    );
    const row = await getById(userId, result.lastID);
    await activityService.log({ userId, action: `${label}.created`, entityType: label, entityId: row.id, entityLabel: row.name || row.title || String(row.id), ip });
    if (eventName) emit(eventName, { userId, [label]: row });
    return row;
  }

  async function update(userId, id, data, ip) {
    const existing = await getById(userId, id);
    const dataEnc = encodeJsonFields(spec, data);
    const updates = [];
    const params = [];
    for (const col of columns) {
      if (dataEnc[col] !== undefined) { updates.push(`${col} = ?`); params.push(dataEnc[col] === undefined ? null : dataEnc[col]); }
    }
    if (updates.length === 0) return existing;
    updates.push('updated_at = CURRENT_TIMESTAMP', 'updated_by = ?');
    params.push(userId, id, userId);
    await run(`UPDATE ${table} SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, params);
    const row = await getById(userId, id);
    await activityService.log({ userId, action: `${label}.updated`, entityType: label, entityId: id, entityLabel: row.name || row.title || String(id), details: { fields: updates.filter((u) => !u.includes('updated')).length }, ip });
    if (eventName) emit(eventName, { userId, [label]: row });
    return row;
  }

  async function remove(userId, id, ip) {
    const existing = await getById(userId, id);
    if (softDelete) {
      await run(`UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`, [id, userId]);
    } else {
      await run(`DELETE FROM ${table} WHERE id = ? AND user_id = ?`, [id, userId]);
    }
    await activityService.log({ userId, action: `${label}.deleted`, entityType: label, entityId: id, entityLabel: existing.name || existing.title || String(id), ip });
    if (eventName) emit(eventName, { userId, deletedId: id });
    return { id };
  }

  return { list, getById, create, update, remove, table, label };
}

module.exports = { createCrudService };
