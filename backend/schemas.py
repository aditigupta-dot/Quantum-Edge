"""models/schemas.py — Pydantic request/response models"""
from pydantic import BaseModel, Field
from typing import Optional


class OptimizeRequest(BaseModel):
    tickers: list[str] = Field(..., example=["AAPL", "MSFT", "NVDA", "GOOGL", "TSLA"])
    risk_factor: float = Field(0.5, ge=0.0, le=5.0, description="λ: risk aversion")
    qaoa_depth: int = Field(3, ge=1, le=10, description="QAOA circuit depth p")
    shots: int = Field(1024, ge=256, le=8192)
    optimizer: str = Field("COBYLA", description="COBYLA | ADAM | SPSA")
    backend: str = Field("simulator", description="simulator | ibm_brisbane | ibm_kyoto | dwave")
    period: str = Field("2y", description="yfinance period: 1y, 2y, 5y")
    budget: Optional[int] = Field(None, description="Cardinality constraint: exactly K stocks")


class QuantumOptimizeResponse(BaseModel):
    tickers: list[str]
    weights: dict
    expected_return: float
    portfolio_risk: float
    sharpe_ratio: float
    energy: float
    n_qubits: int
    circuit_depth: int
    measurement_counts: dict
    convergence: list[float]
    risk_metrics: dict
    efficient_frontier: list[dict]
    latest_prices: dict
    history: dict
    computation_time_s: float
    backend_used: str


class ClassicalOptimizeResponse(BaseModel):
    tickers: list[str]
    weights: dict
    expected_return: float
    portfolio_risk: float
    sharpe_ratio: float
    risk_metrics: dict
    latest_prices: dict


class CompareResponse(BaseModel):
    tickers: list[str]
    quantum: dict
    classical: dict
    quantum_advantage: dict
    efficient_frontier: list[dict]
    latest_prices: dict
    history: dict
