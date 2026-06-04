// CSV + OFX/QFX parser with preset mappers for Chase, Amex, CapOne, Citi, BofA

const { normalizePayee } = require('./categoryEngine');

// Preset column maps: [date, payee, amount] or {date, payee, amount, credit, debit}
const PRESETS = {
  chase: {
    date: 'Transaction Date',
    payee: 'Description',
    amount: 'Amount',
    amountSign: 'normal', // negative = debit
  },
  amex: {
    date: 'Date',
    payee: 'Description',
    amount: 'Amount',
    amountSign: 'invert',
  },
  capone: {
    date: 'Transaction Date',
    payee: 'Description',
    debit: 'Debit',
    credit: 'Credit',
  },
  citi: {
    date: 'Date',
    payee: 'Description',
    debit: 'Debit',
    credit: 'Credit',
  },
  bofa: {
    date: 'Date',
    payee: 'Description',
    amount: 'Amount',
    amountSign: 'normal',
  },
};

function detectPreset(headers) {
  const h = headers.map(x => x.toLowerCase());
  if (h.includes('transaction date') && h.includes('post date')) return 'chase';
  if (h.includes('card member') || h.includes('account #')) return 'amex';
  if (h.includes('debit') && h.includes('credit') && h.includes('transaction date')) return 'capone';
  if (h.includes('debit') && h.includes('credit') && h.includes('date')) return 'citi';
  if (h.includes('running bal.') || h.includes('running balance')) return 'bofa';
  return null;
}

function parseRow(row, mapping) {
  const { date: dk, payee: pk, amount: ak, debit: debk, credit: crk, amountSign } = mapping;

  const date = row[dk] || row['date'] || row['Date'] || '';
  const payee = row[pk] || row['payee'] || row['Payee'] || row['description'] || row['Description'] || '';

  let amount;
  if (ak && row[ak] !== undefined) {
    amount = parseFloat((row[ak] || '0').toString().replace(/[$,]/g, '')) || 0;
    if (amountSign === 'invert') amount = -amount;
  } else if (debk || crk) {
    const debit  = parseFloat((row[debk] || '0').toString().replace(/[$,]/g, '')) || 0;
    const credit = parseFloat((row[crk]  || '0').toString().replace(/[$,]/g, '')) || 0;
    amount = credit - debit; // positive = money in, negative = money out
  } else {
    amount = 0;
  }

  return {
    date: normalizeDate(date),
    payee: payee.trim(),
    payee_normalized: normalizePayee(payee),
    amount: Math.round(amount * 100) / 100,
  };
}

function normalizeDate(raw) {
  if (!raw) return new Date().toISOString().split('T')[0];
  // Try MM/DD/YYYY
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.split('T')[0];
  return raw;
}

function parseCSV(csvText, presetName, customMapping) {
  // Simple CSV parser (handles quoted fields)
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const preset = presetName
    ? PRESETS[presetName]
    : customMapping || autoMap(headers);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => row[h] = vals[idx] || '');
    const parsed = parseRow(row, preset);
    if (parsed.payee && parsed.date) rows.push(parsed);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function autoMap(headers) {
  const find = (candidates) => headers.find(h => candidates.some(c => h.toLowerCase().includes(c))) || candidates[0];
  return {
    date: find(['date', 'posted', 'trans']),
    payee: find(['description', 'payee', 'merchant', 'name']),
    amount: find(['amount', 'total']),
    amountSign: 'normal',
  };
}

function parseOFX(ofxText) {
  const txs = [];
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  while ((match = stmtTrnRegex.exec(ofxText)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}>([^<]+)`, 'i'));
      return m ? m[1].trim() : '';
    };
    const dtRaw = get('DTPOSTED');
    const date = dtRaw ? `${dtRaw.slice(0,4)}-${dtRaw.slice(4,6)}-${dtRaw.slice(6,8)}` : '';
    const payee = get('NAME') || get('MEMO') || '';
    const amtRaw = parseFloat(get('TRNAMT') || '0');
    txs.push({
      date,
      payee: payee.trim(),
      payee_normalized: normalizePayee(payee),
      amount: Math.round(amtRaw * 100) / 100,
    });
  }
  return txs;
}

module.exports = { parseCSV, parseOFX, detectPreset, PRESETS };
