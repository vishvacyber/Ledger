let txState = { page: 0, limit: 50, filters: {} };

async function loadTransactions() {
  const el = document.getElementById('mod-transactions');
  el.innerHTML = `<div class="module-header"><h2>transactions</h2><p>all imported and manual transactions</p></div>
    <div id="tx-body"><div class="text-muted" style="padding:40px;text-align:center">loading…</div></div>`;
  txState = { page: 0, limit: 50, filters: {} };
  try {
    const [txs, cats, accounts] = await Promise.all([
      API.get('/api/transactions?limit=50&exclude_duplicates=0'),
      API.get('/api/categories'),
      API.get('/api/accounts'),
    ]);
    renderTransactions(txs, cats, accounts);
  } catch(e) { toast(e.message,'error'); }
}

function renderTransactions(txs, cats, accounts) {
  document.getElementById('tx-body').innerHTML = `
    <!-- Filters + actions -->
    <div class="flex-between mb-16" style="flex-wrap:wrap;gap:8px">
      <div class="flex gap-8" style="flex-wrap:wrap">
        <input class="form-input" id="tx-search" placeholder="search payee…" style="width:200px" value="">
        <select class="form-select" id="tx-cat-filter" style="width:160px">
          <option value="">all categories</option>
          ${cats.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join('')}
        </select>
        <input class="form-input" id="tx-start" type="date" style="width:140px">
        <input class="form-input" id="tx-end" type="date" style="width:140px">
        <button class="btn btn-ghost btn-sm" onclick="applyTxFilters(${JSON.stringify(cats).replace(/"/g,"'")})">filter</button>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-ghost btn-sm" onclick="downloadCSV(window._txData||[],'transactions.csv')">${ICONS.download} export</button>
        <button class="btn btn-primary btn-sm" onclick="showAddTx(${JSON.stringify(cats.map(c=>({id:c.id,name:c.name,emoji:c.emoji}))).replace(/"/g,"'")},${JSON.stringify(accounts.map(a=>({id:a.id,name:a.name}))).replace(/"/g,"'")})">${ICONS.plus} add</button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table id="tx-table">
        <thead><tr><th>date</th><th>payee</th><th>category</th><th>account</th><th style="text-align:right">amount</th><th></th></tr></thead>
        <tbody id="tx-tbody"></tbody>
      </table>
    </div>
    <div class="flex-center gap-8 mt-16">
      <button class="btn btn-ghost btn-sm" id="tx-prev" onclick="txPage(-1)">← prev</button>
      <span class="text-muted" id="tx-page-label" style="font-size:12px"></span>
      <button class="btn btn-ghost btn-sm" id="tx-next" onclick="txPage(1)">next →</button>
    </div>

    <!-- Add modal placeholder -->
    <div id="tx-modal"></div>
  `;

  window._txCats = cats;
  window._txAccounts = accounts;
  renderTxRows(txs);
  window._txData = txs;
}

function renderTxRows(txs) {
  window._txData = txs;
  const tbody = document.getElementById('tx-tbody');
  if (!txs.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px">no transactions found</td></tr>`;
    return;
  }
  tbody.innerHTML = txs.map(tx => `
    <tr ${tx.is_duplicate ? 'style="opacity:0.5"' : ''}>
      <td>${fmtDate(tx.date)}</td>
      <td>
        <div>${tx.payee}</div>
        ${tx.is_duplicate ? `<span class="badge" style="background:rgba(185,64,64,0.1);color:var(--danger);font-size:10px">duplicate</span>` : ''}
        ${tx.memo ? `<div style="font-size:11px;color:var(--muted)">${tx.memo}</div>` : ''}
      </td>
      <td>
        <select class="form-select" style="padding:4px 6px;font-size:12px;border-radius:6px" onchange="updateTxCategory('${tx.id}',this.value)">
          ${(window._txCats||[]).map(c => `<option value="${c.id}" ${c.id===tx.category_id?'selected':''}>${c.emoji||''} ${c.name}</option>`).join('')}
        </select>
      </td>
      <td class="text-muted" style="font-size:12px">${tx.account_name || '—'}</td>
      <td style="text-align:right" class="${amtClass(tx.amount)}"><span class="text-mono">${fmt(tx.amount)}</span></td>
      <td>
        <button class="btn btn-icon btn-danger" onclick="deleteTx('${tx.id}')" title="delete">${ICONS.trash}</button>
      </td>
    </tr>`).join('');

  document.getElementById('tx-page-label').textContent = `showing ${txs.length} transactions`;
}

async function applyTxFilters(cats) {
  const search = document.getElementById('tx-search')?.value;
  const category_id = document.getElementById('tx-cat-filter')?.value;
  const start = document.getElementById('tx-start')?.value;
  const end = document.getElementById('tx-end')?.value;
  let url = `/api/transactions?limit=50&offset=${txState.page * 50}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (category_id) url += `&category_id=${category_id}`;
  if (start) url += `&start=${start}`;
  if (end) url += `&end=${end}`;
  try {
    const txs = await API.get(url);
    renderTxRows(txs);
  } catch(e) { toast(e.message,'error'); }
}

async function txPage(dir) {
  txState.page = Math.max(0, txState.page + dir);
  await applyTxFilters(window._txCats||[]);
}

async function updateTxCategory(id, catId) {
  try {
    await API.put(`/api/transactions/${id}`, { category_id: catId });
    // Get current row data
    const existing = (window._txData||[]).find(t => t.id === id);
    if (existing) {
      existing.category_id = catId;
      const cat = (window._txCats||[]).find(c => c.id === catId);
      existing.category_name = cat?.name;
    }
    toast('category updated + rule learned', 'success');
  } catch(e) { toast(e.message,'error'); }
}

async function deleteTx(id) {
  if (!confirm('Delete this transaction?')) return;
  try {
    await API.del(`/api/transactions/${id}`);
    window._txData = (window._txData||[]).filter(t => t.id !== id);
    renderTxRows(window._txData);
    toast('transaction deleted','info');
  } catch(e) { toast(e.message,'error'); }
}

function showAddTx(cats, accounts) {
  const modal = document.getElementById('tx-modal');
  modal.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(26,24,20,0.4);z-index:100;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:400px;max-width:95vw">
        <div class="card-header"><span class="card-title">add transaction</span>
          <button class="btn btn-icon btn-ghost" onclick="document.getElementById('tx-modal').innerHTML=''">✕</button>
        </div>
        <form id="add-tx-form">
          <div class="form-group"><label class="form-label">date</label>
            <input class="form-input" name="date" type="date" value="${new Date().toISOString().split('T')[0]}" required></div>
          <div class="form-group"><label class="form-label">payee</label>
            <input class="form-input" name="payee" placeholder="Amazon.com" required></div>
          <div class="form-group"><label class="form-label">amount (negative = expense)</label>
            <input class="form-input" name="amount" type="number" step="0.01" placeholder="-49.99" required></div>
          <div class="form-group"><label class="form-label">category</label>
            <select class="form-select" name="category_id">
              ${cats.map(c => `<option value="${c.id}">${c.emoji||''} ${c.name}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">account</label>
            <select class="form-select" name="account_id">
              <option value="">— none —</option>
              ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">memo</label>
            <input class="form-input" name="memo" placeholder="optional note"></div>
          <div class="flex gap-8">
            <button type="submit" class="btn btn-primary">save</button>
            <button type="button" class="btn btn-ghost" onclick="document.getElementById('tx-modal').innerHTML=''">cancel</button>
          </div>
        </form>
      </div>
    </div>`;

  document.getElementById('add-tx-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.post('/api/transactions', Object.fromEntries(fd));
      document.getElementById('tx-modal').innerHTML = '';
      toast('transaction added','success');
      loadTransactions();
    } catch(err) { toast(err.message,'error'); }
  });
}
