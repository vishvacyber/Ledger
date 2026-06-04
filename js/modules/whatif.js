let whatifChart;

async function loadWhatIf() {
  const el = document.getElementById('mod-whatif');
  el.innerHTML = `<div class="module-header"><h2>what-if simulator</h2><p>per-category sliders — live nw delta + fire date shift</p></div>
    <div id="wi-body"><div class="text-muted" style="padding:40px;text-align:center">loading…</div></div>`;
  try {
    const [cats, scenarios, fire] = await Promise.all([
      API.get('/api/categories'),
      API.get('/api/whatif/scenarios'),
      API.get('/api/fire'),
    ]);
    renderWhatIf(cats, scenarios, fire);
  } catch(e) { toast(e.message,'error'); }
}

function renderWhatIf(cats, scenarios, fire) {
  const spendCats = cats.filter(c => !['cat-income','cat-savings'].includes(c.id));

  document.getElementById('wi-body').innerHTML = `
    <div class="grid-2" style="gap:24px;align-items:start">
      <!-- Sliders -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">adjust monthly spending</span>
          <button class="btn btn-sm btn-ghost" onclick="resetSliders()">reset</button>
        </div>
        <div id="slider-list">
          ${spendCats.map(c => `
            <div style="margin-bottom:14px">
              <div class="flex-between mb-8">
                <span style="font-size:13px">${c.emoji||''} ${c.name}</span>
                <span id="slider-val-${c.id}" style="font-size:13px;font-weight:500;color:var(--accent)">$0</span>
              </div>
              <input type="range" id="slider-${c.id}" min="-500" max="500" step="25" value="0"
                oninput="updateSlider('${c.id}',this.value)" onchange="runSimulation()">
              <div class="flex-between" style="font-size:10px;color:var(--muted)"><span>−$500</span><span>+$500</span></div>
            </div>`).join('')}
        </div>
        <div class="divider"></div>
        <div class="flex gap-8">
          <button class="btn btn-primary" onclick="saveScenario()">save scenario</button>
        </div>
      </div>

      <!-- Results -->
      <div>
        <div class="grid-2 mb-16">
          <div class="card">
            <div class="card-title">monthly nw impact</div>
            <div class="card-value text-mono" id="wi-nw-delta">$0</div>
          </div>
          <div class="card">
            <div class="card-title">fire date shift</div>
            <div class="card-value text-mono" id="wi-fire-shift">0 yrs</div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header"><span class="card-title">baseline vs scenario</span></div>
          <div style="height:160px"><canvas id="chart-whatif"></canvas></div>
        </div>

        <div class="card">
          <div class="card-header"><span class="card-title">saved scenarios</span></div>
          <div id="scenario-list">
            ${scenarios.length === 0 ? `<div class="empty-state"><p>no saved scenarios</p></div>` :
              scenarios.map(sc => `
                <div class="flex-between" style="padding:8px 0;border-bottom:0.5px solid var(--border)">
                  <div>
                    <div style="font-size:13px;font-weight:500">${sc.name}</div>
                    <div style="font-size:11px;color:var(--muted)">${sc.description||''}</div>
                  </div>
                  <div class="flex gap-8">
                    <button class="btn btn-sm btn-ghost" onclick="loadScenario(${JSON.stringify(sc).replace(/"/g,"'")})">load</button>
                    <button class="btn btn-icon btn-danger" onclick="deleteScenario('${sc.id}')">${ICONS.trash}</button>
                  </div>
                </div>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <div id="wi-modal"></div>
  `;

  window._wiCats = spendCats;
  window._wiAdjustments = {};
  window._wiFireBaseline = fire?.projections || {};
  renderWhatIfChart({}, fire?.projections || {});
}

function updateSlider(catId, val) {
  const n = parseFloat(val) || 0;
  window._wiAdjustments = window._wiAdjustments || {};
  window._wiAdjustments[catId] = n;
  const el = document.getElementById(`slider-val-${catId}`);
  if (el) el.textContent = (n >= 0 ? '+' : '') + fmt(n) + '/mo';
  el.style.color = n > 0 ? 'var(--danger)' : n < 0 ? 'var(--success)' : 'var(--accent)';
}

async function runSimulation() {
  try {
    const result = await API.post('/api/whatif/simulate', { adjustments: window._wiAdjustments || {} });
    const nwEl = document.getElementById('wi-nw-delta');
    const fireEl = document.getElementById('wi-fire-shift');
    if (nwEl) {
      nwEl.textContent = (result.nw_delta_monthly >= 0 ? '+' : '') + fmt(result.nw_delta_monthly);
      nwEl.style.color = result.nw_delta_monthly >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    if (fireEl) {
      const shift = result.fire_date_shift_years;
      fireEl.textContent = (shift >= 0 ? '−' : '+') + Math.abs(shift) + ' yrs';
      fireEl.style.color = shift > 0 ? 'var(--success)' : 'var(--danger)';
    }
    renderWhatIfChart(result.scenario, result.baseline);
  } catch(e) { /* silent */ }
}

function renderWhatIfChart(scenario, baseline) {
  const ctx = document.getElementById('chart-whatif');
  if (!ctx) return;
  if (whatifChart) whatifChart.destroy();

  const base = baseline?.growth_timeline || [];
  const scen = scenario?.growth_timeline || base;
  const labels = base.slice(0, 15).map(t => `age ${t.year}`);

  whatifChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'baseline', data: base.slice(0,15).map(t => t.value), borderColor: '#8A8680', borderDash: [4,4], tension: 0.4, pointRadius: 0 },
        { label: 'scenario', data: scen.slice(0,15).map(t => t.value), borderColor: '#CC6B3D', backgroundColor: 'rgba(204,107,61,0.08)', fill: true, tension: 0.4, pointRadius: 0 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: false } },
      plugins: { legend: { display: true, position: 'bottom' } },
    },
  });
}

function resetSliders() {
  window._wiAdjustments = {};
  document.querySelectorAll('input[type="range"]').forEach(s => { s.value = 0; });
  (window._wiCats||[]).forEach(c => {
    const el = document.getElementById(`slider-val-${c.id}`);
    if (el) { el.textContent = '$0'; el.style.color = 'var(--accent)'; }
  });
  runSimulation();
}

function saveScenario() {
  const el = document.getElementById('wi-modal');
  el.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(26,24,20,0.4);z-index:100;display:flex;align-items:center;justify-content:center">
      <div class="card" style="width:320px">
        <div class="card-header"><span class="card-title">save scenario</span>
          <button class="btn btn-icon btn-ghost" onclick="document.getElementById('wi-modal').innerHTML=''">✕</button></div>
        <form id="save-sc-form">
          <div class="form-group"><label class="form-label">name</label><input class="form-input" name="name" required placeholder="cut dining out"></div>
          <div class="form-group"><label class="form-label">description</label><input class="form-input" name="description" placeholder="optional"></div>
          <div class="flex gap-8">
            <button type="submit" class="btn btn-primary">save</button>
            <button type="button" class="btn btn-ghost" onclick="document.getElementById('wi-modal').innerHTML=''">cancel</button>
          </div>
        </form>
      </div>
    </div>`;

  document.getElementById('save-sc-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await API.post('/api/whatif/scenarios', {
        name: fd.get('name'),
        description: fd.get('description'),
        adjustments: window._wiAdjustments || {},
      });
      document.getElementById('wi-modal').innerHTML = '';
      toast('scenario saved','success');
      loadWhatIf();
    } catch(err) { toast(err.message,'error'); }
  });
}

function loadScenario(sc) {
  window._wiAdjustments = sc.adjustments || {};
  Object.entries(sc.adjustments || {}).forEach(([catId, val]) => {
    const slider = document.getElementById(`slider-${catId}`);
    if (slider) { slider.value = val; updateSlider(catId, val); }
  });
  runSimulation();
  toast(`loaded: ${sc.name}`,'info');
}

async function deleteScenario(id) {
  try {
    await API.del(`/api/whatif/scenarios/${id}`);
    toast('scenario deleted','info');
    loadWhatIf();
  } catch(e) { toast(e.message,'error'); }
}
