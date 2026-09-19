/**
 * Promisified SQLite data-access layer with transaction support.
 * This is the ONLY module that touches the sqlite3 driver directly,
 * which keeps the persistence layer swappable (e.g. PostgreSQL later).
 */
const sqlite3 = require('sqlite3');
const env = require('../config/env');

let db = null;

function open() {
  if (db) return db;
  db = new sqlite3.Database(env.dbPath, (err) => {
    if (err) {
      console.error('[db] Failed to open database:', err.message);
      process.exit(1);
    }
  });
  return db;
}

function getDb() {
  if (!db) open();
  return db;
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

/** Execute `fn(run, get, all)` inside BEGIN IMMEDIATE / COMMIT / ROLLBACK. */
async function withTransaction(fn) {
  await run('BEGIN IMMEDIATE');
  try {
    const result = await fn(run, get, all);
    await run('COMMIT');
    return result;
  } catch (err) {
    try { await run('ROLLBACK'); } catch { /* already rolled back */ }
    throw err;
  }
}

/** Run a batch of DDL statements (used by migrations / seeding). */
async function exec(sql) {
  return new Promise((resolve, reject) => {
    getDb().exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

/** Close the underlying handle (graceful shutdown, tests, CLI). */
function close() {
  return new Promise((resolve, reject) => {
    if (!db) return resolve();
    db.close((err) => {
      db = null;
      return err ? reject(err) : resolve();
    });
  });
}

module.exports = { open, getDb, run, get, all, exec, withTransaction, close };
