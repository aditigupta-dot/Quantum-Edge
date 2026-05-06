from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from backend.routes_optimize import router

app = FastAPI(title="QuantumEdge API", description="Quantum Portfolio Optimization")

# CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")

# Serve frontend static files
app.mount("/", StaticFiles(directory="../frontend", html=True, check_dir=False), name="static")
@app.get("/health")
def health():
    return {"status": "ok"}