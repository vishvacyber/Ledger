const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');

router.get('/', async (req, res) => {
  try {
    res.json(await db.all(`SELECT * FROM accounts WHERE user_id=$1 ORDER BY name`, [req.user.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, institution, color_token } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = uuidv4();
    await db.run(
      `INSERT INTO accounts (id, user_id, name, type, institution, color_token) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, req.user.id, name, type||'checking', institution||'', color_token||'#CC6B3D']
    );
    res.json(await db.get(`SELECT * FROM accounts WHERE id=$1`, [id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, type, institution, color_token, balance } = req.body;
    await db.run(
      `UPDATE accounts SET name=$1, type=$2, institution=$3, color_token=$4, balance=$5 WHERE id=$6 AND user_id=$7`,
      [name, type, institution, color_token, +balance||0, req.params.id, req.user.id]
    );
    res.json(await db.get(`SELECT * FROM accounts WHERE id=$1`, [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run(`DELETE FROM accounts WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
