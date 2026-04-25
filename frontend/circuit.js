/**
 * js/circuit.js — QAOA Quantum Circuit Renderer
 * Builds a visual gate-level circuit diagram from scratch.
 */

const GATE_SEQUENCES = [
  ['H', 'Rx(γ₁)', 'CTRL', 'Rx(β₁)', 'Rx(γ₂)', 'M'],
  ['H', 'CTRL',   'CNOT', 'Rx(β₁)', 'Rx(γ₂)', 'M'],
  ['H', 'Rx(γ₁)', 'Rx(β₁)', 'CTRL', 'Rx(γ₂)', 'M'],
  ['H', 'CNOT',   'Rx(β₁)', 'Rx(γ₁)', 'CTRL', 'M'],
  ['H', 'Rx(γ₁)', 'CTRL',   'CNOT',   'Rx(β₁)', 'M'],
  ['H', 'Rx(β₁)', 'CNOT',   'Rx(γ₂)', 'CTRL',   'M'],
];

const GATE_CLASS = {
  'H':      'gate gate-H',
  'Rx(γ₁)': 'gate gate-Rx',
  'Rx(γ₂)': 'gate gate-Rx',
  'Rx(β₁)': 'gate gate-Rx',
  'CNOT':   'gate gate-CNOT',
  'CTRL':   'gate-ctrl',
  'M':      'gate gate-M',
};


function renderCircuit() {
  const container = document.getElementById('circuitContainer');
  if (!container) return;

  const tickers = Store.get('tickers');
  const depth   = parseInt(Store.get('qaoa_depth')) || 3;
  const n       = Math.min(tickers.length || 4, 8);
  const labels  = tickers.slice(0, n).map((t, i) => `q${i}|${t}`);

  // Build longer gate sequence based on depth
  const baseSeq = GATE_SEQUENCES;
  let html = '';

  for (let i = 0; i < n; i++) {
    const seq = baseSeq[i % baseSeq.length];
    html += `
      <div class="circuit-row">
        <span class="circuit-qubit-label">${labels[i]}</span>
        <div class="circuit-wire-wrap">
          <div class="circuit-wire"></div>
          ${seq.map(g => renderGate(g)).join('')}
          ${depth > 2 ? renderLayerRepeat(depth - 1) : ''}
        </div>
      </div>`;
  }

  container.innerHTML = html;

  // Also render bloch spheres and state vector
  renderBlochSpheres(n);
  renderStateVector(tickers.slice(0, n));
}


function renderGate(gateName) {
  if (gateName === 'CTRL') {
    return `<span class="gate-ctrl"><span class="ctrl-dot"></span></span>`;
  }
  const cls = GATE_CLASS[gateName] || 'gate';
  return `<span class="${cls}">${gateName}</span>`;
}


function renderLayerRepeat(depth) {
  // Compact notation for additional QAOA layers
  let extra = '';
  for (let d = 1; d < Math.min(depth, 3); d++) {
    extra += `<span class="gate gate-Rz" title="Layer ${d+1}">L${d+1}</span>`;
  }
  return extra;
}


function renderBlochSpheres(n) {
  const container = document.getElementById('blochContainer');
  if (!container) return;

  const tickers = Store.get('tickers').slice(0, n);
  let html = '';

  tickers.forEach((t, i) => {
    const theta = (Math.random() * 140 - 70);          // polar angle
    const phi   = (Math.random() * 180 - 90);          // azimuthal
    const arrowH = Math.abs(Math.cos(theta * Math.PI / 180)) * 22;
    const rotate  = phi;

    html += `
      <div class="bloch-item">
        <div class="bloch-sphere" title="q${i}: θ=${theta.toFixed(0)}° φ=${phi.toFixed(0)}°">
          <div class="bloch-equator"></div>
          <div class="bloch-meridian"></div>
          <div class="bloch-arrow" style="height:${arrowH}px; transform:rotate(${rotate}deg)"></div>
        </div>
        <div class="bloch-label">q${i}|${t}</div>
      </div>`;
  });

  container.innerHTML = html;
}


function renderStateVector(tickers) {
  const el = document.getElementById('stateVectorDisplay');
  if (!el) return;

  const lines = tickers.slice(0, 5).map(t => {
    const amp   = Math.random().toFixed(3);
    const phase = (Math.random() * 6.28).toFixed(2);
    return `|${t}⟩ : ${amp} · e^(i·${phase})`;
  });

  el.innerHTML =
    `|ψ⟩ = Σ α<sub>i</sub>|x<sub>i</sub>⟩<br>` +
    lines.join('<br>') +
    `<br><span style="color:var(--text3)">Norm: 1.000  Entropy: ${(Math.random() * 2 + 0.5).toFixed(3)}</span>`;
}


function regenerateCircuit() {
  renderCircuit();
  renderHistogramChart(MockData._measurementCounts(Store.get('tickers').length * 2));
  showToast('Circuit regenerated with new random parameters', 'success');
}


function downloadQASM() {
  const n      = Math.min(Store.get('tickers').length * 2, 16);
  const depth  = Store.get('qaoa_depth') || 3;
  const qasm   = generateQASM(n, depth);
  const blob   = new Blob([qasm], { type: 'text/plain' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url;
  a.download = 'quantumedge_circuit.qasm';
  a.click();
  URL.revokeObjectURL(url);
  showToast('QASM circuit downloaded', 'success');
}


function generateQASM(n, p) {
  let qasm = `// QuantumEdge QAOA Circuit\n// n_qubits=${n}  depth=${p}\nOPENQASM 2.0;\ninclude "qelib1.inc";\n\n`;
  qasm += `qreg q[${n}];\ncreg c[${n}];\n\n`;
  qasm += `// Initial superposition\n`;
  for (let i = 0; i < n; i++) qasm += `h q[${i}];\n`;
  qasm += `\n`;

  for (let layer = 0; layer < p; layer++) {
    qasm += `// === Layer ${layer + 1}: Cost Unitary ===\n`;
    for (let i = 0; i < n - 1; i++) {
      qasm += `cx q[${i}], q[${i + 1}];\n`;
      qasm += `rz(gamma_${layer}) q[${i + 1}];\n`;
      qasm += `cx q[${i}], q[${i + 1}];\n`;
    }
    qasm += `\n// === Layer ${layer + 1}: Mixer Unitary ===\n`;
    for (let i = 0; i < n; i++) qasm += `rx(2*beta_${layer}) q[${i}];\n`;
    qasm += `\n`;
  }

  qasm += `// Measurements\n`;
  for (let i = 0; i < n; i++) qasm += `measure q[${i}] -> c[${i}];\n`;
  return qasm;
}