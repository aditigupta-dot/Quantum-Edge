/**
 * js/store.js — Global application state
 * Simple reactive store without frameworks.
 */

const Store = (() => {
  const state = {
    // Auth
    user: null,
    isLoggedIn: false,

    // Stocks
    tickers: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'TSLA'],
    mockPrices: {
      AAPL:189.4, MSFT:415.2, NVDA:875.3, GOOGL:175.8, TSLA:248.1,
      AMZN:196.5, META:528.4, JPM:212.3, V:278.9,   WMT:68.4,
      BRK:394.2,  JNJ:155.2,  XOM:112.8, INTC:42.1, AMD:178.5,
      NFLX:648.3, DIS:112.4,  BA:188.7,  GE:164.2,  PFE:28.9,
      AMGN:287.5, COST:722.4, CRM:297.1, UBER:75.3, LYFT:19.8
    },

    // Sector presets
    sectors: {
      tech:    ['AAPL','MSFT','NVDA','AMD','INTC'],
      finance: ['JPM','V','GS','BAC','WFC'],
      health:  ['JNJ','PFE','AMGN','UNH','MRK'],
      energy:  ['XOM','CVX','COP','SLB','OXY'],
    },

    // Quantum settings
    backend: 'simulator',
    qubits: 8,
    qaoa_depth: 3,
    risk_factor: 0.5,
    shots: 1024,
    optimizer: 'COBYLA',

    // Results
    optimizationResult: null,
    classicalResult: null,
    chartInstances: {},   // {id: Chart}

    // UI
    currentTab: 'optimizer',
    darkMode: true,
  };

  const listeners = [];

  return {
    get: (key) => state[key],
    getState: () => ({ ...state }),

    set(key, value) {
      state[key] = value;
      listeners.forEach(fn => fn(key, value));
    },

    subscribe(fn) {
      listeners.push(fn);
      return () => listeners.splice(listeners.indexOf(fn), 1);
    },

    addTicker(t) {
      if (!state.tickers.includes(t) && state.tickers.length < 20) {
        state.tickers.push(t);
        this.set('tickers', [...state.tickers]);
        return true;
      }
      return false;
    },

    removeTicker(t) {
      state.tickers = state.tickers.filter(x => x !== t);
      this.set('tickers', [...state.tickers]);
    },

    getPrice(ticker) {
      return state.mockPrices[ticker] || (80 + Math.random() * 800).toFixed(2);
    },

    destroyChart(id) {
      if (state.chartInstances[id]) {
        state.chartInstances[id].destroy();
        delete state.chartInstances[id];
      }
    },

    registerChart(id, chart) {
      this.destroyChart(id);
      state.chartInstances[id] = chart;
    },
  };
})();