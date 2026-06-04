const express = require('express');
const router = express.Router();
const db = require('../db/db');

router.get('/summary', async (req, res) => {
  try {
    const uid = req.user.id;
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const last12 = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return d.toISOString().slice(0, 7);
    }).reverse();

    const monthlyData = await Promise.all(last12.map(async month => {
      const income = await db.get(
        `SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE user_id=$1 AND to_char(date,'YYYY-MM')=$2 AND amount>0 AND is_duplicate=FALSE`,
        [uid, month]
      );
      const expenses = await db.get(
        `SELECT COALESCE(SUM(ABS(amount)),0) as total FROM transactions WHERE user_id=$1 AND to_char(date,'YYYY-MM')=$2 AND amount<0 AND is_duplicate=FALSE`,
        [uid, month]
      );
      return { month, income: r2(income.total), expenses: r2(expenses.total) };
    }));

    const categoryBreakdown = await db.all(
      `SELECT c.name, c.emoji, c.color, COALESCE(SUM(ABS(t.amount)),0) as total
       FROM transactions t JOIN categories c ON c.id=t.category_id
       WHERE t.user_id=$1 AND to_char(t.date,'YYYY-MM')=$2 AND t.amount<0 AND t.is_duplicate=FALSE
       GROUP BY c.name,c.emoji,c.color ORDER BY total DESC LIMIT 8`,
      [uid, thisMonth]
    );

    const goal = await db.get(`SELECT * FROM budget_goals WHERE user_id=$1 AND month=$2`, [uid, thisMonth]);
    const taxSettings = await db.get(`SELECT * FROM tax_settings WHERE user_id=$1`, [uid]);

    const cashFlow = await db.get(
      `SELECT COALESCE(SUM(CASE WHEN amount>0 THEN amount ELSE 0 END),0) as income,
              COALESCE(SUM(CASE WHEN amount<0 THEN ABS(amount) ELSE 0 END),0) as expenses
       FROM transactions WHERE user_id=$1 AND to_char(date,'YYYY-MM')=$2 AND is_duplicate=FALSE`,
      [uid, thisMonth]
    );

    const accounts = await db.all(
      `SELECT a.*, COALESCE(SUM(t.amount),0) as computed_balance
       FROM accounts a LEFT JOIN transactions t ON t.account_id=a.id AND t.is_duplicate=FALSE AND t.user_id=a.user_id
       WHERE a.user_id=$1 GROUP BY a.id`,
      [uid]
    );

    const latestNW = await db.get(
      `SELECT * FROM net_worth_snapshots WHERE user_id=$1 ORDER BY snapshot_date DESC LIMIT 1`, [uid]
    );
    const prevNW = await db.get(
      `SELECT * FROM net_worth_snapshots WHERE user_id=$1 ORDER BY snapshot_date DESC OFFSET 1 LIMIT 1`, [uid]
    );

    res.json({
      monthly_data: monthlyData,
      category_breakdown: categoryBreakdown,
      cash_flow: { income: r2(cashFlow.income), expenses: r2(cashFlow.expenses), net: r2(cashFlow.income - cashFlow.expenses) },
      savings_goal: goal?.savings_target || 2000,
      net_take_home: taxSettings?.net_take_home || 0,
      accounts,
      net_worth: latestNW || null,
      net_worth_delta: latestNW && prevNW ? r2(latestNW.net_worth - prevNW.net_worth) : 0,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function r2(n) { return Math.round((+n || 0) * 100) / 100; }
module.exports = router;
