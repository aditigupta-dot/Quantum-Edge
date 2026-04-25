/**
 * js/data.js — Data Import tab: CSV, live feed, ticker search
 */

let liveFeedInterval = null;


function initDataTab() {
  startLiveFeed();
  renderMarketChart();
}


/* ══ Live Market Feed ══ */
function startLiveFeed() {
  stopLiveFeed();
  updateLiveFeed();
  liveFeedInterval = setInterval(updateLiveFeed, 3500);
}

function stopLiveFeed() {
  if (liveFeedInterval) clearInterval(liveFeedInterval);
}

function updateLiveFeed() {
  const el = document.getElementById('liveFeed');
  if (!el) return;

  const tickers = Object.keys(Store.get('mockPrices')).slice(0, 10);
  const quotes  = MockData.liveQuotes(tickers);

  el.innerHTML = quotes.map(q => {
    const pos    = q.change_pct >= 0;
    const arrow  = pos ? '▲' : '▼';
    const cls    = pos ? 'pos' : 'neg';
    const vol    = q.volume ? (q.volume / 1e6).toFixed(1) + 'M' : '—';
    return `
      <div class="live-feed-row">
        <span class="feed-ticker">${q.ticker}</span>
        <span class="feed-price">$${q.price.toFixed(2)}</span>
        <span class="feed-change ${cls}">${arrow} ${Math.abs(q.change_pct)}%</span>
        <span style="font-size:9px; color:var(--text3)">${vol}</span>
      </div>`;
  }).join('');
}


/* ══ CSV Drag & Drop ══ */
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.remove('dz-hover');
  const file = e.dataTransfer.files[0];
  if (file) processCSVFile(file);
}

function handleCSVFile(input) {
  const file = input.files[0];
  if (file) processCSVFile(file);
}

function processCSVFile(file) {
  if (!file.name.endsWith('.csv')) {
    showToast('Please upload a .csv file', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const text  = e.target.result;
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());

    // Show preview
    const preview = document.getElementById('csvPreview');
    preview.style.display = 'block';

    const previewRows = lines.slice(0, 8).map((line, i) => {
      const cls = i === 0 ? 'csv-preview-header' : 'csv-preview-row';
      return `<div class="${cls}">${line}</div>`;
    });

    preview.innerHTML = previewRows.join('');

    // Auto-extract tickers from first column
    const tickerColIdx = headers.findIndex(h =>
      ['ticker','symbol','stock','name'].includes(h.toLowerCase())
    );
    const col = tickerColIdx >= 0 ? tickerColIdx : 0;

    let added = 0;
    lines.slice(1).forEach(line => {
      const parts = line.split(',');
      const t     = parts[col]?.trim().toUpperCase().replace(/[^A-Z]/g, '');
      if (t && /^[A-Z]{1,5}$/.test(t) && t.length >= 1) {
        if (Store.addTicker(t)) added++;
      }
    });

    if (added > 0) {
      renderChips();
      showToast(`Imported ${added} tickers from ${file.name}`, 'success');
      setStatus(`CSV imported: ${file.name} — ${added} new tickers added`);
    } else {
      showToast('No valid tickers found in CSV', 'error');
    }
  };

  reader.readAsText(file);
}


/* ══ Ticker Search ══ */
let searchTimeout = null;

function searchStocks(query) {
  clearTimeout(searchTimeout);
  const results = document.getElementById('searchResults');
  if (!query || query.length < 1) { results.innerHTML = ''; return; }

  searchTimeout = setTimeout(async () => {
    const items = await Api.searchTickers(query);
    results.innerHTML = items.map(item => `
      <div class="search-result-item" onclick="addFromSearch('${item.symbol}')">
        <div>
          <div class="sr-symbol">${item.symbol}</div>
          <div class="sr-name">${item.name || ''}</div>
        </div>
        <button class="sr-add-btn">+ Add</button>
      </div>`
    ).join('') || `<div style="color:var(--text3); font-size:12px; padding:8px">No results for "${query}"</div>`;
  }, 300);
}

function addFromSearch(symbol) {
  if (Store.addTicker(symbol)) {
    renderChips();
    showToast(`Added ${symbol}`, 'success');
    document.getElementById('searchTicker').value = '';
    document.getElementById('searchResults').innerHTML = '';
  } else {
    showToast(`${symbol} already in list`, 'error');
  }
}