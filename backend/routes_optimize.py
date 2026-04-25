
"""
Optimization API Routes
=======================
POST /optimize/quantum   — Run QAOA/QUBO quantum optimization
POST /optimize/classical — Run Markowitz classical optimization
POST /optimize/compare   — Run both and compare results
GET  /optimize/circuit   — Export QAOA circuit as QASM
"""

from fastapi import APIRouter, HTTPException  # type: ignore
from fastapi.responses import PlainTextResponse  # type: ignore
import asyncio
import numpy as np  # type: ignore
import logging
import time

from backend.schemas import (
    OptimizeRequest, QuantumOptimizeResponse,
    ClassicalOptimizeResponse, CompareResponse,
)
from backend.market_data import fetch_stock_data, compute_efficient_frontier
from backend.qaoa_optimizer import run_qaoa_optimization, build_qaoa_circuit
from backend.markowitz import run_markowitz_optimization, compute_risk_metrics

from backend.config import settings

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter()


# ─────────────────────────────────────────────
# Utility: Safe Percentage Calculation
# ─────────────────────────────────────────────
def safe_pct(new, old):
    if abs(old) < 1e-8:
        return 0.0
    return round((new - old) / abs(old) * 100, 2)


# ─────────────────────────────────────────────
# QUANTUM OPTIMIZATION
# ─────────────────────────────────────────────
@router.post("/quantum", response_model=QuantumOptimizeResponse)
async def optimize_quantum(req: OptimizeRequest):

    if len(req.tickers) < 2:
        raise HTTPException(400, "Need at least 2 tickers")

    if len(req.tickers) > 50:
        raise HTTPException(400, "Max 50 tickers for quantum")

    t_start = time.perf_counter()

    # Fetch market data
    market = await fetch_stock_data(req.tickers, period=req.period)
    valid = market["tickers"]

    returns = np.array(market["expected_returns"])
    cov = np.array(market["cov_matrix"])

    # Run QAOA in background thread (IMPORTANT)
    qaoa_result = await asyncio.to_thread(
        run_qaoa_optimization,
        tickers=valid,
        returns=returns,
        cov_matrix=cov,
        risk_factor=req.risk_factor,
        p=req.qaoa_depth,
        shots=req.shots,
        optimizer_name=req.optimizer,
        backend_name=req.backend,
        ibm_token=settings.IBM_QUANTUM_TOKEN,
    )

    # Normalize weights
    total = sum(qaoa_result.optimal_weights.values())
    if total > 0:
        weights = {k: v / total for k, v in qaoa_result.optimal_weights.items()}
    else:
        weights = qaoa_result.optimal_weights

    # Risk metrics
    w = np.array([weights.get(t, 0.0) for t in valid])
    risk_metrics = compute_risk_metrics(w, returns, cov, market["history"])

    frontier = compute_efficient_frontier(valid, returns, cov, n_points=60)

    elapsed = time.perf_counter() - t_start

    return QuantumOptimizeResponse(
        tickers=valid,
        weights=weights,
        expected_return=round(qaoa_result.expected_return * 100, 2),
        portfolio_risk=round(qaoa_result.portfolio_risk * 100, 2),
        sharpe_ratio=round(qaoa_result.sharpe_ratio, 3),
        energy=qaoa_result.energy,
        n_qubits=qaoa_result.n_qubits,
        circuit_depth=qaoa_result.circuit_depth,
        measurement_counts=qaoa_result.measurement_counts,
        convergence=qaoa_result.convergence,
        risk_metrics=risk_metrics,
        efficient_frontier=frontier,
        latest_prices=market["latest_prices"],
        history=market["history"],
        computation_time_s=round(elapsed, 3),
        backend_used=req.backend,
    )


# ─────────────────────────────────────────────
# CLASSICAL OPTIMIZATION
# ─────────────────────────────────────────────
@router.post("/classical", response_model=ClassicalOptimizeResponse)
async def optimize_classical(req: OptimizeRequest):

    market = await fetch_stock_data(req.tickers, period=req.period)
    valid = market["tickers"]

    returns = np.array(market["expected_returns"])
    cov = np.array(market["cov_matrix"])

    result = run_markowitz_optimization(
        tickers=valid,
        returns=returns,
        cov_matrix=cov,
        risk_aversion=req.risk_factor,
    )

    risk_metrics = compute_risk_metrics(
        np.array(list(result["weights"].values())),
        returns,
        cov,
        market["history"],
    )

    return ClassicalOptimizeResponse(
        tickers=valid,
        weights=result["weights"],
        expected_return=round(result["expected_return"] * 100, 2),
        portfolio_risk=round(result["portfolio_risk"] * 100, 2),
        sharpe_ratio=round(result["sharpe_ratio"], 3),
        risk_metrics=risk_metrics,
        latest_prices=market["latest_prices"],
    )


# ─────────────────────────────────────────────
# COMPARE QUANTUM VS CLASSICAL
# ─────────────────────────────────────────────
@router.post("/compare", response_model=CompareResponse)
async def compare_methods(req: OptimizeRequest):

    market = await fetch_stock_data(req.tickers, period=req.period)
    valid = market["tickers"]

    returns = np.array(market["expected_returns"])
    cov = np.array(market["cov_matrix"])

    # Classical
    classical = run_markowitz_optimization(valid, returns, cov, req.risk_factor)

    # Quantum (non-blocking)
    quantum = await asyncio.to_thread(
        run_qaoa_optimization,
        valid,
        returns,
        cov,
        risk_factor=req.risk_factor,
        p=req.qaoa_depth,
        shots=req.shots,
        optimizer_name=req.optimizer,
        backend_name=req.backend,
        ibm_token=settings.IBM_QUANTUM_TOKEN,
    )

    frontier = compute_efficient_frontier(valid, returns, cov, n_points=80)

    return CompareResponse(
        tickers=valid,
        quantum=dict(
            weights=quantum.optimal_weights,
            expected_return=round(quantum.expected_return * 100, 2),
            portfolio_risk=round(quantum.portfolio_risk * 100, 2),
            sharpe_ratio=round(quantum.sharpe_ratio, 3),
            convergence=quantum.convergence,
            n_qubits=quantum.n_qubits,
        ),
        classical=dict(
            weights=classical["weights"],
            expected_return=round(classical["expected_return"] * 100, 2),
            portfolio_risk=round(classical["portfolio_risk"] * 100, 2),
            sharpe_ratio=round(classical["sharpe_ratio"], 3),
        ),
        quantum_advantage={
            "return_improvement_pct": safe_pct(
                quantum.expected_return, classical["expected_return"]
            ),
            "sharpe_improvement_pct": safe_pct(
                quantum.sharpe_ratio, classical["sharpe_ratio"]
            ),
            "computation_benefit": "Exponential speedup for n>50 stocks",
        },
        efficient_frontier=frontier,
        latest_prices=market["latest_prices"],
        history=market["history"],
    )


# ─────────────────────────────────────────────
# EXPORT QAOA CIRCUIT
# ─────────────────────────────────────────────
@router.get("/circuit")
async def get_circuit(tickers: str = "AAPL,MSFT,NVDA", p: int = 2):

    from qiskit.qasm3 import dumps  # type: ignore

    ticker_list = [t.strip() for t in tickers.split(",")]
    n_qubits = len(ticker_list) * 2

    qc = build_qaoa_circuit(n_qubits=n_qubits, p=p)
    qasm = dumps(qc)

    return PlainTextResponse(content=qasm, media_type="text/plain")

