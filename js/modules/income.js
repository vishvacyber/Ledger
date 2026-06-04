let taxChart;
const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

async function loadIncome() {
  const el = document.getElementById('mod-income');
  el.innerHTML = `<div class="module-header"><h2>income & tax</h2><p>2024 irs 7-bracket engine — all 50 states + dc</p></div>
    <div id="income-body"><div class="text-muted" style="padding:40px;text-align:center">loading…</div></div>`;
  try {
    const data = await API.get('/api/tax');
    renderIncome(data);
  } catch(e) { toast(e.message,'error'); }
}

function renderIncome(data) {
  const s = data.settings || {};
  const c = data.calc || {};

  document.getElementById('income-body').innerHTML = `
    <div class="grid-2" style="gap:24px;align-items:start">
      <!-- Input form -->
      <div class="card">
        <div class="card-header"><span class="card-title">tax settings</span></div>
        <form id="tax-form">
          <div class="form-group">
            <label class="form-label">gross annual salary</label>
            <input class="form-input" name="gross_salary" type="number" step="1000" value="${s.gross_salary||0}" placeholder="75000">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">pay period</label>
              <select class="form-select" name="pay_period">
                ${['weekly','biweekly','semimonthly','monthly','annual'].map(p =>
                  `<option value="${p}" ${s.pay_period===p?'selected':''}>${p}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">filing status</label>
              <select class="form-select" name="filing_status">
                ${[['single','single'],['married_joint','married (joint)'],['married_separate','married (separate)'],['head_of_household','head of household']].map(([v,l]) =>
                  `<option value="${v}" ${s.filing_status===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">state</label>
            <select class="form-select" name="state">
              ${STATES.map(st => `<option value="${st}" ${s.state===st?'selected':''}>${st}</option>`).join('')}
            </select>
          </div>
          <div class="divider"></div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">401(k) pre-tax ($)</label>
              <input class="form-input" name="pretax_401k" type="number" step="100" value="${s.pretax_401k||0}">
            </div>
            <div class="form-group">
              <label class="form-label">hsa pre-tax ($)</label>
              <input class="form-input" name="pretax_hsa" type="number" step="100" value="${s.pretax_hsa||0}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">fsa pre-tax ($)</label>
              <input class="form-input" name="pretax_fsa" type="number" step="100" value="${s.pretax_fsa||0}">
            </div>
            <div class="form-group" style="display:flex;align-items:center;padding-top:20px;gap:8px">
              <input type="checkbox" id="fica-exempt" name="fica_exempt" ${s.fica_exempt?'checked':''}>
              <label for="fica-exempt" class="form-label" style="margin:0">fica exempt</label>
            </div>
          </div>
          <button type="submit" class="btn btn-primary w-full mt-8">calculate</button>
        </form>
      </div>

      <!-- Results -->
      <div>
        <div class="grid-2 mb-16">
          <div class="card">
            <div class="card-title">net take-home / year</div>
            <div class="card-value text-mono text-success" id="res-net-year">${fmt(c.net_annual||0)}</div>
          </div>
          <div class="card">
            <div class="card-title">net per period</div>
            <div class="card-value text-mono" id="res-net-period">${fmt(c.net_per_period||0)}</div>
          </div>
          <div class="card">
            <div class="card-title">effective tax rate</div>
            <div class="card-value text-mono" id="res-eff">${fmtPct(c.effective_rate||0)}</div>
          </div>
          <div class="card">
            <div class="card-title">marginal rate</div>
            <div class="card-value text-mono" id="res-marginal">${fmtPct(c.marginal_rate||0)}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">breakdown</span></div>
          <div style="display:flex;align-items:center;gap:20px">
            <div style="width:160px;height:160px;flex-shrink:0"><canvas id="chart-tax-donut"></canvas></div>
            <div id="tax-legend" style="flex:1;font-size:13px;display:flex;flex-direction:column;gap:8px"></div>
          </div>
        </div>

        <div class="card mt-16">
          <div class="card-header"><span class="card-title">detailed breakdown</span></div>
          <div id="tax-detail-table"></div>
        </div>
      </div>
    </div>
  `;

  renderTaxResults(c);

  document.getElementById('tax-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      gross_salary: fd.get('gross_salary'),
      pay_period: fd.get('pay_period'),
      filing_status: fd.get('filing_status'),
      state: fd.get('state'),
      pretax_401k: fd.get('pretax_401k'),
      pretax_hsa: fd.get('pretax_hsa'),
      pretax_fsa: fd.get('pretax_fsa'),
      fica_exempt: fd.get('fica_exempt') === 'on',
    };
    try {
      const data = await API.post('/api/tax', body);
      renderTaxResults(data.calc);
      toast('tax settings saved', 'success');
    } catch(err) { toast(err.message,'error'); }
  });

  // Live update on input change
  document.querySelectorAll('#tax-form input, #tax-form select').forEach(input => {
    input.addEventListener('change', () => document.getElementById('tax-form').requestSubmit());
  });
}

function renderTaxResults(c) {
  if (!c || !c.breakdown) return;
  document.getElementById('res-net-year').textContent   = fmt(c.net_annual||0);
  document.getElementById('res-net-period').textContent = fmt(c.net_per_period||0);
  document.getElementById('res-eff').textContent        = fmtPct(c.effective_rate||0);
  document.getElementById('res-marginal').textContent   = fmtPct(c.marginal_rate||0);

  const b = c.breakdown;
  const COLORS = ['#B94040','#CC6B3D','#8A8680','#7A6B5D','#4A7C59'];
  const labels = ['federal tax','state tax','fica','pre-tax deductions','net take-home'];
  const values = [b.federal, b.state, b.fica, b.pretax_deductions, b.net_take_home];

  if (taxChart) taxChart.destroy();
  taxChart = new Chart(document.getElementById('chart-tax-donut'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: values.map(Math.abs), backgroundColor: COLORS, borderWidth: 0, hoverOffset: 4 }],
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } },
  });

  document.getElementById('tax-legend').innerHTML = labels.map((l, i) => `
    <div class="flex-between">
      <div class="flex-center gap-8">
        <span style="width:8px;height:8px;border-radius:2px;background:${COLORS[i]};flex-shrink:0"></span>
        <span>${l}</span>
      </div>
      <span class="text-mono">${fmt(values[i])}</span>
    </div>`).join('');

  document.getElementById('tax-detail-table').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
      <span class="text-muted">gross annual</span><span class="text-mono">${fmt(c.gross_annual)}</span>
      <span class="text-muted">pre-tax deductions</span><span class="text-mono text-success">−${fmt(c.pretax_deductions)}</span>
      <span class="text-muted">agi</span><span class="text-mono">${fmt(c.agi)}</span>
      <span class="text-muted">federal taxable income</span><span class="text-mono">${fmt(c.federal_taxable)}</span>
      <span class="text-muted">federal income tax</span><span class="text-mono text-danger">−${fmt(c.federal_tax)}</span>
      <span class="text-muted">state income tax</span><span class="text-mono text-danger">−${fmt(c.state_tax)}</span>
      <span class="text-muted">fica (ss + medicare)</span><span class="text-mono text-danger">−${fmt(c.fica_tax)}</span>
      <span class="text-muted">total tax</span><span class="text-mono text-danger">−${fmt(c.total_tax)}</span>
      <span class="text-muted" style="font-weight:500">net annual</span><span class="text-mono text-success" style="font-weight:500">${fmt(c.net_annual)}</span>
    </div>`;
}
