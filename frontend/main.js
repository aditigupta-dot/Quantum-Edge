/**
 * js/main.js — App initialization
 * Called after login succeeds.
 */

function initApp() {
  // Render initial chip list
  renderChips();

  // Boot the optimizer tab charts (blank state)
  // Real charts rendered after optimizer runs
  renderScalabilityChart();

  // Start on circuit tab render
  renderCircuit();

  // Init compare with static data
  renderCompareTableStatic();
  renderConvergenceChart(
    Array.from({length:40}, (_,i) => Math.max(0, 100 - i*3.5 - Math.random()*4)),
    Array.from({length:40}, (_,i) => Math.max(0, 100 - i*2.0 - Math.random()*3))
  );

  // Market chart (data tab)
  renderMarketChart();

  // Start live feed for data tab
  startLiveFeed();

  setStatus('Ready — add stocks and click ⚛ Run Quantum Optimization');
  console.log('%c⚛ QuantumEdge initialized', 'color:#00e5b0; font-size:14px; font-weight:bold');
}

// Auto-login check (remember session)
window.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('qe_token');
  if (token) {
    // Skip login in returning session
    Store.set('isLoggedIn', true);
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('mainApp').classList.remove('app-hidden');
    document.getElementById('mainApp').style.display = 'flex';
    document.getElementById('mainApp').style.flexDirection = 'column';
    initApp();
  }
});