const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { computeTax } = require('../services/taxEngine');
const { v4: uuidv4 } = require('uuid');

router.get('/', async (req, res) => {
  try {
    const row = await db.get(`SELECT * FROM tax_settings WHERE user_id = $1`, [req.user.id]);
    if (!row) return res.json({ settings: {}, calc: {} });
    const calc = computeTax(row);
    res.json({ settings: row, calc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { gross_salary, pay_period, filing_status, state, fica_exempt, pretax_401k, pretax_hsa, pretax_fsa } = req.body;
    const calc = computeTax(req.body);

    const existing = await db.get(`SELECT id FROM tax_settings WHERE user_id = $1`, [req.user.id]);
    if (existing) {
      await db.run(
        `UPDATE tax_settings SET gross_salary=$1, pay_period=$2, filing_status=$3, state=$4,
         fica_exempt=$5, pretax_401k=$6, pretax_hsa=$7, pretax_fsa=$8, net_take_home=$9, updated_at=NOW()
         WHERE user_id=$10`,
        [+gross_salary||0, pay_period||'biweekly', filing_status||'single', state||'CA',
         !!fica_exempt, +pretax_401k||0, +pretax_hsa||0, +pretax_fsa||0, calc.net_annual, req.user.id]
      );
    } else {
      await db.run(
        `INSERT INTO tax_settings (id, user_id, gross_salary, pay_period, filing_status, state, fica_exempt, pretax_401k, pretax_hsa, pretax_fsa, net_take_home)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [uuidv4(), req.user.id, +gross_salary||0, pay_period||'biweekly', filing_status||'single', state||'CA',
         !!fica_exempt, +pretax_401k||0, +pretax_hsa||0, +pretax_fsa||0, calc.net_annual]
      );
    }
    const settings = await db.get(`SELECT * FROM tax_settings WHERE user_id = $1`, [req.user.id]);
    res.json({ settings, calc });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
