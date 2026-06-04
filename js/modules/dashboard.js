let dashCharts = {};

async function loadDashboard() {
  const el = document.getElementById('mod-dashboard');
  el.innerHTML = `<div class="module-header"><h2>command dashboard</h2><p>your financial overview at a glance</p></div>
    <div id="dash-body"><div class="text-muted" style="padding:40px;text-align:center">loading…</div></div>`;

  try {
    const [summary, goal] = await Promise.all([
      API.get('/api/dashboard/summary'),
      API.get('/api/goals'),
    ]);
    renderDashboard(summary, goal);
  } catch (e) {
    toast(e.message, 'error');
  }
}

function renderDashboard(s, goal) {
  const el = document.getElementById('dash-body');

  const income = s.cash_flow.income;
  const expenses = s.cash_flow.expenses;
  const net = s.cash_flow.net;
  const savingsTarget = goal?.savings_target || 2000;
  const savingsPct = Math.min(100, income > 0 ? Math.round((net / savingsTarget) * 100) : 0);

  el.innerHTML = `
    <!-- KPI row -->
    <div class="grid-4 mb-16">
      <div class="card">
        <div class="card-title">income this month</div>
        <div class="card-value text-mono">${fmt(income)}</div>
        <div class="card-delta pos">net take-home</div>
      </div>
      <div class="card">
        <div class="card-title">expenses this month</div>
        <div class="card-value text-mono">${fmt(expenses)}</div>
        <div class="card-delta ${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? 'under' : 'over'} budget</div>
      </div>
      <div class="card">
        <div class="card-title">net cash flow</div>
        <div class="card-value text-mono ${net >= 0 ? 'text-success' : 'text-danger'}">${fmt(net)}</div>
        <div class="card-delta ${net >= 0 ? 'pos' : 'neg'}">${net >= 0 ? '✓ positive' : '⚠ negative'}</div>
      </div>
      <div class="card">
        <div class="card-title">savings goal</div>
        <div class="card-value text-mono">${savingsPct}%</div>
        <div class="progress mt-8"><div class="progress-fill ${savingsPct >= 100 ? 'success' : ''}" style="width:${savingsPct}%"></div></div>
        <div class="card-delta mt-8 text-muted">${fmt(net)} of ${fmt(savingsTarget)}</div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="grid-2 mb-16">
      <div class="card">
        <div class="card-header"><span class="card-title">income vs expenses — 12 months</span></div>
        <div class="chart-container" style="height:200px"><canvas id="chart-cashflow"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">spending by category</span></div>
        <div style="display:flex;align-items:center;gap:16px">
          <div style="width:160px;height:160px;flex-shrink:0"><canvas id="chart-donut"></canvas></div>
          <div id="donut-legend" style="flex:1;font-size:12px;display:flex;flex-direction:column;gap:5px"></div>
        </div>
      </div>
    </div>

    <!-- Net worth + accounts -->
    <div class="grid-2 mb-16">
      <div class="card">
        <div class="card-header">
          <span class="card-title">net worth</span>
          ${s.net_worth_delta !== 0 ? `<span class="badge ${s.net_worth_delta > 0 ? '' : ''}">${s.net_worth_delta > 0 ? '+' : ''}${fmt(s.net_worth_delta)} mo</span>` : ''}
        </div>
        <div class="card-value text-mono">${fmt(s.net_worth?.net_worth || 0)}</div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px">
          <span class="text-success">assets ${fmt(s.net_worth?.total_assets || 0)}</span>
          <span class="text-danger">liabilities ${fmt(s.net_worth?.total_liabilities || 0)}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">accounts</span>
          <button class="btn btn-sm btn-ghost" onclick="navigate('accounts')">${ICONS.plus} add</button>
        </div>
        <div id="account-list">
          ${s.accounts.length === 0
            ? `<div class="text-muted" style="font-size:12px;padding:12px 0">no accounts yet</div>`
            : s.accounts.map(a => `
              <div class="flex-between" style="padding:6px 0;border-bottom:0.5px solid var(--border)">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="width:8px;height:8px;border-radius:50%;background:${a.color_token || '#CC6B3D'};flex-shrink:0"></span>
                  <span>${a.name}</span>
                  <span class="text-muted" style="font-size:11px">${a.type}</span>
                </div>
                <span class="text-mono ${amtClass(a.computed_balance)}">${fmt(a.computed_balance)}</span>
              </div>`).join('')}
        </div>
      </div>
    </div>

    <!-- 12-month P&L table -->
    <div class="card">
      <div class="card-header"><span class="card-title">12-month p&l</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>month</th><th>income</th><th>expenses</th><th>net</th><th>sparkline</th></tr></thead>
          <tbody>
            ${s.monthly_data.map(m => `
              <tr>
                <td>${m.month}</td>
                <td class="amount-pos">${fmt(m.income)}</td>
                <td class="amount-neg">${fmt(m.expenses)}</td>
                <td class="${amtClass(m.income - m.expenses)}">${fmt(m.income - m.expenses)}</td>
                <td><div style="width:80px;height:20px"><canvas class="spark-canvas" data-income="${m.income}" data-expenses="${m.expenses}"></canvas></div></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Cash flow combo chart
  const labels = s.monthly_data.map(m => m.month.slice(5));
  destroyChart('chart-cashflow');
  dashCharts['chart-cashflow'] = new Chart(document.getElementById('chart-cashflow'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'income', data: s.monthly_data.map(m => m.income), backgroundColor: 'rgba(74,124,89,0.7)', borderRadius: 4 },
        { label: 'expenses', data: s.monthly_data.map(m => m.expenses), backgroundColor: 'rgba(204,107,61,0.7)', borderRadius: 4 },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } },
  });

  // Donut chart
  const cats = s.category_breakdown.slice(0, 7);
  const COLORS = ['#CC6B3D','#4A7C59','#8A8680','#B94040','#7A6B5D','#5B8FA8','#A67C52'];
  destroyChart('chart-donut');
  dashCharts['chart-donut'] = new Chart(document.getElementById('chart-donut'), {
    type: 'doughnut',
    data: {
      labels: cats.map(c => c.name),
      datasets: [{ data: cats.map(c => c.total), backgroundColor: COLORS, borderWidth: 0, hoverOffset: 4 }],
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } },
  });

  const legend = document.getElementById('donut-legend');
  legend.innerHTML = cats.map((c, i) => `
    <div class="flex-center gap-8">
      <span style="width:8px;height:8px;border-radius:2px;background:${COLORS[i]};flex-shrink:0"></span>
      <span>${c.emoji || ''} ${c.name}</span>
      <span class="text-muted" style="margin-left:auto">${fmt(c.total)}</span>
    </div>`).join('');

  // Goal editing
  document.querySelectorAll('.spark-canvas').forEach(canvas => {
    const inc = parseFloat(canvas.dataset.income);
    const exp = parseFloat(canvas.dataset.expenses);
    const ctx = canvas.getContext('2d');
    canvas.width = 80; canvas.height = 20;
    const net = inc - exp;
    ctx.fillStyle = net >= 0 ? '#4A7C59' : '#B94040';
    const h = Math.min(20, Math.abs(net) / Math.max(inc, exp, 1) * 20);
    ctx.fillRect(0, 20 - h, 80, h);
  });
}

function destroyChart(id) {
  if (dashCharts[id]) { dashCharts[id].destroy(); delete dashCharts[id]; }
}
