"""
Pydantic BaseSettings configuration for the RegTech Compliance OS backend.
Uses HS256 JWT — only SECRET_KEY needed, no PEM files.
"""

from pydantic import PostgresDsn, RedisDsn, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Required — no defaults ────────────────────────────────────────
    DATABASE_URL: PostgresDsn
    REDIS_URL: RedisDsn
    SECRET_KEY: str          # Used for HS256 JWT signing + general crypto
    ENVIRONMENT: str
    APP_VERSION: str

    # ── Optional — explicit defaults ──────────────────────────────────
    LOG_LEVEL: str = "INFO"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    BCRYPT_COST: int = 12
    RATE_LIMIT_ATTEMPTS: int = 5
    RATE_LIMIT_WINDOW_SECONDS: int = 900

    # ── Object Storage (optional — app works without it) ──────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET_NAME: str = ""
    AWS_S3_REGION: str = "ap-south-1"
    R2_ENDPOINT_URL: str = ""

    # ── Frontend URL (set on Render to allow CORS from Vercel) ────────
    FRONTEND_URL: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, value: str) -> str:
        if not value or len(value) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return value

    @field_validator("ENVIRONMENT")
    @classmethod
    def environment_must_be_valid(cls, value: str) -> str:
        allowed = {"development", "staging", "production"}
        if value not in allowed:
            raise ValueError(f"ENVIRONMENT must be one of {sorted(allowed)}, got '{value}'")
        return value
