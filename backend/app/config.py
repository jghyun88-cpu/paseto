from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """애플리케이션 설정 — 환경변수에서 로드"""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://accel_admin:elsa_dev_2026@db:5432/accel_os"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # File Storage
    UPLOAD_DIR: str = "/app/uploads"
    MAX_FILE_SIZE_MB: int = 50

    # Celery
    CELERY_BROKER_URL: str = "redis://redis:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://redis:6379/1"

    # AI Agent (elsa-mcp 서비스 계정)
    SERVICE_KEY: str = ""
    SERVICE_TOKEN_EXPIRATION_HOURS: int = 720  # 30일

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
