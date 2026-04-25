"""
QuantumEdge — Main FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.routes_optimize import router as optimize_router
from api.routes_data import router as data_router
from api.routes_auth import router as auth_router
from models.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="QuantumEdge API",
    description="Quantum Portfolio Optimization using QAOA & QUBO",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(optimize_router, prefix="/optimize", tags=["Optimization"])
app.include_router(data_router,     prefix="/stocks",   tags=["Market Data"])
app.include_router(auth_router,     prefix="/auth",     tags=["Auth"])

@app.get("/")
async def root():
    return {
        "service": "QuantumEdge",
        "version": "1.0.0",
        "quantum_backends": ["ibm_brisbane", "ibm_kyoto", "dwave_advantage", "simulator"],
        "status": "operational"
    }

@app.get("/health")
async def health():
    return {"status": "ok"}