const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');

router.get('/', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0,7);
    const goal = await db.get(`SELECT * FROM budget_goals WHERE user_id=$1 AND month=$2`, [req.user.id, month]);
    res.json(goal || { month, savings_target: 2000 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { month, savings_target } = req.body;
    const m = month || new Date().toISOString().slice(0,7);
    await db.run(
      `INSERT INTO budget_goals (id, user_id, month, savings_target) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, month) DO UPDATE SET savings_target=$4`,
      [uuidv4(), req.user.id, m, +savings_target||2000]
    );
    res.json(await db.get(`SELECT * FROM budget_goals WHERE user_id=$1 AND month=$2`, [req.user.id, m]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
