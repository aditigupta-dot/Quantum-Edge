/**
 * js/risk.js — Risk Analysis tab rendering
 */

function initRiskTab() {
  renderVarChart();
  renderRollingSharpeChart();

  const result  = Store.get('optimizationResult');
  const tickers = result ? result.tickers : Store.get('tickers').slice(0, 6);
  const weights  = result ? result.weights : null;

  renderHeatmap(tickers);
  renderRiskContribChart(tickers, weights);
}


/* ══ Correlation Heatmap ══ */
function renderHeatmap(tickers) {
  const wrap = document.getElementById('heatmapContainer');
  if (!wrap) return;

  const n = tickers.length;
  if (n < 2) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">◈</div><div>Add stocks to see heatmap</div></div>';
    return;
  }

  // Generate random correlation matrix (symmetric, diagonal = 1)
  const corr = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1;
      const v = Math.random() * 1.4 - 0.3;
      return parseFloat(Math.max(-1, Math.min(1, v)).toFixed(2));
    })
  );
  // Symmetrize
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      corr[j][i] = corr[i][j];

  // Build grid HTML
  const cellSize = Math.min(Math.floor(220 / n), 38);

  let html = `<div class="heatmap-grid" style="grid-template-columns: 28px repeat(${n}, ${cellSize}px)">`;

  // Corner
  html += `<div class="hm-label"></div>`;
  // Column headers
  tickers.forEach(t => {
    html += `<div class="hm-label" style="font-size:9px; text-align:center">${t}</div>`;
  });

  // Rows
  tickers.forEach((rowT, i) => {
    html += `<div class="hm-label">${rowT}</div>`;
    tickers.forEach((_, j) => {
      const v = corr[i][j];
      const intensity = Math.abs(v);
      const bg = v > 0
        ? `rgba(79,141,255,${(intensity * 0.8).toFixed(2)})`
        : `rgba(255,85,85,${(intensity * 0.8).toFixed(2)})`;
      const textC = intensity > 0.5 ? '#fff' : 'var(--text3)';
      html += `
        <div class="hm-cell" title="${tickers[i]} vs ${tickers[j]}: ${v}"
          style="background:${bg}; color:${textC}; height:${cellSize}px; font-size:${cellSize > 30 ? 9 : 8}px">
          ${v.toFixed(2)}
        </div>`;
    });
  });

  html += '</div>';
  wrap.innerHTML = html;
}