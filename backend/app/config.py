import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True)

    PROJECT_NAME: str = "DevPulse Telemetry Engine"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Database Settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://arnav@localhost:5432/devpulse"
    )
    
    # Fallback SQLite DB
    SQLITE_URL: str = "sqlite+aiosqlite:///./devpulse.db"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]
    
    # WebSocket Configuration
    WS_HEARTBEAT_INTERVAL_SEC: int = 15
    MAX_HISTORICAL_CACHE: int = 500


settings = Settings()
