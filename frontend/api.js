/**
 * js/api.js — Backend API integration
 * Calls FastAPI backend at /api/*
 * Falls back to mock data if backend unavailable (demo mode).
 */

const API_BASE = '/api';   // proxied to http://localhost:8000

const Api = {

  async post(endpoint, body) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`API ${endpoint} failed: ${err.message} — using mock data`);
      return null;
    }
  },

  async get(endpoint) {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn(`API GET ${endpoint} failed — using mock`);
      return null;
    }
  },

  // ── Quantum Optimization ──────────────────────────────────────────────
  async optimizeQuantum(tickers, settings) {
    const data = await this.post('/optimize/quantum', {
      tickers,
      risk_factor: settings.risk_factor,
      qaoa_depth: settings.qaoa_depth,
      shots: settings.shots,
      optimizer: settings.optimizer,
      backend: settings.backend,
      period: '2y',
    });
    return data || MockData.quantumResult(tickers, settings.risk_factor);
  },

  // ── Classical Optimization ────────────────────────────────────────────
  async optimizeClassical(tickers, settings) {
    const data = await this.post('/optimize/classical', {
      tickers,
      risk_factor: settings.risk_factor,
      period: '2y',
    });
    return data || MockData.classicalResult(tickers);
  },

  // ── Compare both ──────────────────────────────────────────────────────
  async compare(tickers, settings) {
    const data = await this.post('/optimize/compare', {
      tickers,
      risk_factor: settings.risk_factor,
      qaoa_depth: settings.qaoa_depth,
      backend: settings.backend,
      period: '2y',
    });
    return data || MockData.compareResult(tickers);
  },

  // ── Live quotes ───────────────────────────────────────────────────────
  async getLiveQuotes(tickers) {
    const data = await this.get(`/stocks/quotes?tickers=${tickers.join(',')}`);
    return data || MockData.liveQuotes(tickers);
  },

  // ── Ticker search ─────────────────────────────────────────────────────
  async searchTickers(query) {
    const data = await this.get(`/stocks/search?q=${query}`);
    return data || MockData.searchResults(query);
  },
};


/* ══════════════════════════════════════════
   MOCK DATA — used when backend is offline
══════════════════════════════════════════ */
const MockData = {

  _weights(tickers) {
    let w = tickers.map(() => Math.random());
    const s = w.reduce((a, b) => a + b, 0);
    w = w.map(x => Math.min(x / s, 0.40));
    const s2 = w.reduce((a, b) => a + b, 0);
    w = w.map(x => x / s2);
    return Object.fromEntries(tickers.map((t, i) => [t, parseFloat(w[i].toFixed(4))]));
  },

  quantumResult(tickers, riskFactor = 0.5) {
    const weights = this._weights(tickers);
    const expRet  = parseFloat((12 + Math.random() * 14).toFixed(2));
    const risk    = parseFloat((8  + Math.random() * 8).toFixed(2));
    const sharpe  = parseFloat((expRet / risk * 1.25).toFixed(3));

    const frontier = Array.from({ length: 60 }, (_, i) => ({
      risk:   parseFloat((5 + i * 0.5  + Math.random() * 0.8).toFixed(2)),
      return: parseFloat((5 + i * 0.35 + Math.random() * 1.2).toFixed(2)),
      sharpe: parseFloat((0.8 + Math.random() * 0.8).toFixed(3)),
    }));

    const convergence = (() => {
      let v = 100;
      return Array.from({ length: 40 }, () => {
        v -= (Math.random() * 6 + 1);
        return parseFloat(Math.max(v, 0).toFixed(2));
      });
    })();

    return {
      tickers,
      weights,
      expected_return: expRet,
      portfolio_risk:  risk,
      sharpe_ratio:    sharpe,
      energy: parseFloat((-3.2 - Math.random() * 1.5).toFixed(4)),
      n_qubits: tickers.length * 2,
      circuit_depth: 6,
      measurement_counts: this._measurementCounts(tickers.length * 2),
      convergence,
      risk_metrics: {
        var_95:   parseFloat((risk * 0.9).toFixed(2)),
        cvar_95:  parseFloat((risk * 1.2).toFixed(2)),
        sharpe,
        sortino:  parseFloat((sharpe * 1.35).toFixed(3)),
        max_drawdown: parseFloat((-6 - Math.random() * 8).toFixed(2)),
        beta:     parseFloat((0.85 + Math.random() * 0.3).toFixed(2)),
        treynor:  parseFloat((sharpe * 0.92).toFixed(3)),
      },
      efficient_frontier: frontier,
      latest_prices: Object.fromEntries(
        tickers.map(t => [t, Store.getPrice(t)])
      ),
      computation_time_s: parseFloat((0.9 + Math.random() * 2).toFixed(3)),
      backend_used: Store.get('backend'),
    };
  },

  classicalResult(tickers) {
    const weights = this._weights(tickers);
    const expRet  = parseFloat((10 + Math.random() * 10).toFixed(2));
    const risk    = parseFloat((9  + Math.random() * 7).toFixed(2));
    return {
      tickers, weights,
      expected_return: expRet,
      portfolio_risk:  risk,
      sharpe_ratio:    parseFloat((expRet / risk * 1.1).toFixed(3)),
      risk_metrics: {
        var_95: parseFloat((risk * 0.88).toFixed(2)),
        cvar_95: parseFloat((risk * 1.15).toFixed(2)),
        max_drawdown: parseFloat((-8 - Math.random() * 10).toFixed(2)),
        beta: parseFloat((0.9 + Math.random() * 0.35).toFixed(2)),
      },
      latest_prices: Object.fromEntries(tickers.map(t => [t, Store.getPrice(t)])),
    };
  },

  compareResult(tickers) {
    const q = this.quantumResult(tickers);
    const c = this.classicalResult(tickers);
    const qConv = q.convergence;
    const cConv = (() => {
      let v = 100;
      return Array.from({ length: 40 }, () => {
        v -= (Math.random() * 3.5 + 0.5);
        return parseFloat(Math.max(v, 0).toFixed(2));
      });
    })();
    return {
      tickers,
      quantum:   { ...q, convergence: qConv },
      classical: { ...c, convergence: cConv },
      quantum_advantage: {
        return_improvement_pct: parseFloat(((q.expected_return - c.expected_return) / Math.abs(c.expected_return) * 100).toFixed(1)),
        sharpe_improvement_pct: parseFloat(((q.sharpe_ratio - c.sharpe_ratio) / Math.abs(c.sharpe_ratio) * 100).toFixed(1)),
      },
      efficient_frontier: q.efficient_frontier,
      latest_prices: q.latest_prices,
    };
  },

  liveQuotes(tickers) {
    return tickers.map(t => ({
      ticker: t,
      price:  parseFloat(Store.getPrice(t)),
      change_pct: parseFloat(((Math.random() - 0.45) * 4).toFixed(2)),
      volume: Math.floor(Math.random() * 50e6 + 5e6),
    }));
  },

  searchResults(query) {
    const db = [
      {symbol:'AAPL',name:'Apple Inc.'}, {symbol:'MSFT',name:'Microsoft Corp.'},
      {symbol:'NVDA',name:'NVIDIA Corp.'},{symbol:'GOOGL',name:'Alphabet Inc.'},
      {symbol:'TSLA',name:'Tesla Inc.'}, {symbol:'AMZN',name:'Amazon.com Inc.'},
      {symbol:'META',name:'Meta Platforms'},{symbol:'JPM',name:'JPMorgan Chase'},
      {symbol:'V',name:'Visa Inc.'},    {symbol:'WMT',name:'Walmart Inc.'},
      {symbol:'AMD',name:'AMD Inc.'},   {symbol:'INTC',name:'Intel Corp.'},
    ];
    const q = query.toUpperCase();
    return db.filter(r => r.symbol.includes(q) || r.name.toUpperCase().includes(q)).slice(0, 6);
  },

  _measurementCounts(n) {
    const states = {};
    const total = 1024;
    for (let i = 0; i < 12; i++) {
      const bits = Array.from({ length: Math.min(n, 8) }, () => Math.random() > 0.5 ? '1' : '0').join('');
      states[bits] = Math.floor(Math.random() * 150 + 10);
    }
    return states;
  },
};