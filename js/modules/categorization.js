async function loadCategorization() {
  const el = document.getElementById('mod-categorization');
  el.innerHTML = `<div class="module-header"><h2>smart categorization</h2><p>rule dsl + auto-learn from corrections</p></div>
    <div id="cat-body"><div class="text-muted" style="padding:40px;text-align:center">loading…</div></div>`;
  try {
    const [rules, cats] = await Promise.all([API.get('/api/rules'), API.get('/api/categories')]);
    renderCategorization(rules, cats);
  } catch(e) { toast(e.message,'error'); }
}

function renderCategorization(rules, cats) {
  document.getElementById('cat-body').innerHTML = `
    <div class="tabs">
      <button class="tab-btn active" onclick="showCatTab('rules',this)">rules</button>
      <button class="tab-btn" onclick="showCatTab('categories',this)">categories</button>
      <button class="tab-btn" onclick="showCatTab('uncategorized',this)">uncategorized inbox</button>
    </div>
    <div id="cat-tab-content"></div>
  `;

  window._catRules = rules;
  window._catCats = cats;
  showCatTab('rules');
}

function showCatTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById('cat-tab-content');

  if (tab === 'rules') {
    const rules = window._catRules || [];
    const cats = window._catCats || [];
    el.innerHTML = `
      <div class="flex-between mb-16">
        <span class="text-muted" style="font-size:13px">${rules.length} rules · higher priority wins</span>
        <div class="flex gap-8">
          <button class="btn btn-ghost btn-sm" onclick="reapplyRules()">re-apply all</button>
          <button class="btn btn-primary btn-sm" onclick="showAddRule()">${ICONS.plus} new rule</button>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>field</th><th>operator</th><th>value</th><th>category</th><th>priority</th><th>source</th><th></th></tr></thead>
          <tbody>
            ${rules.length === 0 ? `<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">no rules yet — corrections will auto-learn rules</td></tr>` :
              rules.map(r => `<tr>
                <td>${r.field}</td>
                <td><span class="badge">${r.operator}</span></td>
                <td style="font-family:monospace;font-size:12px">${r.value}</td>
                <td>${r.cat_emoji||''} ${r.cat_name}</td>
                <td>${r.priority}</td>
                <td class="text-muted" style="font-size:11px">${r.auto_learned ? 'auto-learned' : 'manual'}</td>
                <td><button class="btn btn-icon btn-danger" onclick="deleteRule('${r.id}')">${ICONS.trash}</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div id="rule-modal"></div>`;

  } else if (tab === 'categories') {
    const cats = window._catCats || [];
    el.innerHTML = `
      <div class="flex-between mb-16">
        <span class="text-muted" style="font-size:13px">${cats.length} categories</span>
        <button class="btn btn-primary btn-sm" onclick="showAddCat()">${ICONS.plus} new category</button>
      </div>
      <div class="grid-3" style="gap:12px">
        ${cats.map(c => `
          <div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:12px">
            <div class="flex-center gap-8">
              <span style="font-size:18px">${c.emoji||'📂'}</span>
              <div>
                <div style="font-size:13px;font-weight:500">${c.name}</div>
                ${c.monthly_cap ? `<div style="font-size:11px;color:var(--muted)">cap: ${fmt(c.monthly_cap)}/mo</div>` : ''}
              </div>
            </div>
            ${!c.is_system ? `<button class="btn btn-icon btn-danger" onclick="deleteCat('${c.id}')">${ICONS.trash}</button>` : '<span style="font-size:10px;color:var(--muted)">system</span>'}
          </div>`).join('')}
      </div>
      <div id="cat-modal"></div>`;

  } else if (tab === 'uncategorized') {
    API.get('/api/transactions?category_id=cat-uncategorized&limit=100').then(txs => {
      el.innerHTML = `
        <div class="flex-between mb-16">
          <span class="text-muted">${txs.length} uncategorized transactions</span>
          <button class="btn btn-ghost btn-sm" onclick="reapplyRules()">re-apply rules</button>
        </div>
        ${txs.length === 0 ? `<div class="empty-state"><p>all transactions are categorized ✓</p></div>` :
          `<div class="table-wrap"><table>
            <thead><tr><th>date</th><th>payee</th><th>amount</th><th>assign to</th></tr></thead>
            <tbody>
              ${txs.map(tx => `<tr>
                <td>${fmtDate(tx.date)}</td>
                <td>${tx.payee}</td>
                <td class="${amtClass(tx.amount)}">${fmt(tx.amount)}</td>
                <td>
                  <select class="form-select" style="padding:4px 6px;font-size:12px" onchange="updateTxCategory('${tx.id}',this.value)">
                    ${(window._catCats||[]).map(c => `<option value="${c.id}" ${c.id==='cat-uncategorized'?'selected':''}>${c.emoji||''} ${c.name}</option>`).join('')}
                  </select>
                </td>
              </tr>`).join('')}
            </tbody>
          </table></div>`}`;
    });
  }
}

async function deleteRule(id) {
  if (!confirm('Delete this rule?')) return;
  try {
    await API.del(`/api/rules/${id}`);
    window._catRules = (window._catRules||[]).filter(r => r.id !== id);
    showCatTab('rules');
    toast('rule deleted','info');
  } catch(e) { toast(e.message,'error'); }
}

async function reapplyRules() {
  try {
    const r = await API.post('/api/rules/reapply', {});
    toast(`re-applied rules to ${r.updated} transactions`,'success');
  } catch(e) { toast(e.message,'error'); }
}

async function deleteCat(id) {
  if (!confirm('Delete this category? Transactions will move to Uncategorized.')) return;
  try {
    await API.del(`/api/categories/${id}`);
    const [rules, cats] = await Promise.all([API.get('/api/rules'), API.get('/api/categories')]);
    window._catRules = rules; window._catCats = cats;
    showCatTab('categories');
    toast('category deleted','info');
  } catch(e) { toast(e.message,'error'); }
}

function showAddRule() {
  const cats = window._catCats || [];
  const el = document.getElementById('rule-modal');
  el.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(26,24,20,0.4);z-index:100;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:400px">
        <div class="card-header"><span class="card-title">new rule</span>
          <button class="btn btn-icon btn-ghost" onclick="document.getElementById('rule-modal').innerHTML=''">✕</button></div>
        <form id="add-rule-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">field</label>
              <select class="form-select" name="field">
                <option value="payee">payee</option>
                <option value="amount">amount</option>
                <option value="memo">memo</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">operator</label>
              <select class="form-select" name="operator">
                <option value="contains">contains</option>
                <option value="startswith">starts with</option>
                <option value="exact">exact</option>
                <option value="regex">regex</option>
                <option value="fuzzy">fuzzy</option>
              </select>
            </div>
          </div>
          <div class="form-group"><label class="form-label">value</label>
            <input class="form-input" name="value" placeholder="amazon" required></div>
          <div class="form-group"><label class="form-label">assign to category</label>
            <select class="form-select" name="category_id" required>
              ${cats.map(c => `<option value="${c.id}">${c.emoji||''} ${c.name}</option>`).join('')}
            </select></div>
          <div class="form-group"><label class="form-label">priority (higher = first)</label>
            <input class="form-input" name="priority" type="number" value="0"></div>
          <div class="flex gap-8">
            <button type="submit" class="btn btn-primary">save rule</button>
            <button type="button" class="btn btn-ghost" onclick="document.getElementById('rule-modal').innerHTML=''">cancel</button>
          </div>
        </form>
      </div>
    </div>`;

  document.getElementById('add-rule-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const r = await API.post('/api/rules', Object.fromEntries(fd));
      window._catRules = await API.get('/api/rules');
      document.getElementById('rule-modal').innerHTML = '';
      showCatTab('rules');
      toast('rule saved','success');
    } catch(err) { toast(err.message,'error'); }
  });
}

function showAddCat() {
  const el = document.getElementById('cat-modal');
  el.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(26,24,20,0.4);z-index:100;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:360px">
        <div class="card-header"><span class="card-title">new category</span>
          <button class="btn btn-icon btn-ghost" onclick="document.getElementById('cat-modal').innerHTML=''">✕</button></div>
        <form id="add-cat-form">
          <div class="form-group"><label class="form-label">name</label><input class="form-input" name="name" required></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">emoji</label><input class="form-input" name="emoji" value="📂" style="width:70px"></div>
            <div class="form-group"><label class="form-label">color</label><input type="color" name="color" value="#CC6B3D" class="form-input" style="padding:2px"></div>
          </div>
          <div class="form-group"><label class="form-label">monthly cap ($)</label><input class="form-input" name="monthly_cap" type="number" step="50" placeholder="optional"></div>
          <div class="flex gap-8">
            <button type="submit" class="btn btn-primary">save</button>
            <button type="button" class="btn btn-ghost" onclick="document.getElementById('cat-modal').innerHTML=''">cancel</button>
          </div>
        </form>
      </div>
    </div>`;

  document.getElementById('add-cat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.post('/api/categories', Object.fromEntries(fd));
      const [rules, cats] = await Promise.all([API.get('/api/rules'), API.get('/api/categories')]);
      window._catRules = rules; window._catCats = cats;
      document.getElementById('cat-modal').innerHTML = '';
      showCatTab('categories');
      toast('category created','success');
    } catch(err) { toast(err.message,'error'); }
  });
}
