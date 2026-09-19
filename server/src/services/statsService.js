/**
 * Analytics service — dashboard overview, revenue analytics and forecasting.
 * All figures come from real database rows; revenue is anchored to actual
 * recorded payments, falling back to paid deals that never had a paid invoice
 * (legacy / off-platform deals) so nothing silently disappears.
 */
const { all, get } = require('../database/db');

/** Paid deals with no paid invoice — revenue captured outside Collabio invoicing. */
async function legacyRevenue(userId, sinceSql = '', params = []) {
  const row = await get(
    `SELECT COALESCE(SUM(d.deal_value), 0) as value FROM deals d
     WHERE d.user_id = ? AND d.status = 'paid' AND d.deleted_at IS NULL
     AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.deal_id = d.id AND i.status = 'paid' AND i.deleted_at IS NULL)
     ${sinceSql}`,
    [userId, ...params]
  );
  return row.value || 0;
}

/** Monthly revenue series: payments + legacy paid deals, last N months. */
async function monthlyRevenueSeries(userId, months = 6) {
  const rows = await all(
    `SELECT month, COALESCE(SUM(value), 0) as value FROM (
       SELECT strftime('%Y-%m', paid_at) as month, SUM(amount) as value FROM payments WHERE user_id = ? GROUP BY month
       UNION ALL
       SELECT strftime('%Y-%m', d.paid_at) as month, SUM(d.deal_value) as value FROM deals d
       WHERE d.user_id = ? AND d.status = 'paid' AND d.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.deal_id = d.id AND i.status = 'paid' AND i.deleted_at IS NULL)
     ) WHERE month IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT ?`,
    [userId, userId, months]
  );
  return rows.reverse();
}

async function overview(userId) {
  const [paymentRevenue, thisMonthPayments, thisYearPayments] = await Promise.all([
    get(`SELECT COALESCE(SUM(amount), 0) as value FROM payments WHERE user_id = ?`, [userId]),
    get(`SELECT COALESCE(SUM(amount), 0) as value FROM payments WHERE user_id = ? AND strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')`, [userId]),
    get(`SELECT COALESCE(SUM(amount), 0) as value FROM payments WHERE user_id = ? AND strftime('%Y', paid_at) = strftime('%Y', 'now')`, [userId]),
  ]);
  const [legacyTotal, legacyMonth, legacyYear] = await Promise.all([
    legacyRevenue(userId),
    legacyRevenue(userId, `AND strftime('%Y-%m', d.paid_at) = strftime('%Y-%m', 'now')`),
    legacyRevenue(userId, `AND strftime('%Y', d.paid_at) = strftime('%Y', 'now')`),
  ]);

  const pipelineValue = await get(
    `SELECT COALESCE(SUM(deal_value), 0) as value FROM deals
     WHERE user_id = ? AND deleted_at IS NULL AND status IN ('outreach', 'negotiating', 'contract_sent', 'active', 'in_review', 'published')`,
    [userId]
  );
  const weightedPipeline = await get(
    `SELECT COALESCE(SUM(deal_value * probability / 100.0), 0) as value FROM deals
     WHERE user_id = ? AND deleted_at IS NULL AND status NOT IN ('paid', 'archived')`,
    [userId]
  );
  const outstanding = await get(
    `SELECT COALESCE(SUM(total_amount - amount_paid), 0) as value FROM invoices
     WHERE user_id = ? AND deleted_at IS NULL AND status IN ('sent', 'viewed', 'partially_paid', 'overdue')`,
    [userId]
  );
  const overdueInvoices = await get(
    `SELECT COUNT(*) as count, COALESCE(SUM(total_amount - amount_paid), 0) as value FROM invoices
     WHERE user_id = ? AND deleted_at IS NULL AND (status = 'overdue' OR (due_date IS NOT NULL AND due_date < date('now') AND status IN ('sent', 'viewed')))`,
    [userId]
  );

  const byStatus = await all(
    `SELECT status, COUNT(*) as count, COALESCE(SUM(deal_value), 0) as value FROM deals
     WHERE user_id = ? AND deleted_at IS NULL GROUP BY status`,
    [userId]
  );
  const byPlatform = await all(
    `SELECT platform, COUNT(*) as count, COALESCE(SUM(deal_value), 0) as value FROM deals
     WHERE user_id = ? AND deleted_at IS NULL GROUP BY platform ORDER BY value DESC`,
    [userId]
  );

  const upcoming = await all(
    `SELECT id, title, brand_name, platform, deadline, deal_value, status, priority FROM deals
     WHERE user_id = ? AND deleted_at IS NULL AND deadline IS NOT NULL
     AND deadline >= date('now') AND deadline <= date('now', '+30 days') AND status NOT IN ('paid', 'archived')
     ORDER BY deadline ASC LIMIT 5`,
    [userId]
  );
  const overdue = await all(
    `SELECT id, title, brand_name, platform, deadline, deal_value, status FROM deals
     WHERE user_id = ? AND deleted_at IS NULL AND deadline < date('now') AND status NOT IN ('paid', 'invoiced', 'archived')
     ORDER BY deadline ASC LIMIT 10`,
    [userId]
  );
  const totalDeals = await get('SELECT COUNT(*) as count FROM deals WHERE user_id = ? AND deleted_at IS NULL', [userId]);

  return {
    totalEarned: (paymentRevenue.value || 0) + legacyTotal,
    thisMonth: (thisMonthPayments.value || 0) + legacyMonth,
    thisYear: (thisYearPayments.value || 0) + legacyYear,
    pipelineValue: pipelineValue.value || 0,
    weightedPipeline: weightedPipeline.value || 0,
    outstanding: outstanding.value || 0,
    overdueInvoices: { count: overdueInvoices.count, value: overdueInvoices.value },
    totalDeals: totalDeals.count,
    byStatus, byPlatform,
    monthlyRevenue: await monthlyRevenueSeries(userId, 6),
    upcoming, overdue,
  };
}

async function revenueAnalytics(userId, { months = 12 } = {}) {
  const monthly = await all(
    `SELECT month, COALESCE(SUM(value), 0) as value FROM (
       SELECT strftime('%Y-%m', paid_at) as month, SUM(amount) as value FROM payments WHERE user_id = ? GROUP BY month
       UNION ALL
       SELECT strftime('%Y-%m', d.paid_at) as month, SUM(d.deal_value) as value FROM deals d
       WHERE d.user_id = ? AND d.status = 'paid' AND d.deleted_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.deal_id = d.id AND i.status = 'paid' AND i.deleted_at IS NULL)
     ) WHERE month IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT ?`,
    [userId, userId, months]
  );

  // SQLite does integer division on (m-1)/3 — cast to REAL first (was a syntax error).
  const quarterly = await all(
    `SELECT CAST((CAST(strftime('%m', paid_at) AS INTEGER) - 1) / 3.0 AS INTEGER) + 1 as quarter, strftime('%Y', paid_at) as year,
            COALESCE(SUM(amount), 0) as value
     FROM payments WHERE user_id = ? AND paid_at IS NOT NULL GROUP BY year, quarter ORDER BY year DESC, quarter DESC LIMIT 8`,
    [userId]
  );
  const yearly = await all(
    `SELECT strftime('%Y', paid_at) as year, COALESCE(SUM(amount), 0) as value
     FROM payments WHERE user_id = ? GROUP BY year ORDER BY year DESC LIMIT 5`,
    [userId]
  );
  const byBrand = await all(
    `SELECT b.name, b.logo_emoji, COALESCE(SUM(p.amount), 0) as value, COUNT(p.id) as payments
     FROM payments p JOIN invoices i ON p.invoice_id = i.id LEFT JOIN deals d ON i.deal_id = d.id
     LEFT JOIN brands b ON d.brand_id = b.id
     WHERE p.user_id = ? GROUP BY b.name HAVING b.name IS NOT NULL ORDER BY value DESC LIMIT 10`,
    [userId]
  );
  const byPlatform = await all(
    `SELECT d.platform, COALESCE(SUM(p.amount), 0) as value
     FROM payments p JOIN invoices i ON p.invoice_id = i.id JOIN deals d ON i.deal_id = d.id
     WHERE p.user_id = ? GROUP BY d.platform HAVING d.platform IS NOT NULL ORDER BY value DESC`,
    [userId]
  );

  const avgDealValue = await get(
    `SELECT COALESCE(AVG(deal_value), 0) as value FROM deals WHERE user_id = ? AND deleted_at IS NULL AND deal_value > 0`,
    [userId]
  );
  const conversion = await get(
    `SELECT
       (SELECT COUNT(*) FROM deals WHERE user_id = ? AND deleted_at IS NULL AND status IN ('paid', 'invoiced', 'published', 'active', 'in_review')) as won,
       (SELECT COUNT(*) FROM deals WHERE user_id = ? AND deleted_at IS NULL) as total`,
    [userId, userId]
  );
  const outstanding = await get(
    `SELECT COALESCE(SUM(total_amount - amount_paid), 0) as value FROM invoices
     WHERE user_id = ? AND deleted_at IS NULL AND status IN ('sent', 'viewed', 'partially_paid', 'overdue')`,
    [userId]
  );

  return {
    monthly: monthly.reverse(),
    quarterly, yearly, byBrand, byPlatform,
    averageDealValue: avgDealValue.value || 0,
    conversionRate: conversion.total > 0 ? Math.round((conversion.won / conversion.total) * 100) : 0,
    outstanding: outstanding.value || 0,
  };
}

/**
 * Explainable revenue forecast (an ESTIMATE, never guaranteed revenue):
 *   weighted_pipeline_value       = Σ deal_value × probability
 *   × historical conversion rate  (won ÷ all late-stage + open deals)
 *   + expected_collections        = outstanding invoices (30-day window)
 */
async function forecast(userId) {
  const weighted = await get(
    `SELECT COALESCE(SUM(deal_value * probability / 100.0), 0) as value FROM deals
     WHERE user_id = ? AND deleted_at IS NULL AND status NOT IN ('paid', 'archived')`,
    [userId]
  );
  const conversion = await get(
    `SELECT
       (SELECT COUNT(*) FROM deals WHERE user_id = ? AND deleted_at IS NULL AND status IN ('paid', 'invoiced', 'published', 'active', 'in_review')) as won,
       (SELECT COUNT(*) FROM deals WHERE user_id = ? AND deleted_at IS NULL AND status IN ('outreach', 'negotiating', 'contract_sent')) as total`,
    [userId, userId]
  );
  const historicalRate = conversion.total + conversion.won > 0 ? conversion.won / (conversion.total + conversion.won) : 0.3;
  const outstanding = await get(
    `SELECT COALESCE(SUM(total_amount - amount_paid), 0) as value FROM invoices
     WHERE user_id = ? AND deleted_at IS NULL AND status IN ('sent', 'viewed', 'partially_paid', 'overdue')`,
    [userId]
  );
  const next30 = await get(
    `SELECT COALESCE(SUM(total_amount - amount_paid), 0) as value FROM invoices
     WHERE user_id = ? AND deleted_at IS NULL AND status IN ('sent', 'viewed', 'partially_paid', 'overdue')
     AND (due_date IS NULL OR due_date <= date('now', '+30 days'))`,
    [userId]
  );

  const adjustedPipeline = Math.round(weighted.value * Math.max(0.1, historicalRate) * 100) / 100;
  return {
    estimate_only: true,
    disclaimer: 'Forecasts are estimates based on weighted pipeline value, historical conversion and expected payment dates. They are not guaranteed revenue.',
    weightedPipeline: weighted.value || 0,
    historicalConversionRate: Math.round(historicalRate * 100),
    adjustedPipeline,
    expectedCollections: outstanding.value || 0,
    expectedCollectionsNext30Days: next30.value || 0,
    forecastRange90Days: Math.round((adjustedPipeline + (next30.value || 0)) * 100) / 100,
  };
}

module.exports = { overview, revenueAnalytics, forecast, monthlyRevenueSeries };
