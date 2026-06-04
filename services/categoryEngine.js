const db = require('../db/db');
const { v4: uuidv4 } = require('uuid');

function levenshtein(a, b) {
  const m=a.length, n=b.length;
  const dp=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) {
    if(a[i-1]===b[j-1]) dp[i][j]=dp[i-1][j-1];
    else dp[i][j]=1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  }
  return dp[m][n];
}

function fuzzyMatch(str, pattern, threshold=0.7) {
  const s=str.toLowerCase(), p=pattern.toLowerCase();
  if(s.includes(p)) return true;
  const dist=levenshtein(s,p);
  return (1-dist/Math.max(s.length,p.length))>=threshold;
}

function normalizePayee(raw='') {
  return raw.replace(/\d{4,}/g,'').replace(/[*#@]/g,' ').replace(/\s+/g,' ')
    .replace(/\b(inc|llc|ltd|co|corp|#\d+|store \d+)\b/gi,'').trim().toLowerCase();
}

async function applyRules(transaction, userId) {
  const rules = await db.all(
    `SELECT * FROM rules WHERE user_id=$1 ORDER BY priority DESC, auto_learned ASC`, [userId]
  );
  const field = transaction.payee_normalized || normalizePayee(transaction.payee||'');
  for (const rule of rules) {
    const val = rule.value.toLowerCase();
    let matched = false;
    switch(rule.operator) {
      case 'contains':    matched = field.includes(val); break;
      case 'startswith':  matched = field.startsWith(val); break;
      case 'endswith':    matched = field.endsWith(val); break;
      case 'exact':       matched = field === val; break;
      case 'regex':       try { matched = new RegExp(val,'i').test(field); } catch {} break;
      case 'fuzzy':       matched = fuzzyMatch(field, val); break;
    }
    if (matched) return rule.category_id;
  }
  return `${userId}-cat-uncategorized`;
}

async function categorizeAll(transactions, userId) {
  return Promise.all(transactions.map(async tx => ({
    ...tx,
    payee_normalized: normalizePayee(tx.payee||''),
    category_id: tx.category_id || await applyRules(tx, userId),
  })));
}

async function learnFromCorrection(transactionId, newCategoryId, userId) {
  const tx = await db.get(`SELECT * FROM transactions WHERE id=$1 AND user_id=$2`, [transactionId, userId]);
  if (!tx) return;
  const normalized = tx.payee_normalized || normalizePayee(tx.payee||'');
  const existing = await db.get(
    `SELECT id FROM rules WHERE operator='contains' AND value=$1 AND category_id=$2 AND user_id=$3`,
    [normalized, newCategoryId, userId]
  );
  if (!existing) {
    await db.run(
      `INSERT INTO rules (id, user_id, field, operator, value, category_id, priority, auto_learned)
       VALUES ($1,$2,'payee','contains',$3,$4,10,TRUE)`,
      [uuidv4(), userId, normalized, newCategoryId]
    );
  }
  await db.run(`UPDATE transactions SET category_id=$1 WHERE id=$2 AND user_id=$3`, [newCategoryId, transactionId, userId]);
}

async function flagDuplicates(batchId, userId) {
  const batchTxs = await db.all(
    `SELECT * FROM transactions WHERE import_batch_id=$1 AND user_id=$2`, [batchId, userId]
  );
  const others = await db.all(
    `SELECT * FROM transactions WHERE import_batch_id!=$1 AND user_id=$2`, [batchId, userId]
  );
  for (const tx of batchTxs) {
    for (const other of others) {
      const daysDiff = Math.abs(new Date(tx.date)-new Date(other.date))/86400000;
      if (daysDiff<=3 && Math.abs(+tx.amount - +other.amount)<0.01 && fuzzyMatch(normalizePayee(tx.payee), normalizePayee(other.payee), 0.85)) {
        await db.run(`UPDATE transactions SET is_duplicate=TRUE WHERE id=$1`, [tx.id]);
        break;
      }
    }
  }
}

module.exports = { applyRules, categorizeAll, learnFromCorrection, flagDuplicates, normalizePayee };
