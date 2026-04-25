"""
QUBO Formulation for Portfolio Optimization
==========================================
Converts the portfolio optimization problem into a Quadratic Unconstrained
Binary Optimization (QUBO) form that quantum hardware can solve natively.

Problem: Maximize Return - λ * Risk subject to budget constraint
QUBO:    min x^T Q x + c^T x
"""

import numpy as np  # type: ignore
from dataclasses import dataclass
from typing import Optional


@dataclass
class QUBOResult:
    Q: np.ndarray          # QUBO matrix
    offset: float          # Constant energy offset
    n_qubits: int          # Number of qubits needed
    var_map: dict          # {qubit_index: stock_ticker}


def build_portfolio_qubo(
    returns: np.ndarray,
    cov_matrix: np.ndarray,
    tickers: list[str],
    risk_factor: float = 0.5,
    budget_penalty: float = 2.0,
    budget: int = None,          # number of stocks to select; None = all
    max_weight_bits: int = 3,    # bits per stock for continuous weights
) -> QUBOResult:
    """
    Build QUBO matrix for portfolio optimization.

    Binary encoding: each stock gets `max_weight_bits` binary variables
    representing fractional allocation  w_i = sum_k 2^k * x_{i,k} / 2^B

    Parameters
    ----------
    returns     : expected return vector  (n_stocks,)
    cov_matrix  : covariance matrix       (n_stocks, n_stocks)
    tickers     : list of ticker strings
    risk_factor : λ — trade-off between return and risk
    budget_penalty : Lagrange multiplier for budget constraint
    budget      : how many stocks to pick (cardinality constraint)
    max_weight_bits : binary precision per stock

    Returns
    -------
    QUBOResult with populated Q matrix and metadata
    """
    n = len(tickers)
    B = max_weight_bits
    N = n * B   # total qubits

    # Weight encoding: w_i ≈ (1/2^B) * sum_k 2^k * x_{i*B + k}
    scale = np.array([2**k for k in range(B)], dtype=float) / (2**B - 1)

    Q = np.zeros((N, N))

    # ── Objective: maximize expected return ──────────────────────────────
    # -sum_i mu_i * w_i  →  linear terms on diagonal
    for i in range(n):
        for k in range(B):
            q_idx = i * B + k
            Q[q_idx, q_idx] -= returns[i] * scale[k]

    # ── Objective: minimize portfolio variance ────────────────────────────
    # λ * sum_{i,j} sigma_{ij} * w_i * w_j
    for i in range(n):
        for j in range(n):
            for k in range(B):
                for l in range(B):
                    qi = i * B + k
                    qj = j * B + l
                    Q[qi, qj] += risk_factor * cov_matrix[i, j] * scale[k] * scale[l]

    # ── Constraint: budget (cardinality) ─────────────────────────────────
    # Penalty: A * (sum_i z_i - K)^2 where z_i = "is stock i selected"
    # We use the most-significant bit as the selection indicator
    if budget is not None:
        K = budget
        # z_i = x_{i*B + (B-1)}  (MSB = stock selected)
        msb = [(i * B + B - 1) for i in range(n)]
        for i, qi in enumerate(msb):
            Q[qi, qi] += budget_penalty * (1 - 2 * K)
            for j, qj in enumerate(msb):
                if i < j:
                    Q[qi, qj] += 2 * budget_penalty

    # Symmetrize
    Q = (Q + Q.T) / 2

    # Variable map
    var_map = {i * B + k: f"{tickers[i]}_b{k}" for i in range(n) for k in range(B)}

    offset = budget_penalty * (budget ** 2) if budget else 0.0

    return QUBOResult(Q=Q, offset=offset, n_qubits=N, var_map=var_map)


def qubo_to_ising(Q: np.ndarray) -> tuple[dict, dict, float]:
    """
    Convert QUBO (binary x ∈ {0,1}) to Ising (spin s ∈ {-1,+1}).
    Transformation: x_i = (1 + s_i) / 2

    Returns
    -------
    h  : linear Ising coefficients  {qubit: h_i}
    J  : quadratic couplings        {(i,j): J_ij}
    offset : energy constant
    """
    n = Q.shape[0]
    h = {}
    J = {}
    offset = 0.0

    for i in range(n):
        hi = Q[i, i] / 2 + sum(Q[i, j] / 4 for j in range(n) if j != i)
        if abs(hi) > 1e-10:
            h[i] = hi
        offset += Q[i, i] / 2

    for i in range(n):
        for j in range(i + 1, n):
            jij = Q[i, j] / 4
            if abs(jij) > 1e-10:
                J[(i, j)] = jij
            offset += Q[i, j] / 4

    return h, J, offset


def decode_solution(bitstring: str, tickers: list[str], B: int = 3) -> dict[str, float]:
    """
    Decode QUBO bitstring solution back to portfolio weights.

    Parameters
    ----------
    bitstring : binary string e.g. '001011101...'
    tickers   : list of stock tickers
    B         : bits per stock

    Returns
    -------
    {ticker: weight}  — weights normalized to sum=1
    """
    n = len(tickers)
    weights = {}

    for i, ticker in enumerate(tickers):
        bits = [int(bitstring[i * B + k]) for k in range(B)]
        # Decode: w = sum_k 2^k * bit_k / (2^B - 1)
        raw = sum(bits[k] * (2 ** k) for k in range(B))
        weights[ticker] = raw / (2 ** B - 1)

    total = sum(weights.values())
    if total > 0:
        weights = {t: w / total for t, w in weights.items()}
    else:
        # Fallback: equal weight
        weights = {t: 1.0 / n for t in tickers}

    return weights
