let nwChart;

async function loadNetWorth() {
  const el = document.getElementById('mod-networth');
  el.innerHTML = `<div class="module-header"><h2>net worth tracker</h2><p>assets, liabilities, monthly snapshots</p></div>
    <div id="nw-body"><div class="text-muted" style="padding:40px;text-align:center">loading…</div></div>`;
  try {
    const data = await API.get('/api/net-worth');
    renderNetWorth(data);
  } catch(e) { toast(e.message,'error'); }
}

function renderNetWorth(data) {
  const { items, snapshots, total_assets, total_liabilities, net_worth } = data;
  const assets = items.filter(i => i.type === 'asset');
  const liabs = items.filter(i => i.type === 'liability');
  const prevSnap = snapshots[1];
  const nwDelta = prevSnap ? net_worth - prevSnap.net_worth : 0;

  document.getElementById('nw-body').innerHTML = `
    <!-- KPI row -->
    <div class="grid-3 mb-16">
      <div class="card">
        <div class="card-title">net worth</div>
        <div class="card-value text-mono ${net_worth >= 0 ? 'text-success' : 'text-danger'}">${fmt(net_worth)}</div>
        ${prevSnap ? `<div class="card-delta ${nwDelta >= 0 ? 'pos' : 'neg'}">${nwDelta >= 0 ? '+' : ''}${fmt(nwDelta)} vs last month</div>` : ''}
      </div>
      <div class="card">
        <div class="card-title">total assets</div>
        <div class="card-value text-mono text-success">${fmt(total_assets)}</div>
      </div>
      <div class="card">
        <div class="card-title">total liabilities</div>
        <div class="card-value text-mono text-danger">${fmt(total_liabilities)}</div>
        ${total_assets > 0 ? `<div class="card-delta text-muted">dti: ${Math.round((total_liabilities/total_assets)*100)}%</div>` : ''}
      </div>
    </div>

    <!-- Chart + items -->
    <div class="grid-2 mb-16">
      <div class="card">
        <div class="card-header"><span class="card-title">net worth history</span></div>
        <div style="height:200px"><canvas id="chart-nw"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">debt payoff projection</span></div>
        <div id="debt-projection"></div>
      </div>
    </div>

    <!-- Assets & Liabilities -->
    <div class="grid-2" style="gap:16px">
      <div class="card">
        <div class="card-header">
          <span class="card-title">assets</span>
          <button class="btn btn-sm btn-primary" onclick="showAddNW('asset')">${ICONS.plus} add asset</button>
        </div>
        <div id="asset-list">
          ${assets.length === 0 ? `<div class="empty-state"><p>no assets yet</p></div>` :
            assets.map(a => `
              <div class="flex-between" style="padding:8px 0;border-bottom:0.5px solid var(--border)">
                <div>
                  <div style="font-size:13px">${a.name}</div>
                  <div style="font-size:11px;color:var(--muted)">${a.subtype || a.type} · ${fmtDate(a.as_of_date)}</div>
                </div>
                <div class="flex-center gap-8">
                  <span class="text-mono text-success">${fmt(a.value)}</span>
                  <button class="btn btn-icon btn-danger" onclick="deleteNW('${a.id}')">${ICONS.trash}</button>
                </div>
              </div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">liabilities</span>
          <button class="btn btn-sm btn-primary" onclick="showAddNW('liability')">${ICONS.plus} add liability</button>
        </div>
        <div id="liab-list">
          ${liabs.length === 0 ? `<div class="empty-state"><p>no liabilities yet</p></div>` :
            liabs.map(l => `
              <div class="flex-between" style="padding:8px 0;border-bottom:0.5px solid var(--border)">
                <div>
                  <div style="font-size:13px">${l.name}</div>
                  <div style="font-size:11px;color:var(--muted)">${l.subtype || l.type} · ${fmtDate(l.as_of_date)}</div>
                </div>
                <div class="flex-center gap-8">
                  <span class="text-mono text-danger">${fmt(l.value)}</span>
                  <button class="btn btn-icon btn-danger" onclick="deleteNW('${l.id}')">${ICONS.trash}</button>
                </div>
              </div>`).join('')}
        </div>
      </div>
    </div>

    <div id="nw-modal"></div>
  `;

  // Net worth chart
  if (nwChart) nwChart.destroy();
  if (snapshots.length > 1) {
    const snaps = [...snapshots].reverse();
    nwChart = new Chart(document.getElementById('chart-nw'), {
      type: 'line',
      data: {
        labels: snaps.map(s => s.snapshot_date.slice(0,7)),
        datasets: [
          { label: 'net worth', data: snaps.map(s => s.net_worth), borderColor: '#4A7C59', backgroundColor: 'rgba(74,124,89,0.1)', fill: true, tension: 0.3, pointRadius: 3 },
          { label: 'assets', data: snaps.map(s => s.total_assets), borderColor: '#CC6B3D', borderDash: [4,4], tension: 0.3, pointRadius: 2 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false } }, plugins: { legend: { display: true, position: 'bottom' } } },
    });
  }

  // Debt payoff projection (snowball vs avalanche)
  if (liabs.length > 0) {
    const totalDebt = total_liabilities;
    const monthly = 500; // example monthly payment
    const snowball = Math.ceil(totalDebt / monthly);
    document.getElementById('debt-projection').innerHTML = `
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px">at ${fmt(monthly)}/month extra payment</div>
      <div class="flex-between mb-8">
        <span>snowball method</span><span class="text-mono">${snowball} months</span>
      </div>
      <div class="flex-between mb-8">
        <span>avalanche method</span><span class="text-mono">${Math.max(1,snowball-2)} months</span>
      </div>
      <div class="flex-between">
        <span>debt-to-asset ratio</span>
        <span class="text-mono ${total_assets > 0 && total_liabilities/total_assets < 0.3 ? 'text-success' : 'text-danger'}">${total_assets > 0 ? Math.round((total_liabilities/total_assets)*100) : '—'}%</span>
      </div>`;
  } else {
    document.getElementById('debt-projection').innerHTML = `<div class="empty-state"><p>no liabilities — debt-free! 🎉</p></div>`;
  }
}

function showAddNW(type) {
  const el = document.getElementById('nw-modal');
  el.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(26,24,20,0.4);z-index:100;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:360px">
        <div class="card-header"><span class="card-title">add ${type}</span>
          <button class="btn btn-icon btn-ghost" onclick="document.getElementById('nw-modal').innerHTML=''">✕</button></div>
        <form id="add-nw-form">
          <input type="hidden" name="type" value="${type}">
          <div class="form-group"><label class="form-label">name</label><input class="form-input" name="name" placeholder="${type==='asset'?'401k, house, savings…':'mortgage, student loan…'}" required></div>
          <div class="form-group"><label class="form-label">subtype</label><input class="form-input" name="subtype" placeholder="${type==='asset'?'investment, real estate, cash…':'mortgage, auto, student…'}"></div>
          <div class="form-group"><label class="form-label">current value ($)</label><input class="form-input" name="value" type="number" step="100" required></div>
          <div class="form-group"><label class="form-label">as of date</label><input class="form-input" name="as_of_date" type="date" value="${new Date().toISOString().split('T')[0]}"></div>
          <div class="flex gap-8">
            <button type="submit" class="btn btn-primary">save</button>
            <button type="button" class="btn btn-ghost" onclick="document.getElementById('nw-modal').innerHTML=''">cancel</button>
          </div>
        </form>
      </div>
    </div>`;

  document.getElementById('add-nw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.post('/api/net-worth', Object.fromEntries(fd));
      document.getElementById('nw-modal').innerHTML = '';
      toast(`${type} saved`,'success');
      loadNetWorth();
    } catch(err) { toast(err.message,'error'); }
  });
}

async function deleteNW(id) {
  if (!confirm('Delete this entry?')) return;
  try {
    await API.del(`/api/net-worth/${id}`);
    toast('deleted','info');
    loadNetWorth();
  } catch(e) { toast(e.message,'error'); }
}
