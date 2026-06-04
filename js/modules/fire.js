let fireChart;

async function loadFire() {
  const el = document.getElementById('mod-fire');
  el.innerHTML = `<div class="module-header"><h2>fire calculator</h2><p>trinity study swr · standard, coast, lean, fat-fire variants</p></div>
    <div id="fire-body"><div class="text-muted" style="padding:40px;text-align:center">loading…</div></div>`;
  try {
    const data = await API.get('/api/fire');
    renderFire(data);
  } catch(e) { toast(e.message,'error'); }
}

function renderFire({ settings: s = {}, projections: p = {} }) {
  document.getElementById('fire-body').innerHTML = `
    <div class="grid-2" style="gap:24px;align-items:start">
      <!-- Settings -->
      <div class="card">
        <div class="card-header"><span class="card-title">fire settings</span></div>
        <form id="fire-form">
          <div class="form-row">
            <div class="form-group"><label class="form-label">current age</label>
              <input class="form-input" name="current_age" type="number" value="${s.current_age||30}"></div>
            <div class="form-group"><label class="form-label">target retirement age</label>
              <input class="form-input" name="target_retirement_age" type="number" value="${s.target_retirement_age||55}"></div>
          </div>
          <div class="form-group"><label class="form-label">annual expenses ($)</label>
            <input class="form-input" name="annual_expenses" type="number" step="1000" value="${s.annual_expenses||60000}"></div>
          <div class="form-group"><label class="form-label">current portfolio ($)</label>
            <input class="form-input" name="current_portfolio" type="number" step="1000" value="${s.current_portfolio||0}"></div>
          <div class="form-group"><label class="form-label">monthly contribution ($)</label>
            <input class="form-input" name="monthly_contribution" type="number" step="100" value="${s.monthly_contribution||2000}"></div>
          <div class="form-row">
            <div class="form-group"><label class="form-label">expected return</label>
              <input class="form-input" name="expected_return" type="number" step="0.005" value="${s.expected_return||0.07}" placeholder="0.07"></div>
            <div class="form-group"><label class="form-label">swr</label>
              <input class="form-input" name="swr" type="number" step="0.005" value="${s.swr||0.04}" placeholder="0.04"></div>
          </div>
          <div class="form-group"><label class="form-label">fire variant</label>
            <select class="form-select" name="fire_variant">
              ${[['standard','standard fire'],['lean','lean fire (70% expenses)'],['coast','coast fire'],['fat-fire','fat fire (1.5× expenses)']].map(([v,l])=>
                `<option value="${v}" ${s.fire_variant===v?'selected':''}>${l}</option>`).join('')}
            </select></div>
          <button type="submit" class="btn btn-primary w-full">calculate</button>
        </form>
      </div>

      <!-- Results -->
      <div>
        <div class="grid-2 mb-16">
          <div class="card">
            <div class="card-title">fire number</div>
            <div class="card-value text-mono" id="fire-number">${fmt(p.fire_number||0)}</div>
          </div>
          <div class="card">
            <div class="card-title">years to fire</div>
            <div class="card-value text-mono" id="fire-years">${p.years_to_fire||'—'}</div>
          </div>
          <div class="card">
            <div class="card-title">fire age</div>
            <div class="card-value text-mono" id="fire-age">${p.fire_age||'—'}</div>
          </div>
          <div class="card">
            <div class="card-title">coast fire amount</div>
            <div class="card-value text-mono" id="coast-fire">${fmt(p.coast_fire||0)}</div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><span class="card-title">progress to fire</span></div>
          <div class="flex-between mb-8">
            <span class="text-muted" style="font-size:12px">${fmt(s.current_portfolio||0)} of ${fmt(p.fire_number||0)}</span>
            <span id="fire-pct" style="font-size:13px;font-weight:500">${p.progress_pct||0}%</span>
          </div>
          <div class="progress"><div class="progress-fill ${(p.progress_pct||0)>=100?'success':''}" id="fire-bar" style="width:${p.progress_pct||0}%"></div></div>
        </div>

        <!-- SWR range -->
        <div class="card mb-16">
          <div class="card-header"><span class="card-title">swr sensitivity (3.5–4.5%)</span></div>
          <div id="swr-range">
            ${(p.swr_range||[]).map(r => `
              <div class="flex-between" style="padding:6px 0;border-bottom:0.5px solid var(--border)">
                <span class="text-muted">at ${r.rate}</span>
                <span class="text-mono">${fmt(r.fire_number)}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Portfolio growth chart -->
    <div class="card mt-16 mb-16">
      <div class="card-header"><span class="card-title">projected portfolio growth</span></div>
      <div style="height:200px"><canvas id="chart-fire"></canvas></div>
    </div>

    <!-- Sensitivity table -->
    <div class="card">
      <div class="card-header"><span class="card-title">monthly contribution sensitivity</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>monthly contribution</th><th>years to fire</th><th>fire age</th></tr></thead>
          <tbody id="sensitivity-table">
            ${(p.sensitivity_table||[]).map(r => `
              <tr ${r.contribution===(s.monthly_contribution||2000)?'style="background:rgba(204,107,61,0.06);font-weight:500"':''}>
                <td>${fmt(r.contribution)}</td>
                <td>${r.years} yrs</td>
                <td>age ${r.age}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderFireChart(p.growth_timeline || []);

  document.getElementById('fire-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const data = await API.post('/api/fire', Object.fromEntries(fd));
      updateFireResults(data.projections);
      toast('fire projections updated','success');
    } catch(err) { toast(err.message,'error'); }
  });

  document.querySelectorAll('#fire-form input, #fire-form select').forEach(input => {
    input.addEventListener('input', () => document.getElementById('fire-form').requestSubmit());
  });
}

function updateFireResults(p) {
  document.getElementById('fire-number').textContent = fmt(p.fire_number||0);
  document.getElementById('fire-years').textContent = p.years_to_fire||'—';
  document.getElementById('fire-age').textContent = p.fire_age||'—';
  document.getElementById('coast-fire').textContent = fmt(p.coast_fire||0);
  document.getElementById('fire-pct').textContent = `${p.progress_pct||0}%`;
  document.getElementById('fire-bar').style.width = `${p.progress_pct||0}%`;
  renderFireChart(p.growth_timeline || []);
}

function renderFireChart(timeline) {
  if (fireChart) fireChart.destroy();
  if (!timeline.length) return;
  const ctx = document.getElementById('chart-fire');
  if (!ctx) return;
  fireChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timeline.map(t => `age ${t.year}`),
      datasets: [{
        label: 'portfolio value',
        data: timeline.map(t => t.value),
        borderColor: '#CC6B3D',
        backgroundColor: 'rgba(204,107,61,0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } },
  });
}
