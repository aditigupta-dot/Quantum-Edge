/**
 * js/charts.js — Chart.js chart rendering
 * All charts rendered here. Store.registerChart ensures old instances destroyed.
 */

const COLORS = [
  '#4f8dff','#7c5cfc','#00e5b0','#ffd700','#ff6b6b',
  '#ff9f43','#a78bfa','#54a0ff','#00d2d3','#ff9ff3',
  '#ffeaa7','#55efc4','#fd79a8','#e17055','#00b894',
];
const GRID   = 'rgba(255,255,255,0.04)';
const TICK   = '#5a6282';
const TICK_F = { size: 9, family: "'Space Mono', monospace" };


/* ══ Efficient Frontier ══════════════════════════════════════════════ */
function renderFrontierChart(data, optReturn, optRisk) {
  Store.destroyChart('frontierChart');
  const ctx = document.getElementById('frontierChart');
  if (!ctx) return;

  const randomPts = data.filter((_, i) => i % 3 !== 0).map(d => ({ x: d.risk, y: d.return }));
  const frontierPts = data.filter((_, i) => i % 3 === 0).sort((a,b) => a.risk - b.risk).map(d => ({ x: d.risk, y: d.return }));

  Store.registerChart('frontierChart', new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Random Portfolios',
          data: randomPts,
          backgroundColor: 'rgba(90,98,130,0.35)',
          pointRadius: 2.5,
          pointStyle: 'circle',
        },
        {
          label: 'Efficient Frontier',
          data: frontierPts,
          backgroundColor: 'rgba(79,141,255,0.65)',
          pointRadius: 3.5,
          pointStyle: 'circle',
        },
        {
          label: 'Quantum Optimal',
          data: [{ x: optRisk, y: optReturn }],
          backgroundColor: '#00e5b0',
          pointRadius: 9,
          pointStyle: 'star',
          pointHoverRadius: 12,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => ` Risk: ${c.parsed.x}%  Return: ${c.parsed.y}%`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: 'Risk (%)', color: TICK, font: TICK_F },
             ticks: { color: TICK, font: TICK_F }, grid: { color: GRID } },
        y: { title: { display: true, text: 'Return (%)', color: TICK, font: TICK_F },
             ticks: { color: TICK, font: TICK_F }, grid: { color: GRID } },
      },
    },
  }));
}


/* ══ Allocation Pie / Doughnut ═══════════════════════════════════════ */
function renderPieChart(tickers, weights) {
  Store.destroyChart('pieChart');
  const ctx = document.getElementById('pieChart');
  if (!ctx) return;

  const data = tickers.map(t => parseFloat((weights[t] * 100).toFixed(1)));

  Store.registerChart('pieChart', new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: tickers,
      datasets: [{
        data,
        backgroundColor: COLORS.slice(0, tickers.length),
        borderColor: '#111327',
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw}%` } },
      },
    },
  }));

  // Custom legend
  const leg = document.getElementById('pieLegend');
  if (leg) {
    leg.innerHTML = tickers.map((t, i) =>
      `<div class="pie-legend-item">
        <div class="pie-legend-dot" style="background:${COLORS[i]}"></div>
        <span>${t} ${data[i]}%</span>
      </div>`
    ).join('');
  }
}


/* ══ Performance Projection ══════════════════════════════════════════ */
function renderProjectionChart(annualReturn) {
  Store.destroyChart('projChart');
  const ctx = document.getElementById('projChart');
  if (!ctx) return;

  const months = ['Now','1m','2m','3m','4m','5m','6m','7m','8m','9m','10m','11m','12m'];
  let qv = 100, cv = 100, sp = 100;
  const quantum = [100], classical = [100], sp500 = [100];

  for (let i = 1; i < 13; i++) {
    qv  = qv  * (1 + annualReturn / 1200  + (Math.random() - 0.45) * 0.02);
    cv  = cv  * (1 + 18.4         / 1200  + (Math.random() - 0.45) * 0.02);
    sp  = sp  * (1 + 12           / 1200  + (Math.random() - 0.48) * 0.015);
    quantum.push(parseFloat(qv.toFixed(2)));
    classical.push(parseFloat(cv.toFixed(2)));
    sp500.push(parseFloat(sp.toFixed(2)));
  }

  Store.registerChart('projChart', new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        { label: 'Quantum Portfolio', data: quantum,   borderColor: '#00e5b0', backgroundColor: 'rgba(0,229,176,0.07)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 2 },
        { label: 'Classical',         data: classical, borderColor: '#4f8dff', borderWidth: 1.5, borderDash: [4, 2], tension: 0.4, pointRadius: 0, fill: false },
        { label: 'S&P 500',           data: sp500,     borderColor: '#5a6282', borderWidth: 1,   borderDash: [2, 3], tension: 0.4, pointRadius: 0, fill: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { color: TICK, font: TICK_F, callback: v => v + '%' }, grid: { color: GRID } },
        x: { ticks: { color: TICK, font: TICK_F }, grid: { display: false } },
      },
    },
  }));
}


/* ══ Measurement Histogram ═══════════════════════════════════════════ */
function renderHistogramChart(counts) {
  Store.destroyChart('histChart');
  const ctx = document.getElementById('histChart');
  if (!ctx) return;

  const labels = Object.keys(counts);
  const values = Object.values(counts);
  const maxV   = Math.max(...values);

  Store.registerChart('histChart', new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Shots',
        data: values,
        backgroundColor: values.map(v => v === maxV ? '#00e5b0' : 'rgba(79,141,255,0.5)'),
        borderColor: 'transparent',
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { color: TICK, font: TICK_F }, grid: { color: GRID } },
        x: { ticks: { color: TICK, font: TICK_F, maxRotation: 45 }, grid: { display: false } },
      },
    },
  }));
}


/* ══ Energy Landscape ════════════════════════════════════════════════ */
function renderEnergyChart(convergence) {
  Store.destroyChart('energyChart');
  const ctx = document.getElementById('energyChart');
  if (!ctx) return;

  Store.registerChart('energyChart', new Chart(ctx, {
    type: 'line',
    data: {
      labels: convergence.map((_, i) => i + 1),
      datasets: [{
        label: 'QAOA Energy',
        data: convergence,
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167,139,250,0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { color: TICK, font: TICK_F }, grid: { color: GRID } },
        x: { ticks: { color: TICK, font: TICK_F }, grid: { display: false } },
      },
    },
  }));
}


/* ══ VaR Distribution ════════════════════════════════════════════════ */
function renderVarChart() {
  Store.destroyChart('varChart');
  const ctx = document.getElementById('varChart');
  if (!ctx) return;

  const labels = Array.from({ length: 60 }, (_, i) => (-30 + i).toFixed(0));
  const normal = labels.map(x => {
    const v = parseFloat(x);
    return parseFloat((Math.exp(-v * v / 60) * (1 + (Math.random() - 0.5) * 0.15)).toFixed(4));
  });
  const varIdx = Math.floor(labels.length * 0.05);

  Store.registerChart('varChart', new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'P&L Distribution',
        data: normal,
        borderColor: '#4f8dff',
        backgroundColor: labels.map((_, i) => i <= varIdx ? 'rgba(255,85,85,0.25)' : 'rgba(79,141,255,0.08)'),
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { display: false },
        x: { ticks: { color: TICK, font: TICK_F, maxTicksLimit: 7 }, grid: { display: false } },
      },
    },
  }));
}


/* ══ Risk Contribution ═══════════════════════════════════════════════ */
function renderRiskContribChart(tickers, weights) {
  Store.destroyChart('riskContribChart');
  const ctx = document.getElementById('riskContribChart');
  if (!ctx) return;

  const contributions = tickers.map(() => parseFloat((Math.random() * 22 + 2).toFixed(1)));

  Store.registerChart('riskContribChart', new Chart(ctx, {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels: tickers,
      datasets: [{
        label: 'Risk Contribution %',
        data: contributions,
        backgroundColor: COLORS.slice(0, tickers.length),
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: TICK, font: TICK_F }, grid: { color: GRID } },
        y: { ticks: { color: TICK, font: TICK_F }, grid: { display: false } },
      },
    },
  }));
}


/* ══ Rolling Sharpe ══════════════════════════════════════════════════ */
function renderRollingSharpeChart() {
  Store.destroyChart('rollingSharpeChart');
  const ctx = document.getElementById('rollingSharpeChart');
  if (!ctx) return;

  const labels = Array.from({ length: 20 }, (_, i) => `-${20 - i}w`);
  const data   = labels.map(() => parseFloat((0.8 + Math.random() * 1.8 - 0.2).toFixed(2)));

  Store.registerChart('rollingSharpeChart', new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Rolling Sharpe',
        data,
        borderColor: '#ffd700',
        backgroundColor: 'rgba(255,215,0,0.07)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { color: TICK, font: TICK_F }, grid: { color: GRID } },
        x: { ticks: { color: TICK, font: TICK_F }, grid: { display: false } },
      },
    },
  }));
}


/* ══ Convergence Comparison ══════════════════════════════════════════ */
function renderConvergenceChart(qConv, cConv) {
  Store.destroyChart('convergenceChart');
  const ctx = document.getElementById('convergenceChart');
  if (!ctx) return;

  const labels = qConv.map((_, i) => i + 1);

  Store.registerChart('convergenceChart', new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Quantum (QAOA)',     data: qConv, borderColor: '#00e5b0', borderWidth: 2,   tension: 0.4, pointRadius: 2,   fill: false },
        { label: 'Classical (SLSQP)', data: cConv, borderColor: '#4f8dff', borderWidth: 1.5, tension: 0.4, pointRadius: 0,   fill: false, borderDash: [4, 2] },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#9ba3c7', font: TICK_F, boxWidth: 10 } } },
      scales: {
        y: { ticks: { color: TICK, font: TICK_F }, grid: { color: GRID } },
        x: { ticks: { color: TICK, font: TICK_F }, grid: { display: false } },
      },
    },
  }));
}


/* ══ Scalability Chart ═══════════════════════════════════════════════ */
function renderScalabilityChart() {
  Store.destroyChart('scalabilityChart');
  const ctx = document.getElementById('scalabilityChart');
  if (!ctx) return;

  const ns = [10, 20, 50, 100, 200, 500];
  const classical = ns.map(n => parseFloat((Math.pow(n, 3) / 1000).toFixed(1)));
  const quantum   = ns.map(n => parseFloat((Math.pow(n, 1.8) / 800).toFixed(1)));

  Store.registerChart('scalabilityChart', new Chart(ctx, {
    type: 'line',
    data: {
      labels: ns.map(n => n + ' stocks'),
      datasets: [
        { label: 'Classical O(n³)', data: classical, borderColor: '#ff6b6b', borderWidth: 2, tension: 0.3, pointRadius: 3, fill: false },
        { label: 'Quantum O(poly)', data: quantum,   borderColor: '#00e5b0', borderWidth: 2, tension: 0.3, pointRadius: 3, fill: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#9ba3c7', font: TICK_F, boxWidth: 10 } } },
      scales: {
        y: { ticks: { color: TICK, font: TICK_F }, grid: { color: GRID }, title: { display: true, text: 'Time (s)', color: TICK, font: TICK_F } },
        x: { ticks: { color: TICK, font: TICK_F }, grid: { display: false } },
      },
    },
  }));
}


/* ══ Market Overview ═════════════════════════════════════════════════ */
function renderMarketChart() {
  Store.destroyChart('marketChart');
  const ctx = document.getElementById('marketChart');
  if (!ctx) return;

  const indices = ['S&P 500', 'NASDAQ', 'DOW', 'VIX', 'Russell'];
  const changes = [1.2, 1.8, 0.9, -3.2, 1.5];

  Store.registerChart('marketChart', new Chart(ctx, {
    type: 'bar',
    data: {
      labels: indices,
      datasets: [{
        label: 'Change %',
        data: changes,
        backgroundColor: changes.map(c => c >= 0 ? 'rgba(0,229,176,0.5)' : 'rgba(255,85,85,0.5)'),
        borderColor:     changes.map(c => c >= 0 ? '#00e5b0' : '#ff5555'),
        borderWidth: 1,
        borderRadius: 3,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { color: TICK, font: TICK_F, callback: v => v + '%' }, grid: { color: GRID } },
        x: { ticks: { color: TICK, font: TICK_F }, grid: { display: false } },
      },
    },
  }));
}