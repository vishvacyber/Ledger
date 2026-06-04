const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');

router.get('/', async (req, res) => {
  try {
    const expenses = await db.all(
      `SELECT * FROM fixed_expenses WHERE user_id=$1 ORDER BY due_day, name`, [req.user.id]
    );
    const now = new Date();
    const enriched = expenses.map(e => {
      const nextDue = getNextDue(e.due_day, now);
      return { ...e, next_due: nextDue.toISOString().split('T')[0], days_until: Math.ceil((nextDue-now)/86400000), annual_cost: annualCost(e) };
    });
    res.json(enriched);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, amount, frequency, due_day, is_subscription, status } = req.body;
    if (!name || !amount) return res.status(400).json({ error: 'name and amount required' });
    const id = uuidv4();
    await db.run(
      `INSERT INTO fixed_expenses (id, user_id, name, amount, frequency, due_day, is_subscription, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, req.user.id, name, +amount, frequency||'monthly', +due_day||1, !!is_subscription, status||'active']
    );
    res.json(await db.get(`SELECT * FROM fixed_expenses WHERE id=$1`, [id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, amount, frequency, due_day, is_subscription, status } = req.body;
    await db.run(
      `UPDATE fixed_expenses SET name=$1, amount=$2, frequency=$3, due_day=$4, is_subscription=$5, status=$6 WHERE id=$7 AND user_id=$8`,
      [name, +amount, frequency, +due_day||1, !!is_subscription, status, req.params.id, req.user.id]
    );
    res.json(await db.get(`SELECT * FROM fixed_expenses WHERE id=$1`, [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run(`DELETE FROM fixed_expenses WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/subscriptions', async (req, res) => {
  try {
    const subs = await db.all(
      `SELECT * FROM fixed_expenses WHERE user_id=$1 AND is_subscription=TRUE AND status='active'`, [req.user.id]
    );
    const alerts = subs.filter(s => s.last_seen_amount && ((s.amount - s.last_seen_amount)/s.last_seen_amount) > 0.05);
    res.json({ subscriptions: subs, spike_alerts: alerts });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function getNextDue(dueDay, now) {
  const d = new Date(now.getFullYear(), now.getMonth(), dueDay||1);
  if (d <= now) d.setMonth(d.getMonth()+1);
  return d;
}
function annualCost(e) {
  const freq = { daily:365, weekly:52, biweekly:26, monthly:12, quarterly:4, annual:1 };
  return Math.round(+e.amount*(freq[e.frequency]||12)*100)/100;
}

module.exports = router;
