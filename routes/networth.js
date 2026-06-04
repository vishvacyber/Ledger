const express = require('express');
const router = express.Router();
const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const items = await db.all(`SELECT * FROM assets_liabilities WHERE user_id=$1 ORDER BY type,name`, [uid]);
    const snapshots = await db.all(`SELECT * FROM net_worth_snapshots WHERE user_id=$1 ORDER BY snapshot_date DESC LIMIT 24`, [uid]);
    const assets = items.filter(x=>x.type==='asset').reduce((s,x)=>s+ +x.value,0);
    const liabilities = items.filter(x=>x.type==='liability').reduce((s,x)=>s+ +x.value,0);
    res.json({ items, snapshots, total_assets: r2(assets), total_liabilities: r2(liabilities), net_worth: r2(assets-liabilities) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, type, subtype, value, as_of_date } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type required' });
    const id = uuidv4();
    await db.run(
      `INSERT INTO assets_liabilities (id, user_id, name, type, subtype, value, as_of_date) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, req.user.id, name, type, subtype||null, +value||0, as_of_date||new Date().toISOString().split('T')[0]]
    );
    await snapshotNW(req.user.id);
    res.json(await db.get(`SELECT * FROM assets_liabilities WHERE id=$1`, [id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, type, subtype, value, as_of_date } = req.body;
    await db.run(
      `UPDATE assets_liabilities SET name=$1, type=$2, subtype=$3, value=$4, as_of_date=$5 WHERE id=$6 AND user_id=$7`,
      [name, type, subtype||null, +value||0, as_of_date, req.params.id, req.user.id]
    );
    await snapshotNW(req.user.id);
    res.json(await db.get(`SELECT * FROM assets_liabilities WHERE id=$1`, [req.params.id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run(`DELETE FROM assets_liabilities WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    await snapshotNW(req.user.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

async function snapshotNW(userId) {
  const items = await db.all(`SELECT * FROM assets_liabilities WHERE user_id=$1`, [userId]);
  const assets = items.filter(x=>x.type==='asset').reduce((s,x)=>s+ +x.value,0);
  const liabilities = items.filter(x=>x.type==='liability').reduce((s,x)=>s+ +x.value,0);
  const today = new Date().toISOString().split('T')[0];
  await db.run(
    `INSERT INTO net_worth_snapshots (id, user_id, snapshot_date, total_assets, total_liabilities, net_worth)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id, snapshot_date) DO UPDATE SET total_assets=$4, total_liabilities=$5, net_worth=$6`,
    [uuidv4(), userId, today, r2(assets), r2(liabilities), r2(assets-liabilities)]
  );
}

function r2(n) { return Math.round((+n||0)*100)/100; }
module.exports = router;
