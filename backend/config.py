"""backend/config.py — App configuration via .env"""
from pydantic_settings import BaseSettings  # type: ignore


class Settings(BaseSettings):
    IBM_QUANTUM_TOKEN: str = ""
    ALPHA_VANTAGE_KEY: str = ""
    SECRET_KEY: str = "change-me-in-production"
    DATABASE_URL: str = "sqlite+aiosqlite:///./quantumedge.db"
    DEBUG: bool = True

    class Config:
        env_file = ".env"


settings = Settings()