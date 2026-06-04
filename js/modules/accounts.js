async function loadAccounts() {
  const el = document.getElementById('mod-accounts');
  el.innerHTML = `<div class="module-header"><h2>accounts</h2><p>bank accounts, credit cards, brokerages</p></div>
    <div id="acct-body"><div class="text-muted" style="padding:40px;text-align:center">loading…</div></div>`;
  try {
    const accounts = await API.get('/api/accounts');
    renderAccounts(accounts);
  } catch(e) { toast(e.message,'error'); }
}

function renderAccounts(accounts) {
  document.getElementById('acct-body').innerHTML = `
    <div class="flex-between mb-16">
      <span class="text-muted">${accounts.length} accounts</span>
      <button class="btn btn-primary btn-sm" onclick="showAddAccount()">${ICONS.plus} add account</button>
    </div>
    <div class="grid-3">
      ${accounts.length === 0 ? `<div class="empty-state" style="grid-column:1/-1"><p>no accounts yet — add one to start importing</p></div>` :
        accounts.map(a => `
          <div class="card">
            <div class="card-header">
              <div class="flex-center gap-8">
                <span style="width:10px;height:10px;border-radius:50%;background:${a.color_token||'#CC6B3D'}"></span>
                <span style="font-size:13px;font-weight:500">${a.name}</span>
              </div>
              <button class="btn btn-icon btn-danger" onclick="deleteAccount('${a.id}')">${ICONS.trash}</button>
            </div>
            <div class="text-muted" style="font-size:12px;margin-bottom:8px">${a.type} · ${a.institution || 'unknown institution'}</div>
            <div class="card-value text-mono ${amtClass(a.balance)}">${fmt(a.balance)}</div>
          </div>`).join('')}
    </div>
    <div id="acct-modal"></div>
  `;
}

function showAddAccount() {
  const el = document.getElementById('acct-modal');
  el.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(26,24,20,0.4);z-index:100;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:360px">
        <div class="card-header"><span class="card-title">add account</span>
          <button class="btn btn-icon btn-ghost" onclick="document.getElementById('acct-modal').innerHTML=''">✕</button></div>
        <form id="add-acct-form">
          <div class="form-group"><label class="form-label">name</label><input class="form-input" name="name" placeholder="Chase Checking" required></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">type</label>
              <select class="form-select" name="type">
                ${['checking','savings','credit','brokerage','cash'].map(t=>`<option value="${t}">${t}</option>`).join('')}
              </select></div>
            <div class="form-group"><label class="form-label">institution</label><input class="form-input" name="institution" placeholder="Chase, Fidelity…"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">color</label><input type="color" name="color_token" value="#CC6B3D" class="form-input" style="padding:2px"></div>
            <div class="form-group"><label class="form-label">opening balance ($)</label><input class="form-input" name="balance" type="number" step="0.01" value="0"></div>
          </div>
          <div class="flex gap-8">
            <button type="submit" class="btn btn-primary">save</button>
            <button type="button" class="btn btn-ghost" onclick="document.getElementById('acct-modal').innerHTML=''">cancel</button>
          </div>
        </form>
      </div>
    </div>`;

  document.getElementById('add-acct-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.post('/api/accounts', Object.fromEntries(fd));
      document.getElementById('acct-modal').innerHTML = '';
      toast('account added','success');
      loadAccounts();
    } catch(err) { toast(err.message,'error'); }
  });
}

async function deleteAccount(id) {
  if (!confirm('Delete this account? Transactions will remain but lose the account link.')) return;
  try {
    await API.del(`/api/accounts/${id}`);
    toast('account deleted','info');
    loadAccounts();
  } catch(e) { toast(e.message,'error'); }
}
