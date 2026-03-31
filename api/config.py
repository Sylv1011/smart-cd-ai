from functools import lru_cache
import os
from pathlib import Path
from typing import List, Literal, Optional

from pydantic import Field
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv


class Settings(BaseSettings):
    # Environment separation:
    # - `ENVIRONMENT=production` should be used for production deploys.
    # - `ENVIRONMENT=staging` (or `development`) can use safer local defaults.
    environment: Literal["production", "staging", "development"] = Field(
        default="development",
        alias="ENVIRONMENT",
    )
    database_url: Optional[str] = Field(default=None, alias="DATABASE_URL")
    prod_database_url: Optional[str] = Field(default=None, alias="PROD_DATABASE_URL")
    staging_database_url: Optional[str] = Field(default=None, alias="STAGING_DATABASE_URL")

    cors_allowed_origins_raw: Optional[str] = Field(default=None, alias="CORS_ALLOWED_ORIGINS")
    prod_cors_allowed_origins: Optional[str] = Field(default=None, alias="PROD_CORS_ALLOWED_ORIGINS")
    staging_cors_allowed_origins: Optional[str] = Field(default=None, alias="STAGING_CORS_ALLOWED_ORIGINS")
    dev_cors_allowed_origins: Optional[str] = Field(default=None, alias="DEV_CORS_ALLOWED_ORIGINS")

    # Vercel compatibility:
    # - production/staging rely on os.environ only
    # - local development can hydrate os.environ from .env in get_settings()
    model_config = SettingsConfigDict(case_sensitive=False)

    @property
    def resolved_database_url(self) -> str:
        env = self.environment

        # Environment separation:
        # - production uses PROD_DATABASE_URL only
        # - staging uses STAGING_DATABASE_URL only
        # - development uses STAGING_DATABASE_URL or fallback DATABASE_URL
        if env == "production":
            if self.prod_database_url:
                return self.prod_database_url
            raise ValueError("ENVIRONMENT=production requires PROD_DATABASE_URL.")

        if env == "staging":
            if self.staging_database_url:
                return self.staging_database_url
            raise ValueError("ENVIRONMENT=staging requires STAGING_DATABASE_URL.")

        if env == "development":
            if self.staging_database_url:
                return self.staging_database_url
            if self.database_url:
                return self.database_url
            # Default to local sqlite for dev runs.
            sqlite_path = Path(__file__).resolve().parent.parent / "test.db"
            return f"sqlite:///{sqlite_path.as_posix()}"

        # Defensive fallback in case enum validation is changed in the future.
        raise ValueError(f"Unknown ENVIRONMENT value: {env}")

    @property
    def cors_allowed_origins(self) -> List[str]:
        env = self.environment
        raw = None

        if env == "production":
            raw = self.prod_cors_allowed_origins or self.cors_allowed_origins_raw
        elif env == "staging":
            raw = self.staging_cors_allowed_origins or self.cors_allowed_origins_raw
        elif env == "development":
            raw = (
                self.dev_cors_allowed_origins
                or self.staging_cors_allowed_origins
                or self.cors_allowed_origins_raw
            )

        defaults = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:5500",
            "http://127.0.0.1:5500",
        ]

        parsed = [origin.strip() for origin in (raw or "").split(",") if origin.strip()]
        if env == "production":
            return parsed or defaults

        merged = list(dict.fromkeys(parsed + defaults))
        return merged


@lru_cache
def get_settings() -> Settings:
    # Load .env for local runs regardless of ENVIRONMENT.
    # In production, the file usually doesn't exist, so this is a no-op.
    dotenv_path = Path(__file__).resolve().parent / ".env"
    if dotenv_path.exists():
        load_dotenv(dotenv_path=dotenv_path, override=False)

    try:
        return Settings()
    except ValidationError as exc:
        raise ValueError(
            "Invalid or missing environment configuration. "
            "Set ENVIRONMENT to one of: production, staging, development."
        ) from exc
