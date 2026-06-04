const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');

router.get('/scenarios', async (req, res) => {
  try {
    const rows = await db.all(`SELECT * FROM scenarios WHERE user_id=$1 ORDER BY created_at DESC`, [req.user.id]);
    res.json(rows.map(s => ({ ...s, adjustments: s.adjustments || {} })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/scenarios', async (req, res) => {
  try {
    const count = await db.get(`SELECT COUNT(*) as n FROM scenarios WHERE user_id=$1`, [req.user.id]);
    if (+count.n >= 5) {
      const oldest = await db.get(`SELECT id FROM scenarios WHERE user_id=$1 ORDER BY created_at ASC LIMIT 1`, [req.user.id]);
      await db.run(`DELETE FROM scenarios WHERE id=$1`, [oldest.id]);
    }
    const { name, description, adjustments } = req.body;
    const id = uuidv4();
    await db.run(
      `INSERT INTO scenarios (id, user_id, name, description, adjustments) VALUES ($1,$2,$3,$4,$5)`,
      [id, req.user.id, name||'Scenario', description||'', JSON.stringify(adjustments||{})]
    );
    res.json({ id, name, description, adjustments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/scenarios/:id', async (req, res) => {
  try {
    await db.run(`DELETE FROM scenarios WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/simulate', async (req, res) => {
  try {
    const { adjustments = {} } = req.body;
    const fireSettings = await db.get(`SELECT * FROM fire_settings WHERE user_id=$1`, [req.user.id]);
    let monthlyDelta = Object.values(adjustments).reduce((s, v) => s + (+v||0), 0);
    const newMonthlyContribution = (+fireSettings?.monthly_contribution||2000) + (-monthlyDelta);
    const newAnnualExpenses = (+fireSettings?.annual_expenses||60000) + (monthlyDelta*12);
    const { calcFIRE } = require('./fire');
    const baseline_fire = calcFIRE(fireSettings||{});
    const scenario_fire = calcFIRE({ ...fireSettings, monthly_contribution: newMonthlyContribution, annual_expenses: newAnnualExpenses });
    res.json({
      baseline: { ...baseline_fire, monthly_savings: +fireSettings?.monthly_contribution||2000 },
      scenario: { ...scenario_fire, monthly_savings: newMonthlyContribution },
      nw_delta_monthly: Math.round(-monthlyDelta*100)/100,
      fire_date_shift_years: Math.round((baseline_fire.years_to_fire - scenario_fire.years_to_fire)*10)/10,
      adjustments,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
