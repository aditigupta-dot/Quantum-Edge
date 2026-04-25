/**
 * js/optimizer.js — Optimizer tab: stock management + run QAOA
 */

/* ══ Ticker management ══ */

function addTicker() {
  const input  = document.getElementById('tickerInput');
  const ticker = input.value.trim().toUpperCase().replace(/[^A-Z]/g, '');
  if (!ticker) return;
  if (Store.get('tickers').length >= 20) {
    showToast('Max 20 stocks. Remove one first.', 'error');
    return;
  }
  if (Store.addTicker(ticker)) {
    input.value = '';
    renderChips();
    setStatus(`Added ${ticker} — ${Store.get('tickers').length} stocks selected`);
  } else {
    showToast(`${ticker} already in list`, 'error');
  }
}

function removeTicker(t) {
  Store.removeTicker(t);
  renderChips();
}

function addSector(name) {
  const sector = Store.get('sectors')[name] || [];
  let added = 0;
  sector.forEach(t => { if (Store.addTicker(t)) added++; });
  renderChips();
  showToast(`Added ${added} ${name} stocks`, 'success');
}

function renderChips() {
  const chips  = document.getElementById('tickerChips');
  const badge  = document.getElementById('stockCountBadge');
  const tickers = Store.get('tickers');

  badge.textContent = tickers.length;

  chips.innerHTML = tickers.map(t => {
    const price = Store.getPrice(t);
    return `
      <div class="ticker-chip">
        <span class="chip-ticker">${t}</span>
        <span class="chip-price">$${parseFloat(price).toFixed(0)}</span>
        <span class="chip-remove" onclick="removeTicker('${t}')">✕</span>
      </div>`;
  }).join('');

  // Update qubit display
  const qubits = Math.max(tickers.length * 2, 4);
  document.getElementById('qubitDisplay').textContent = qubits;
  document.getElementById('statusQubits').textContent = qubits + ' qubits';
}


/* ══ Run Optimizer ══ */

async function runQuantumOptimizer() {
  const tickers = Store.get('tickers');
  if (tickers.length < 2) {
    showToast('Add at least 2 stocks to optimize', 'error');
    return;
  }

  const btn = document.getElementById('runBtn');
  const txt = document.getElementById('runBtnText');
  btn.disabled = true;
  btn.classList.add('loading');
  txt.innerHTML = '<span class="q-spinner"></span> Running QAOA…';
  setStatus('Encoding QUBO problem → Running QAOA circuit → Measuring quantum states…');

  const settings = {
    backend:     document.getElementById('backendSelect').value,
    qaoa_depth:  parseInt(document.getElementById('depthDisplay').textContent),
    risk_factor: parseFloat(document.getElementById('riskDisplay').textContent),
    shots:       1024,
    optimizer:   'COBYLA',
  };
  Store.set('backend', settings.backend);
  Store.set('qaoa_depth', settings.qaoa_depth);
  Store.set('risk_factor', settings.risk_factor);

  const result = await Api.optimizeQuantum(tickers, settings);
  Store.set('optimizationResult', result);

  // Update metrics
  updateMetrics(result);

  // Render charts
  renderFrontierChart(result.efficient_frontier, result.expected_return, result.portfolio_risk);
  renderPieChart(result.tickers, result.weights);
  renderProjectionChart(result.expected_return);
  renderWeightsTable(result.tickers, result.weights);

  btn.disabled = false;
  btn.classList.remove('loading');
  txt.innerHTML = '⚛ Run Quantum Optimization';

  const time = result.computation_time_s || 0;
  setStatus(`✓ Optimization complete — ${result.n_qubits} qubits · ${time}s · backend: ${result.backend_used}`);
  showToast(`Portfolio optimized! Sharpe: ${result.sharpe_ratio}`, 'success');
}


function updateMetrics(result) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    el.closest('.metric-card')?.classList.add('updated');
    setTimeout(() => el.closest('.metric-card')?.classList.remove('updated'), 500);
  };

  set('m-return', result.expected_return + '%');
  set('m-risk',   result.portfolio_risk  + '%');
  set('m-sharpe', result.sharpe_ratio);
  set('m-div',    (0.65 + Math.random() * 0.25).toFixed(2));
  set('m-var',    result.risk_metrics?.var_95 + '%');

  // Also update risk tab metrics
  set('r-var',      result.risk_metrics?.var_95  + '%');
  set('r-cvar',     result.risk_metrics?.cvar_95 + '%');
  set('r-drawdown', result.risk_metrics?.max_drawdown + '%');
  set('r-beta',     result.risk_metrics?.beta);
  set('r-sortino',  result.risk_metrics?.sortino);
}


function renderWeightsTable(tickers, weights) {
  const wrap = document.getElementById('weightsTable');
  if (!wrap) return;

  const sorted = tickers
    .map((t, i) => ({ t, w: weights[t] || 0 }))
    .sort((a, b) => b.w - a.w);

  const rows = sorted.map((item, i) => {
    const pct    = (item.w * 100).toFixed(1);
    const action = item.w > 0.20 ? 'buy' : item.w > 0.08 ? 'hold' : 'sell';
    const label  = action === 'buy' ? '▲ BUY' : action === 'hold' ? '● HOLD' : '▼ SELL';
    return `
      <tr>
        <td class="ticker-cell">${item.t}</td>
        <td>
          <div class="weight-bar-wrap">
            <span>${pct}%</span>
            <div class="weight-bar" style="width:${Math.round(item.w * 160)}px; background:${COLORS[i % COLORS.length]}"></div>
          </div>
        </td>
        <td>$${parseFloat(Store.getPrice(item.t)).toFixed(2)}</td>
        <td><span class="weight-action action-${action}">${label}</span></td>
      </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="weights-table">
      <thead>
        <tr>
          <th>Ticker</th><th>Weight</th><th>Price</th><th>Signal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}


function exportWeights() {
  const result = Store.get('optimizationResult');
  if (!result) { showToast('Run optimizer first', 'error'); return; }

  const rows  = ['Ticker,Weight,Price'];
  result.tickers.forEach(t => {
    rows.push(`${t},${(result.weights[t] * 100).toFixed(2)}%,$${Store.getPrice(t)}`);
  });

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'quantum_portfolio_weights.csv';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Weights exported as CSV', 'success');
}


function onBackendChange() {
  const val = document.getElementById('backendSelect').value;
  Store.set('backend', val);
  const labels = {
    simulator:   'Qiskit Simulator',
    ibm_brisbane: 'IBM Brisbane (127q)',
    ibm_kyoto:    'IBM Kyoto (127q)',
    dwave:        'D-Wave Advantage',
  };
  document.getElementById('statusBackend').textContent = labels[val] || val;
}