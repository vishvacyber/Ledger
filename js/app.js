// Router & App shell
const MODULES = {
  dashboard:      () => loadDashboard(),
  income:         () => loadIncome(),
  statements:     () => loadStatements(),
  transactions:   () => loadTransactions(),
  categorization: () => loadCategorization(),
  networth:       () => loadNetWorth(),
  fire:           () => loadFire(),
  whatif:         () => loadWhatIf(),
  subscriptions:  () => loadSubscriptions(),
  accounts:       () => loadAccounts(),
};

let currentModule = 'dashboard';

function navigate(mod) {
  if (!MODULES[mod]) return;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.module === mod));
  document.querySelectorAll('.module').forEach(el => el.classList.remove('active'));
  document.getElementById(`mod-${mod}`).classList.add('active');
  currentModule = mod;
  MODULES[mod]();
}

// Nav clicks
document.querySelectorAll('.nav-item[data-module]').forEach(el => {
  el.addEventListener('click', () => navigate(el.dataset.module));
});

// Dark mode toggle
const darkToggle = document.getElementById('darkToggle');
const prefersDark = localStorage.getItem('theme') === 'dark';
if (prefersDark) document.documentElement.setAttribute('data-theme', 'dark');
darkToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
  localStorage.setItem('theme', isDark ? '' : 'dark');
});

// Chart defaults
Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#8A8680';
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = 'var(--surface)';
Chart.defaults.plugins.tooltip.titleColor = 'var(--primary)';
Chart.defaults.plugins.tooltip.bodyColor = 'var(--muted)';
Chart.defaults.plugins.tooltip.borderColor = 'var(--border)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;

// PDF export
async function exportPDF(moduleId, title) {
  window.print();
}

// CSV export helper
function downloadCSV(data, filename) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

// Load user info
async function loadUserInfo() {
  try {
    const user = await API.get('/auth/me');
    const footer = document.querySelector('.sidebar-footer');
    if (footer) {
      footer.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
          ${user.avatar_url ? `<img src="${user.avatar_url}" style="width:24px;height:24px;border-radius:50%;flex-shrink:0">` : ''}
          <span style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.name || user.email}</span>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-icon btn-ghost" id="darkToggle" title="dark mode">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"/></svg>
          </button>
          <button class="btn btn-icon btn-ghost" id="logoutBtn" title="sign out">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"/></svg>
          </button>
        </div>`;
      document.getElementById('darkToggle')?.addEventListener('click', toggleDark);
      document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await fetch('/auth/logout', { method: 'POST' });
        location.href = '/login';
      });
    }
  } catch (e) {
    // Not authenticated — redirect to login
    location.href = '/login';
  }
}

function toggleDark() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? '' : 'dark');
  localStorage.setItem('theme', isDark ? '' : 'dark');
}

// Re-wire the static dark toggle that exists before user loads
document.getElementById('darkToggle')?.addEventListener('click', toggleDark);

// Boot
loadUserInfo().then(() => navigate('dashboard'));
