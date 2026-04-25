"""
Market Data Module
==================
Fetches live and historical stock data via yfinance (free) and
Alpha Vantage (real-time, requires API key).
Computes returns and covariance matrices for quantum input.
"""

import numpy as np  # type: ignore
import pandas as pd  # type: ignore
import yfinance as yf  # type: ignore
from datetime import datetime, timedelta
from typing import Optional
import logging
import asyncio
from functools import lru_cache

logger = logging.getLogger(__name__)


async def fetch_stock_data(
    tickers: list[str],
    period: str = "2y",        # '1y', '2y', '5y'
    interval: str = "1d",
) -> dict:
    """
    Fetch OHLCV data and compute:
      - expected annual returns (geometric mean)
      - covariance matrix (annualized)
      - correlation matrix

    Returns dict ready for QUBO/QAOA input.
    """
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _sync_fetch, tickers, period, interval)
    return result


def _sync_fetch(tickers: list[str], period: str, interval: str) -> dict:
    """Synchronous fetch using yfinance."""
    logger.info(f"Fetching {len(tickers)} tickers: {tickers}")

    try:
        raw = yf.download(
            tickers=tickers,
            period=period,
            interval=interval,
            auto_adjust=True,
            progress=False,
            threads=True,
        )
    except Exception as e:
        logger.error(f"yfinance fetch error: {e}")
        return _generate_mock_data(tickers)

    if raw.empty:
        logger.warning("Empty data from yfinance — using mock data")
        return _generate_mock_data(tickers)

    # Extract close prices
    if len(tickers) == 1:
        close = raw["Close"].rename(tickers[0]).to_frame()
    else:
        close = raw["Close"]

    # Drop columns with >10% missing
    close = close.dropna(axis=1, thresh=int(len(close) * 0.9))
    valid_tickers = list(close.columns)

    if len(valid_tickers) < 2:
        return _generate_mock_data(tickers)

    # Daily log returns
    log_returns = np.log(close / close.shift(1)).dropna()

    # Annualized expected return (geometric mean proxy)
    trading_days = 252
    exp_returns = log_returns.mean().values * trading_days

    # Annualized covariance matrix
    cov_matrix = log_returns.cov().values * trading_days

    # Correlation matrix
    corr_matrix = log_returns.corr().values

    # Latest prices
    latest_prices = {t: float(close[t].iloc[-1]) for t in valid_tickers}

    # Price history for charts (last 252 days)
    history = close.tail(252).reset_index()
    history_dict = {
        "dates": history["Date"].dt.strftime("%Y-%m-%d").tolist(),
        "prices": {t: history[t].round(2).tolist() for t in valid_tickers},
    }

    return {
        "tickers": valid_tickers,
        "expected_returns": exp_returns.tolist(),
        "cov_matrix": cov_matrix.tolist(),
        "corr_matrix": corr_matrix.tolist(),
        "latest_prices": latest_prices,
        "history": history_dict,
        "data_points": len(log_returns),
        "period": period,
    }


async def get_live_quotes(tickers: list[str]) -> list[dict]:
    """
    Get real-time quote snapshots using yfinance fast_info.
    Returns list of {ticker, price, change_pct, volume, market_cap}.
    """
    quotes = []
    for ticker in tickers:
        try:
            t = yf.Ticker(ticker)
            info = t.fast_info
            quotes.append({
                "ticker": ticker,
                "price": round(info.last_price, 2),
                "change_pct": round(info.last_price / info.previous_close * 100 - 100, 2),
                "volume": info.three_month_average_volume,
                "market_cap": info.market_cap,
            })
        except Exception:
            quotes.append({"ticker": ticker, "price": None, "change_pct": None})
    return quotes


async def search_tickers(query: str) -> list[dict]:
    """Autocomplete ticker search."""
    try:
        results = yf.Search(query, max_results=8).quotes
        return [
            {"symbol": r.get("symbol"), "name": r.get("longname", r.get("shortname"))}
            for r in results
        ]
    except Exception:
        return []


def compute_efficient_frontier(
    tickers: list[str],
    exp_returns: np.ndarray,
    cov_matrix: np.ndarray,
    n_points: int = 50,
) -> list[dict]:
    """
    Compute classical efficient frontier via Monte Carlo sampling.
    Used for comparison chart in frontend.
    """
    n = len(tickers)
    frontier_points = []

    for _ in range(n_points):
        w = np.random.dirichlet(np.ones(n))
        ret = float(np.dot(w, exp_returns))
        risk = float(np.sqrt(w @ cov_matrix @ w))
        sharpe = ret / risk if risk > 0 else 0.0
        frontier_points.append({
            "risk": round(risk * 100, 2),
            "return": round(ret * 100, 2),
            "sharpe": round(sharpe, 3),
            "weights": {t: round(float(w[i]), 4) for i, t in enumerate(tickers)},
        })

    # Sort by risk
    frontier_points.sort(key=lambda x: x["risk"])
    return frontier_points


def _generate_mock_data(tickers: list[str]) -> dict:
    """Fallback mock data when API unavailable (for demo/testing)."""
    n = len(tickers)
    np.random.seed(42)
    exp_returns = np.random.uniform(0.05, 0.35, n)
    # Generate a valid (PSD) covariance matrix
    A = np.random.randn(n, n) * 0.02
    cov_matrix = A @ A.T + np.eye(n) * 0.04
    corr_matrix = np.corrcoef(cov_matrix)

    prices = {t: round(np.random.uniform(50, 1000), 2) for t in tickers}
    dates = pd.date_range(end=datetime.today(), periods=252, freq="B")

    return {
        "tickers": tickers,
        "expected_returns": exp_returns.tolist(),
        "cov_matrix": cov_matrix.tolist(),
        "corr_matrix": corr_matrix.tolist(),
        "latest_prices": prices,
        "history": {
            "dates": [d.strftime("%Y-%m-%d") for d in dates],
            "prices": {t: (np.cumprod(1 + np.random.randn(252) * 0.01) * prices[t]).round(2).tolist() for t in tickers},
        },
        "data_points": 252,
        "period": "mock",
    }
