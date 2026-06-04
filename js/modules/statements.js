async function loadStatements() {
  const el = document.getElementById('mod-statements');
  el.innerHTML = `<div class="module-header"><h2>statement engine</h2><p>csv + ofx/qfx drag-drop — chase, amex, capone, citi, bofa presets</p></div>
    <div id="stmt-body"><div class="text-muted" style="padding:40px;text-align:center">loading…</div></div>`;
  try {
    const [accounts, batches] = await Promise.all([
      API.get('/api/accounts'),
      API.get('/api/import/batches'),
    ]);
    renderStatements(accounts, batches);
  } catch(e) { toast(e.message,'error'); }
}

function renderStatements(accounts, batches) {
  document.getElementById('stmt-body').innerHTML = `
    <div class="grid-2" style="gap:24px;align-items:start">
      <!-- Upload -->
      <div class="card">
        <div class="card-header"><span class="card-title">import statement</span></div>
        <div class="drop-zone" id="drop-zone">
          <div>${ICONS.upload}</div>
          <div style="margin-top:8px;font-size:14px">drag & drop csv or ofx/qfx</div>
          <div style="font-size:12px;margin-top:4px">or click to browse</div>
          <input type="file" id="file-input" accept=".csv,.ofx,.qfx" style="display:none">
        </div>
        <div class="form-group mt-16">
          <label class="form-label">account</label>
          <select class="form-select" id="import-account">
            <option value="">— no account —</option>
            ${accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">preset bank format</label>
          <select class="form-select" id="import-preset">
            <option value="">auto-detect</option>
            <option value="chase">chase</option>
            <option value="amex">american express</option>
            <option value="capone">capital one</option>
            <option value="citi">citi</option>
            <option value="bofa">bank of america</option>
          </select>
        </div>
        <div id="import-progress" class="hidden">
          <div class="progress"><div class="progress-fill" id="import-bar" style="width:0%"></div></div>
          <div class="text-muted mt-8" style="font-size:12px" id="import-status">parsing…</div>
        </div>
        <div id="selected-file" class="text-muted" style="font-size:12px;margin-top:8px"></div>
      </div>

      <!-- Import history -->
      <div class="card">
        <div class="card-header"><span class="card-title">import history</span></div>
        ${batches.length === 0
          ? `<div class="empty-state"><p>no imports yet</p></div>`
          : `<div class="table-wrap"><table>
              <thead><tr><th>file</th><th>rows</th><th>date</th><th></th></tr></thead>
              <tbody>
                ${batches.map(b => `
                  <tr>
                    <td>${b.filename || '—'}</td>
                    <td>${b.row_count}</td>
                    <td>${fmtDate(b.imported_at)}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="rollbackImport('${b.id}')">rollback</button></td>
                  </tr>`).join('')}
              </tbody>
            </table></div>`}
      </div>
    </div>
  `;

  // Drag and drop
  const zone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => fileInput.files[0] && handleFile(fileInput.files[0]));
}

function handleFile(file) {
  document.getElementById('selected-file').textContent = `selected: ${file.name} (${(file.size/1024).toFixed(1)} KB)`;
  document.getElementById('import-progress').classList.remove('hidden');
  document.getElementById('import-bar').style.width = '30%';
  document.getElementById('import-status').textContent = 'uploading…';

  const fd = new FormData();
  fd.append('file', file);
  fd.append('preset', document.getElementById('import-preset').value);
  fd.append('account_id', document.getElementById('import-account').value);

  API.upload('/api/import/csv', fd).then(result => {
    document.getElementById('import-bar').style.width = '100%';
    document.getElementById('import-status').textContent = `imported ${result.imported} transactions`;
    toast(`imported ${result.imported} transactions`, 'success');
    setTimeout(() => loadStatements(), 1000);
  }).catch(err => {
    document.getElementById('import-status').textContent = err.message;
    toast(err.message, 'error');
  });
}

async function rollbackImport(batchId) {
  if (!confirm('Rollback this import? All transactions from this batch will be deleted.')) return;
  try {
    const r = await API.del(`/api/import/${batchId}`);
    toast(`rolled back ${r.deleted} transactions`, 'info');
    loadStatements();
  } catch(e) { toast(e.message, 'error'); }
}
