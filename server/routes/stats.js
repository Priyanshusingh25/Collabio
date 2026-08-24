const express = require('express');
const router = express.Router();
const { all, get } = require('../db/database');
const { requireAuth } = require('./auth');

// GET dashboard stats
router.get('/overview', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // Total earnings (all time)
    const totalEarned = await get(
      "SELECT COALESCE(SUM(deal_value), 0) as value FROM deals WHERE user_id = ? AND status = 'paid'",
      [userId]
    );

    // This month earnings
    const thisMonth = await get(
      `SELECT COALESCE(SUM(deal_value), 0) as value FROM deals
       WHERE user_id = ? AND status = 'paid'
       AND strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')`,
      [userId]
    );

    // This year earnings
    const thisYear = await get(
      `SELECT COALESCE(SUM(deal_value), 0) as value FROM deals
       WHERE user_id = ? AND status = 'paid'
       AND strftime('%Y', paid_at) = strftime('%Y', 'now')`,
      [userId]
    );

    // Pipeline value (active + negotiating + contract sent)
    const pipelineValue = await get(
      `SELECT COALESCE(SUM(deal_value), 0) as value FROM deals
       WHERE user_id = ? AND status IN ('outreach', 'negotiating', 'contract_sent', 'active')`,
      [userId]
    );

    // Outstanding invoices
    const outstanding = await get(
      `SELECT COALESCE(SUM(deal_value), 0) as value FROM deals
       WHERE user_id = ? AND status = 'invoiced'`,
      [userId]
    );

    // Deals count by status
    const byStatus = await all(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(deal_value), 0) as value
       FROM deals WHERE user_id = ? GROUP BY status`,
      [userId]
    );

    // Deals by platform
    const byPlatform = await all(
      `SELECT platform, COUNT(*) as count, COALESCE(SUM(deal_value), 0) as value
       FROM deals WHERE user_id = ? GROUP BY platform ORDER BY value DESC`,
      [userId]
    );

    // Monthly revenue (last 6 months)
    const monthlyRevenue = await all(
      `SELECT strftime('%Y-%m', COALESCE(paid_at, created_at)) as month,
              COALESCE(SUM(deal_value), 0) as value
       FROM deals WHERE user_id = ? AND status = 'paid'
       GROUP BY month ORDER BY month DESC LIMIT 6`,
      [userId]
    );

    // Upcoming deadlines (next 30 days)
    const upcoming = await all(
      `SELECT id, title, brand_name, platform, deadline, deal_value, status, priority
       FROM deals WHERE user_id = ?
       AND deadline IS NOT NULL
       AND deadline >= date('now')
       AND deadline <= date('now', '+30 days')
       AND status NOT IN ('paid', 'archived')
       ORDER BY deadline ASC LIMIT 5`,
      [userId]
    );

    // Overdue deals
    const overdue = await all(
      `SELECT id, title, brand_name, platform, deadline, deal_value, status
       FROM deals WHERE user_id = ?
       AND deadline < date('now')
       AND status NOT IN ('paid', 'invoiced', 'archived')
       ORDER BY deadline ASC`,
      [userId]
    );

    // Total deal count
    const totalDeals = await get('SELECT COUNT(*) as count FROM deals WHERE user_id = ?', [userId]);

    res.json({
      totalEarned: totalEarned.value,
      thisMonth: thisMonth.value,
      thisYear: thisYear.value,
      pipelineValue: pipelineValue.value,
      outstanding: outstanding.value,
      totalDeals: totalDeals.count,
      byStatus,
      byPlatform,
      monthlyRevenue: monthlyRevenue.reverse(),
      upcoming,
      overdue
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
