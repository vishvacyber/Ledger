const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');

router.get('/', async (req, res) => {
  try {
    res.json(await db.all(
      `SELECT r.*, c.name as cat_name, c.emoji as cat_emoji FROM rules r
       JOIN categories c ON c.id = r.category_id
       WHERE r.user_id=$1 ORDER BY r.priority DESC, r.created_at`, [req.user.id]
    ));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { field, operator, value, category_id, priority } = req.body;
    if (!value || !category_id) return res.status(400).json({ error: 'value and category_id required' });
    const id = uuidv4();
    await db.run(
      `INSERT INTO rules (id, user_id, field, operator, value, category_id, priority) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, req.user.id, field||'payee', operator||'contains', value, category_id, +priority||0]
    );
    res.json(await db.get(`SELECT * FROM rules WHERE id=$1`, [id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { field, operator, value, category_id, priority } = req.body;
    await db.run(
      `UPDATE rules SET field=$1, operator=$2, value=$3, category_id=$4, priority=$5 WHERE id=$6 AND user_id=$7`,
      [field, operator, value, category_id, +priority||0, req.params.id, req.user.id]
    );
    res.json(await db.get(`SELECT * FROM rules WHERE id=$1`, [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run(`DELETE FROM rules WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/reapply', async (req, res) => {
  try {
    const { categorizeAll } = require('../services/categoryEngine');
    const uncatId = `${req.user.id}-cat-uncategorized`;
    const uncategorized = await db.all(
      `SELECT * FROM transactions WHERE category_id=$1 AND user_id=$2`, [uncatId, req.user.id]
    );
    const categorized = await categorizeAll(uncategorized, req.user.id);
    for (const tx of categorized) {
      await db.run(
        `UPDATE transactions SET category_id=$1 WHERE id=$2 AND user_id=$3`,
        [tx.category_id, tx.id, req.user.id]
      );
    }
    res.json({ updated: categorized.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
