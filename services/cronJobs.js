const cron = require('node-cron');
const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');

function startCronJobs() {
  cron.schedule('0 2 * * *', async () => {
    console.log('[cron] Nightly subscription spike check');
    try { await detectSubscriptionSpikes(); } catch(e) { console.error(e); }
  });
  cron.schedule('0 3 * * *', async () => {
    console.log('[cron] Auto-detecting subscriptions');
    try { await autoDetectSubscriptions(); } catch(e) { console.error(e); }
  });
}

async function detectSubscriptionSpikes() {
  const subs = await db.all(`SELECT * FROM fixed_expenses WHERE is_subscription=TRUE`);
  for (const sub of subs) {
    const recent = await db.all(
      `SELECT amount FROM transactions WHERE user_id=$1 AND payee_normalized ILIKE $2
       AND date >= NOW()-INTERVAL '60 days' ORDER BY date DESC LIMIT 2`,
      [sub.user_id, `%${sub.name.toLowerCase().slice(0,10)}%`]
    );
    if (recent.length >= 2) {
      const latest = Math.abs(+recent[0].amount), prev = Math.abs(+recent[1].amount);
      if (prev > 0 && (latest-prev)/prev > 0.05) {
        await db.run(`UPDATE fixed_expenses SET last_seen_amount=$1, last_seen_date=NOW() WHERE id=$2`, [latest, sub.id]);
      }
    }
  }
}

async function autoDetectSubscriptions() {
  const candidates = await db.all(
    `SELECT user_id, payee_normalized, COUNT(DISTINCT to_char(date,'YYYY-MM')) as months, AVG(ABS(amount)) as avg_amount
     FROM transactions WHERE amount<0 AND date>=NOW()-INTERVAL '6 months' AND is_duplicate=FALSE
     GROUP BY user_id, payee_normalized HAVING COUNT(DISTINCT to_char(date,'YYYY-MM'))>=3 AND AVG(ABS(amount))<500`
  );
  for (const c of candidates) {
    if (!c.payee_normalized) continue;
    const existing = await db.get(
      `SELECT id FROM fixed_expenses WHERE user_id=$1 AND name ILIKE $2`, [c.user_id, `%${c.payee_normalized}%`]
    );
    if (!existing) {
      await db.run(
        `INSERT INTO fixed_expenses (id, user_id, name, amount, frequency, is_subscription, status)
         VALUES ($1,$2,$3,$4,'monthly',TRUE,'active')`,
        [uuidv4(), c.user_id, c.payee_normalized, Math.round(+c.avg_amount*100)/100]
      );
    }
  }
}

module.exports = { startCronJobs };
