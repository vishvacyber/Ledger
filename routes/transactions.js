const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');

router.get('/', async (req, res) => {
  try {
    const { account_id, category_id, start, end, search, limit = 200, offset = 0, exclude_duplicates } = req.query;
    const params = [req.user.id];
    let where = `WHERE t.user_id = $1`;
    if (account_id)  { params.push(account_id);  where += ` AND t.account_id = $${params.length}`; }
    if (category_id) { params.push(category_id); where += ` AND t.category_id = $${params.length}`; }
    if (start)       { params.push(start);        where += ` AND t.date >= $${params.length}`; }
    if (end)         { params.push(end);           where += ` AND t.date <= $${params.length}`; }
    if (search)      { params.push(`%${search}%`); where += ` AND (t.payee ILIKE $${params.length} OR t.memo ILIKE $${params.length})`; }
    if (exclude_duplicates === '1') where += ` AND t.is_duplicate = FALSE`;
    params.push(+limit, +offset);
    const sql = `SELECT t.*, c.name as category_name, c.emoji as category_emoji, a.name as account_name
                 FROM transactions t
                 LEFT JOIN categories c ON c.id = t.category_id
                 LEFT JOIN accounts a ON a.id = t.account_id
                 ${where}
                 ORDER BY t.date DESC, t.created_at DESC
                 LIMIT $${params.length - 1} OFFSET $${params.length}`;
    res.json(await db.all(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { date, payee, amount, category_id, account_id, memo } = req.body;
    if (!date || !payee || amount === undefined) return res.status(400).json({ error: 'date, payee, amount required' });
    const id = uuidv4();
    const uncatId = `${req.user.id}-cat-uncategorized`;
    await db.run(
      `INSERT INTO transactions (id, user_id, date, payee, amount, category_id, account_id, memo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, req.user.id, date, payee, +amount, category_id||uncatId, account_id||null, memo||'']
    );
    res.json(await db.get(`SELECT * FROM transactions WHERE id=$1`, [id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { date, payee, amount, category_id, account_id, memo, is_duplicate } = req.body;
    if (category_id) {
      const { learnFromCorrection } = require('../services/categoryEngine');
      await learnFromCorrection(req.params.id, category_id, req.user.id);
    }
    await db.run(
      `UPDATE transactions SET date=$1, payee=$2, amount=$3, category_id=$4, account_id=$5, memo=$6, is_duplicate=$7
       WHERE id=$8 AND user_id=$9`,
      [date, payee, +amount, category_id, account_id, memo||'', !!is_duplicate, req.params.id, req.user.id]
    );
    res.json(await db.get(`SELECT * FROM transactions WHERE id=$1`, [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run(`DELETE FROM transactions WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    await db.run(`DELETE FROM transactions WHERE id = ANY($1) AND user_id=$2`, [ids, req.user.id]);
    res.json({ deleted: ids.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
