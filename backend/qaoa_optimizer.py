
"""
QAOA (Quantum Approximate Optimization Algorithm) for Portfolio Optimization
============================================================================
"""

import numpy as np  # type: ignore
from dataclasses import dataclass
from typing import Optional
import logging

from qiskit import QuantumCircuit  # type: ignore
from qiskit.circuit import Parameter  # type: ignore
from qiskit.quantum_info import SparsePauliOp  # type: ignore

from qiskit_aer.primitives import Sampler  # type: ignore

from qiskit_algorithms import QAOA  # type: ignore
from qiskit_algorithms.optimizers import COBYLA, SPSA  # type: ignore
from qiskit_algorithms.utils import algorithm_globals  # type: ignore

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────
# Result Dataclass
# ────────────────────────────────────────────────────────────────
@dataclass
class QAOAResult:
    optimal_weights: dict
    expected_return: float
    portfolio_risk: float
    sharpe_ratio: float
    energy: float
    optimal_params: list[float]
    n_qubits: int
    circuit_depth: int
    measurement_counts: dict
    convergence: list[float]


# ────────────────────────────────────────────────────────────────
# Main QAOA Function
# ────────────────────────────────────────────────────────────────
def run_qaoa_optimization(
    tickers: list[str],
    returns: np.ndarray,
    cov_matrix: np.ndarray,
    risk_factor: float = 0.5,
    p: int = 3,
    shots: int = 1024,
    optimizer_name: str = "COBYLA",
    backend_name: str = "simulator",
    ibm_token: str = None,
) -> QAOAResult:

    from backend.qubo_formulator import (
        build_portfolio_qubo,
        qubo_to_ising,
        decode_solution,
    )

    algorithm_globals.random_seed = 42
    n = len(tickers)

    # ── Step 1: Build QUBO ──
    qubo = build_portfolio_qubo(
        returns=returns,
        cov_matrix=cov_matrix,
        tickers=tickers,
        risk_factor=risk_factor,
        max_weight_bits=2 if n > 10 else 3,
    )
    n_qubits = qubo.n_qubits

    # ── Step 2: Convert to Ising ──
    h, J, offset = qubo_to_ising(qubo.Q)
    cost_op = _build_cost_hamiltonian(h, J, n_qubits)

    # ── Step 3: Backend ──
    sampler = _get_sampler(backend_name, ibm_token)

    # ── Step 4: Optimizer ──
    optimizer = _get_optimizer(optimizer_name)

    # ── Step 5: Run QAOA ──
    convergence = []

    def callback(eval_count, params, value, meta):
        convergence.append(float(value))

    qaoa = QAOA(
        sampler=sampler,
        optimizer=optimizer,
        reps=p,
        callback=callback,
    )

    result = qaoa.compute_minimum_eigenvalue(cost_op)

    # ── Step 6: Extract counts safely ──
    counts = result.eigenstate

    if not isinstance(counts, dict):
        counts = counts.binary_probabilities()

    best_bitstring = max(counts, key=counts.get)

    B = 2 if n > 10 else 3
    weights = decode_solution(best_bitstring, tickers, B=B)

    # ── Step 7: Metrics ──
    w = np.array([weights[t] for t in tickers])

    exp_return = float(np.dot(w, returns))
    port_risk = float(np.sqrt(w @ cov_matrix @ w))
    sharpe = exp_return / port_risk if port_risk > 0 else 0.0

    return QAOAResult(
        optimal_weights=weights,
        expected_return=exp_return,
        portfolio_risk=port_risk,
        sharpe_ratio=sharpe,
        energy=float(result.eigenvalue.real),
        optimal_params=list(result.optimal_point),
        n_qubits=n_qubits,
        circuit_depth=p * 2,
        measurement_counts=dict(
            sorted(counts.items(), key=lambda x: -x[1])[:20]
        ),
        convergence=convergence,
    )


# ────────────────────────────────────────────────────────────────
# Circuit Builder
# ────────────────────────────────────────────────────────────────
def build_qaoa_circuit(n_qubits: int, p: int = 2) -> QuantumCircuit:
    gammas = [Parameter(f"γ{i}") for i in range(p)]
    betas = [Parameter(f"β{i}") for i in range(p)]

    qc = QuantumCircuit(n_qubits)
    qc.h(range(n_qubits))

    for layer in range(p):
        for i in range(n_qubits - 1):
            qc.cx(i, i + 1)
            qc.rz(2 * gammas[layer], i + 1)
            qc.cx(i, i + 1)

        for i in range(n_qubits):
            qc.rz(gammas[layer], i)

        for i in range(n_qubits):
            qc.rx(2 * betas[layer], i)

    qc.measure_all()
    return qc


# ────────────────────────────────────────────────────────────────
# Hamiltonian Builder
# ────────────────────────────────────────────────────────────────
def _build_cost_hamiltonian(h: dict, J: dict, n_qubits: int) -> SparsePauliOp:
    paulis = []

    for qubit, coef in h.items():
        pauli = ["I"] * n_qubits
        pauli[n_qubits - 1 - qubit] = "Z"
        paulis.append(("".join(pauli), coef))

    for (qi, qj), coef in J.items():
        pauli = ["I"] * n_qubits
        pauli[n_qubits - 1 - qi] = "Z"
        pauli[n_qubits - 1 - qj] = "Z"
        paulis.append(("".join(pauli), coef))

    if not paulis:
        paulis = [("I" * n_qubits, 0.0)]

    return SparsePauliOp.from_list(paulis)


# ────────────────────────────────────────────────────────────────
# Sampler
# ────────────────────────────────────────────────────────────────
def _get_sampler(backend_name: str, ibm_token: str):
    return Sampler()  # always safe fallback


# ────────────────────────────────────────────────────────────────
# Optimizer
# ────────────────────────────────────────────────────────────────
def _get_optimizer(name: str):
    opts = {
        "COBYLA": COBYLA(maxiter=300),
        "SPSA": SPSA(maxiter=300),
    }
    return opts.get(name.upper(), COBYLA(maxiter=300))