/**
 * js/ui.js — UI helpers: tabs, theme, toasts, status
 */

/* ══ Tab switching ══ */
function switchTab(btn, tabId) {
  // Deactivate all
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));

  // Activate chosen
  btn.classList.add('active');
  const section = document.getElementById('tab-' + tabId);
  if (section) section.classList.add('active');

  Store.set('currentTab', tabId);

  // Tab-specific init
  stopLiveFeed();
  switch (tabId) {
    case 'circuit': renderCircuit(); break;
    case 'risk':    initRiskTab(); break;
    case 'compare': initCompareTab(); break;
    case 'data':    initDataTab(); break;
  }
}


/* ══ Theme toggle ══ */
function toggleTheme() {
  const body   = document.getElementById('appBody');
  const isDark = body.classList.contains('dark-mode');
  body.classList.toggle('dark-mode',   !isDark);
  body.classList.toggle('light-mode',   isDark);
  Store.set('darkMode', !isDark);
  document.querySelector('.theme-toggle').textContent = isDark ? '☀' : '◑';

  // Destroy and re-render charts for color update
  const result = Store.get('optimizationResult');
  if (result && Store.get('currentTab') === 'optimizer') {
    renderFrontierChart(result.efficient_frontier, result.expected_return, result.portfolio_risk);
    renderPieChart(result.tickers, result.weights);
    renderProjectionChart(result.expected_return);
  }
}


/* ══ Toast notification ══ */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.classList.remove('show'); }, 3200);
}


/* ══ Status bar ══ */
function setStatus(msg) {
  const el = document.getElementById('statusMsg');
  if (el) el.textContent = msg;
}


/* ══ Keyboard shortcuts ══ */
document.addEventListener('keydown', (e) => {
  if (!Store.get('isLoggedIn')) return;
  if (e.key === 'Enter' && document.activeElement.id === 'tickerInput') {
    addTicker();
  }
  if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    runQuantumOptimizer();
  }
});