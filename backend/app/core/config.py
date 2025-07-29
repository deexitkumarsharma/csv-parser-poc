from typing import List, Optional
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    
    # Application
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    
    # Gemini AI
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_MAX_TOKENS: int = 4000
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL: int = 86400
    
    # Database
    DATABASE_URL: str = "postgresql://parser_user:parser_pass@localhost:5432/parser_db"
    
    # Security
    JWT_SECRET: str = "your-secret-key-here"
    ENCRYPTION_KEY: str = "your-encryption-key-here"
    
    # File Upload
    MAX_FILE_SIZE_MB: int = 50
    MAX_ROWS_PER_FILE: int = 100000
    ALLOWED_EXTENSIONS: List[str] = ["csv", "xlsx", "xls"]
    UPLOAD_DIR: Path = Path("uploads")
    
    # Rate Limiting
    RATE_LIMIT_PER_HOUR: int = 100
    RATE_LIMIT_BURST: int = 10
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # WebSocket
    WS_MESSAGE_QUEUE: str = "redis://localhost:6379/1"
    
    # Background Jobs
    CELERY_BROKER_URL: str = "redis://localhost:6379/2"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/3"
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    LOG_LEVEL: str = "INFO"
    
    # Cost Tracking
    MAX_COST_PER_FILE: float = 0.10
    COST_WARNING_THRESHOLD: float = 0.05
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.UPLOAD_DIR.mkdir(exist_ok=True)


settings = Settings()