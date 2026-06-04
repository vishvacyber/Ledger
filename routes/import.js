const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');
const { parseCSV, parseOFX } = require('../services/statementParser');
const { categorizeAll, flagDuplicates } = require('../services/categoryEngine');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const text = req.file.buffer.toString('utf-8');
    const preset = req.body.preset || null;
    const accountId = req.body.account_id || null;

    let rows;
    const fname = req.file.originalname.toLowerCase();
    if (fname.endsWith('.ofx') || fname.endsWith('.qfx')) {
      rows = parseOFX(text);
    } else {
      rows = parseCSV(text, preset);
    }
    if (!rows.length) return res.status(400).json({ error: 'No valid transactions parsed' });

    const batchId = uuidv4();
    await db.run(
      `INSERT INTO import_batches (id, user_id, filename, account_id, row_count) VALUES ($1,$2,$3,$4,$5)`,
      [batchId, req.user.id, req.file.originalname, accountId, rows.length]
    );

    const categorized = await categorizeAll(rows, req.user.id);
    for (const tx of categorized) {
      await db.run(
        `INSERT INTO transactions (id, user_id, date, payee, payee_normalized, amount, category_id, account_id, import_batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [uuidv4(), req.user.id, tx.date, tx.payee, tx.payee_normalized, tx.amount,
         tx.category_id, accountId, batchId]
      );
    }

    await flagDuplicates(batchId, req.user.id);
    res.json({ batch_id: batchId, imported: rows.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:batch_id', async (req, res) => {
  try {
    const count = await db.get(
      `SELECT COUNT(*) as n FROM transactions WHERE import_batch_id=$1 AND user_id=$2`,
      [req.params.batch_id, req.user.id]
    );
    await db.run(`DELETE FROM transactions WHERE import_batch_id=$1 AND user_id=$2`, [req.params.batch_id, req.user.id]);
    await db.run(`DELETE FROM import_batches WHERE id=$1 AND user_id=$2`, [req.params.batch_id, req.user.id]);
    res.json({ deleted: +count.n });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/batches', async (req, res) => {
  try {
    res.json(await db.all(
      `SELECT * FROM import_batches WHERE user_id=$1 ORDER BY imported_at DESC`, [req.user.id]
    ));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
