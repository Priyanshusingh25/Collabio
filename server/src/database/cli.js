#!/usr/bin/env node
/**
 * Database CLI — migrations and seeding without booting the API.
 *
 *   node server/src/database/cli.js migrate
 *   node server/src/database/cli.js seed          # demo account only if missing
 *   node server/src/database/cli.js seed --fresh  # create demo account + starter data
 *   node server/src/database/cli.js reset         # DESTRUCTIVE: drop + recreate + seed
 *   node server/src/database/cli.js status
 */
const env = require('../config/env');
const { open, run, all, close } = require('./db');
const { createBaseTables } = require('./schema');
const { runMigrations } = require('./migrations');
const seedModule = require('./seed');

const command = (process.argv[2] || 'help').toLowerCase();
const flags = new Set(process.argv.slice(3));
const FRESH = flags.has('--fresh') || flags.has('-f');

async function reset() {
  const tables = await all(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`
  );
  await run('PRAGMA foreign_keys = OFF');
  for (const { name } of tables) {
    if (name === '_migrations') continue;
    await run(`DROP TABLE IF EXISTS "${name}"`);
  }
  await run(`DROP TABLE IF EXISTS _migrations`);
  await run('PRAGMA foreign_keys = ON');
  console.log(`[db] dropped ${tables.length} tables`);
}

async function status() {
  const migrations = await all('SELECT id, name, applied_at FROM _migrations ORDER BY id');
  const tables = await all(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
  );
  const counts = {};
  for (const { name } of tables) {
    const row = await all(`SELECT COUNT(*) AS c FROM "${name}"`).catch(() => [{ c: 'n/a' }]);
    counts[name] = row[0]?.c ?? 0;
  }
  console.log(`[db] path: ${env.dbPath}`);
  console.log(`[db] migrations applied: ${migrations.length}`);
  migrations.forEach((m) => console.log(`      ${m.id} ${m.name} (${m.applied_at})`));
  console.log('[db] table row counts:');
  Object.entries(counts).forEach(([t, c]) => console.log(`      ${t.padEnd(24)} ${c}`));
}

(async () => {
  try {
    open();

    if (command === 'help') {
      console.log(`Collabio database CLI

Usage: node server/src/database/cli.js <command>

Commands:
  migrate   Apply pending schema migrations (safe, idempotent)
  seed      Ensure the demo workspace exists (add --fresh for starter data)
  reset     DESTRUCTIVE — drop all tables, re-migrate and seed
  status    Show applied migrations and row counts
`);
      close();
      return;
    }

    if (command === 'reset') await reset();

    if (command === 'migrate' || command === 'seed' || command === 'reset') {
      await createBaseTables();
      await runMigrations();
    }

    if (command === 'seed' || command === 'reset') {
      const userId = await seedModule.seedDemoUserIfMissing();
      if (userId && (FRESH || command === 'reset')) {
        await seedModule.seedStarterData(userId);
      }
      console.log('[db] seed complete');
    }

    if (command === 'status') await status();

    close();
  } catch (err) {
    console.error('[db] CLI failed:', err.message);
    process.exitCode = 1;
    try { close(); } catch { /* noop */ }
  }
})();