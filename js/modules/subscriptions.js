async function loadSubscriptions() {
  const el = document.getElementById('mod-subscriptions');
  el.innerHTML = `<div class="module-header"><h2>subscriptions & bills</h2><p>recurring charges, price spikes, upcoming payments</p></div>
    <div id="sub-body"><div class="text-muted" style="padding:40px;text-align:center">loading…</div></div>`;
  try {
    const expenses = await API.get('/api/fixed-expenses');
    renderSubscriptions(expenses);
  } catch(e) { toast(e.message,'error'); }
}

function renderSubscriptions(expenses) {
  const subs = expenses.filter(e => e.is_subscription);
  const bills = expenses.filter(e => !e.is_subscription);
  const upcoming = expenses.filter(e => e.days_until <= 7 && e.status === 'active').sort((a,b) => a.days_until - b.days_until);
  const annualTotal = expenses.filter(e => e.status === 'active').reduce((s, e) => s + (e.annual_cost||0), 0);
  const monthlyTotal = expenses.filter(e => e.status === 'active' && e.frequency === 'monthly').reduce((s, e) => s + e.amount, 0);

  document.getElementById('sub-body').innerHTML = `
    <!-- KPIs -->
    <div class="grid-3 mb-16">
      <div class="card">
        <div class="card-title">monthly recurring</div>
        <div class="card-value text-mono">${fmt(monthlyTotal)}</div>
      </div>
      <div class="card">
        <div class="card-title">annual total</div>
        <div class="card-value text-mono">${fmt(annualTotal)}</div>
      </div>
      <div class="card">
        <div class="card-title">upcoming (7 days)</div>
        <div class="card-value text-mono">${upcoming.length}</div>
        <div class="card-delta text-muted">${fmt(upcoming.reduce((s,e)=>s+e.amount,0))} due soon</div>
      </div>
    </div>

    ${upcoming.length > 0 ? `
    <div class="card mb-16" style="border-left:3px solid var(--accent)">
      <div class="card-header"><span class="card-title">${ICONS.alert} upcoming payments</span></div>
      <div>
        ${upcoming.map(e => `
          <div class="flex-between" style="padding:8px 0;border-bottom:0.5px solid var(--border)">
            <div><span style="font-size:13px">${e.name}</span>
              <span class="text-muted" style="font-size:11px;margin-left:8px">${e.days_until === 0 ? 'due today' : `in ${e.days_until} day${e.days_until>1?'s':''}`}</span></div>
            <span class="text-mono">${fmt(e.amount)}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- Bills calendar -->
    <div class="card mb-16">
      <div class="card-header"><span class="card-title">bills calendar</span></div>
      <div id="bills-calendar" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;font-size:11px"></div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="showSubTab('subscriptions',this)">subscriptions</button>
      <button class="tab-btn" onclick="showSubTab('bills',this)">bills</button>
    </div>
    <div id="sub-tab-content"></div>
    <div id="sub-modal"></div>
  `;

  renderBillsCalendar(expenses);
  window._subExpenses = expenses;
  showSubTab('subscriptions');
}

function renderBillsCalendar(expenses) {
  const cal = document.getElementById('bills-calendar');
  const days = Array.from({length: 31}, (_,i) => i+1);
  cal.innerHTML = days.map(d => {
    const items = expenses.filter(e => e.due_day === d && e.status === 'active');
    return `<div style="min-height:32px;padding:3px;background:var(--bg);border-radius:4px;border:0.5px solid var(--border)">
      <div style="color:var(--muted);font-size:10px;margin-bottom:2px">${d}</div>
      ${items.map(e => `<div style="background:var(--accent);color:#fff;border-radius:2px;padding:1px 3px;font-size:9px;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${e.name}: ${fmt(e.amount)}">${e.name.slice(0,8)}</div>`).join('')}
    </div>`;
  }).join('');
}

function showSubTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const expenses = window._subExpenses || [];
  const items = tab === 'subscriptions' ? expenses.filter(e => e.is_subscription) : expenses.filter(e => !e.is_subscription);
  const el = document.getElementById('sub-tab-content');

  el.innerHTML = `
    <div class="flex-between mb-16 mt-8">
      <span class="text-muted" style="font-size:13px">${items.length} ${tab}</span>
      <button class="btn btn-primary btn-sm" onclick="showAddExpense(${tab==='subscriptions'?1:0})">${ICONS.plus} add ${tab === 'subscriptions' ? 'subscription' : 'bill'}</button>
    </div>
    ${items.length === 0 ? `<div class="empty-state"><p>no ${tab} yet</p></div>` :
      `<div class="table-wrap"><table>
        <thead><tr><th>name</th><th>amount</th><th>frequency</th><th>due day</th><th>annual cost</th><th>next due</th><th>status</th><th></th></tr></thead>
        <tbody>
          ${items.map(e => `<tr>
            <td>${e.name} ${e.last_seen_amount && Math.abs((e.amount - e.last_seen_amount)/e.last_seen_amount) > 0.05 ? `<span class="badge" style="background:rgba(185,64,64,0.1);color:var(--danger)">${ICONS.alert} price spike</span>` : ''}</td>
            <td class="text-mono">${fmt(e.amount)}</td>
            <td class="text-muted">${e.frequency}</td>
            <td class="text-muted">${e.due_day || '—'}</td>
            <td class="text-mono">${fmt(e.annual_cost)}</td>
            <td class="text-muted">${e.next_due} <span style="font-size:11px;color:${e.days_until<=3?'var(--danger)':'var(--muted)'}">in ${e.days_until}d</span></td>
            <td><span class="badge ${e.status==='active'?'':''}">active</span></td>
            <td><button class="btn btn-icon btn-danger" onclick="deleteExpense('${e.id}')">${ICONS.trash}</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`}`;
}

function showAddExpense(isSub) {
  const el = document.getElementById('sub-modal');
  el.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(26,24,20,0.4);z-index:100;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:380px">
        <div class="card-header"><span class="card-title">add ${isSub ? 'subscription' : 'bill'}</span>
          <button class="btn btn-icon btn-ghost" onclick="document.getElementById('sub-modal').innerHTML=''">✕</button></div>
        <form id="add-exp-form">
          <input type="hidden" name="is_subscription" value="${isSub}">
          <div class="form-group"><label class="form-label">name</label><input class="form-input" name="name" placeholder="${isSub?'Netflix, Spotify…':'Rent, Electric bill…'}" required></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">amount ($)</label><input class="form-input" name="amount" type="number" step="0.01" required></div>
            <div class="form-group"><label class="form-label">frequency</label>
              <select class="form-select" name="frequency">
                ${['monthly','annual','quarterly','weekly','biweekly'].map(f=>`<option value="${f}">${f}</option>`).join('')}
              </select></div>
          </div>
          <div class="form-group"><label class="form-label">due day of month</label><input class="form-input" name="due_day" type="number" min="1" max="31" placeholder="1-31"></div>
          <div class="flex gap-8">
            <button type="submit" class="btn btn-primary">save</button>
            <button type="button" class="btn btn-ghost" onclick="document.getElementById('sub-modal').innerHTML=''">cancel</button>
          </div>
        </form>
      </div>
    </div>`;

  document.getElementById('add-exp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.post('/api/fixed-expenses', Object.fromEntries(fd));
      document.getElementById('sub-modal').innerHTML = '';
      toast('saved','success');
      loadSubscriptions();
    } catch(err) { toast(err.message,'error'); }
  });
}

async function deleteExpense(id) {
  if (!confirm('Delete this entry?')) return;
  try {
    await API.del(`/api/fixed-expenses/${id}`);
    toast('deleted','info');
    loadSubscriptions();
  } catch(e) { toast(e.message,'error'); }
}
