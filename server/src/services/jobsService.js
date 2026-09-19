/**
 * Scheduled jobs — follow-up automation, deadline reminders, invoice aging.
 * Runs on a 6-hour interval plus at startup. Job state is persisted in
 * `job_state` so restarts do not re-send duplicate notifications.
 */
const { run, get, all } = require('../database/db');
const notificationService = require('./notificationService');
const invoiceService = require('./invoiceService');
const logger = require('../utils/logger');

const JOB_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function shouldRun(jobId, minGapMs) {
  const state = await get('SELECT last_run_at FROM job_state WHERE id = ?', [jobId]);
  if (!state?.last_run_at) return true;
  return Date.now() - new Date(state.last_run_at).getTime() >= minGapMs;
}

async function markRun(jobId) {
  await run(
    `INSERT INTO job_state (id, last_run_at) VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET last_run_at = excluded.last_run_at`,
    [jobId, new Date().toISOString()]
  );
}

/** Has a notification for this exact key been sent within `dedupeHours`? */
async function recentlyNotified(userId, category, title, dedupeHours = 20) {
  const row = await get(
    `SELECT id FROM notifications WHERE user_id = ? AND category = ? AND title = ? AND created_at >= datetime('now', ?)`,
    [userId, category, title, `-${dedupeHours} hours`]
  );
  return Boolean(row);
}

async function deadlineReminders(userId) {
  const deals = await all(
    `SELECT id, title, brand_name, deadline FROM deals
     WHERE user_id = ? AND deleted_at IS NULL AND deadline IS NOT NULL
     AND status NOT IN ('paid', 'archived')
     AND deadline BETWEEN date('now') AND date('now', '+3 days')`,
    [userId]
  );
  for (const deal of deals) {
    const title = `Deadline approaching — ${deal.brand_name}`;
    if (await recentlyNotified(userId, 'deadline', title)) continue;
    await notificationService.create(userId, {
      category: 'deadline', title,
      message: `"${deal.title}" is due on ${deal.deadline}`,
      entity_type: 'deal', entity_id: deal.id,
    });
  }
}

/** Follow-up automation: nudge deals with no recent communication. */
async function followUps(userId) {
  const prefs = await get('SELECT followup_rules FROM user_preferences WHERE user_id = ?', [userId]);
  let rules = { enabled: true, days: [3, 7, 14] };
  if (prefs?.followup_rules) {
    try {
      const parsed = JSON.parse(prefs.followup_rules);
      rules = { enabled: parsed.enabled !== false, days: parsed.days?.length ? parsed.days : rules.days };
    } catch { /* defaults */ }
  }
  if (!rules.enabled) return;

  for (const days of rules.days) {
    const staleDeals = await all(
      `SELECT d.id, d.title, d.brand_name, d.status FROM deals d
       WHERE d.user_id = ? AND d.deleted_at IS NULL
       AND d.status IN ('outreach', 'negotiating', 'contract_sent', 'active')
       AND (d.updated_at <= datetime('now', ?))
       AND NOT EXISTS (
         SELECT 1 FROM communications c
         WHERE c.deal_id = d.id AND COALESCE(c.occurred_at, c.created_at) >= datetime('now', ?)
       )
       LIMIT 20`,
      [userId, `-${days} days`, `-${days} days`]
    );
    for (const deal of staleDeals) {
      const title = `Follow up (${days}d) — ${deal.brand_name}`;
      // Dedupe window spans the whole rule gap so each rule fires once per cycle.
      if (await recentlyNotified(userId, 'follow_up', title, days * 24 + 48)) continue;
      await notificationService.create(userId, {
        category: 'follow_up', title,
        message: `No logged communication on "${deal.title}" in ${days} days`,
        entity_type: 'deal', entity_id: deal.id,
      });
    }
  }
}

async function overdueInvoiceAlerts(userId) {
  const changed = await invoiceService.refreshOverdue(userId);
  if (changed > 0) {
    await notificationService.create(userId, {
      category: 'invoice',
      title: `${changed} invoice${changed !== 1 ? 's are' : ' is'} now overdue`,
      message: 'Open the Invoices page to review outstanding payments.',
      entity_type: 'invoice',
    });
  }
}

async function taskReminders(userId) {
  const tasks = await all(
    `SELECT id, title, due_date FROM tasks
     WHERE user_id = ? AND deleted_at IS NULL AND status IN ('todo', 'in_progress')
     AND due_date IS NOT NULL AND due_date BETWEEN date('now') AND date('now', '+1 day')`,
    [userId]
  );
  for (const task of tasks) {
    const title = `Task due — ${task.title}`;
    if (await recentlyNotified(userId, 'task', title)) continue;
    await notificationService.create(userId, {
      category: 'task', title,
      message: task.due_date ? `Due on ${task.due_date}` : 'Due soon',
      entity_type: 'task', entity_id: task.id,
    });
  }
}

/** Run all periodic jobs for every user. Failures are logged, never fatal. */
async function runAllJobs() {
  if (!(await shouldRun('scheduler', JOB_INTERVAL_MS - 60_000))) return;
  logger.info('jobs:tick');
  try {
    const users = await all('SELECT id FROM users');
    for (const user of users) {
      await overdueInvoiceAlerts(user.id).catch((e) => logger.error('job:overdue_invoices', { error: e.message }));
      await deadlineReminders(user.id).catch((e) => logger.error('job:deadlines', { error: e.message }));
      await followUps(user.id).catch((e) => logger.error('job:followups', { error: e.message }));
      await taskReminders(user.id).catch((e) => logger.error('job:tasks', { error: e.message }));
    }
    await markRun('scheduler');
  } catch (err) {
    logger.error('jobs:tick_failed', { error: err.message });
  }
}

function startScheduler() {
  setInterval(runAllJobs, 15 * 60 * 1000).unref();
  setTimeout(runAllJobs, 15_000); // first run shortly after boot
}

module.exports = { runAllJobs, startScheduler, deadlineReminders, followUps, overdueInvoiceAlerts, taskReminders };
