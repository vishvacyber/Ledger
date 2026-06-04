const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');

router.get('/', async (req, res) => {
  try {
    res.json(await db.all(
      `SELECT * FROM categories WHERE user_id=$1 ORDER BY is_system DESC, name`, [req.user.id]
    ));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, parent_id, color, emoji, monthly_cap } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uuidv4();
    await db.run(
      `INSERT INTO categories (id, user_id, name, parent_id, color, emoji, monthly_cap) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, req.user.id, name, parent_id||null, color||'#CC6B3D', emoji||'📂', monthly_cap||null]
    );
    res.json(await db.get(`SELECT * FROM categories WHERE id=$1`, [id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, parent_id, color, emoji, monthly_cap } = req.body;
    await db.run(
      `UPDATE categories SET name=$1, parent_id=$2, color=$3, emoji=$4, monthly_cap=$5 WHERE id=$6 AND user_id=$7`,
      [name, parent_id||null, color, emoji, monthly_cap||null, req.params.id, req.user.id]
    );
    res.json(await db.get(`SELECT * FROM categories WHERE id=$1`, [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const cat = await db.get(`SELECT * FROM categories WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    if (!cat) return res.status(404).json({ error: 'not found' });
    if (cat.is_system) return res.status(400).json({ error: 'Cannot delete system category' });
    const uncatId = `${req.user.id}-cat-uncategorized`;
    await db.run(`UPDATE transactions SET category_id=$1 WHERE category_id=$2 AND user_id=$3`, [uncatId, req.params.id, req.user.id]);
    await db.run(`DELETE FROM categories WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
