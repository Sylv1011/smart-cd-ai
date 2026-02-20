from functools import lru_cache
from typing import List, Literal, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Environment separation:
    # - `ENVIRONMENT=production` should be used for production deploys.
    # - `ENVIRONMENT=staging` (or `development`) can use safer local defaults.
    environment: Literal["production", "staging", "development"] = Field(alias="ENVIRONMENT")
    database_url: Optional[str] = Field(default=None, alias="DATABASE_URL")
    prod_database_url: Optional[str] = Field(default=None, alias="PROD_DATABASE_URL")
    staging_database_url: Optional[str] = Field(default=None, alias="STAGING_DATABASE_URL")
    cors_allowed_origins: str = Field(default="", alias="CORS_ALLOWED_ORIGINS")
    prod_cors_allowed_origins: str = Field(default="", alias="PROD_CORS_ALLOWED_ORIGINS")
    staging_cors_allowed_origins: str = Field(default="", alias="STAGING_CORS_ALLOWED_ORIGINS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    @property
    def cors_origins(self) -> List[str]:
        if self.cors_allowed_origins.strip():
            return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

        # Never default to '*' in production.
        if self.environment.lower() == "production":
            return []

        # Local-friendly defaults for non-production environments.
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]

    @property
    def resolved_cors_origins(self) -> List[str]:
        env = self.environment

        if env == "production":
            if self.prod_cors_allowed_origins.strip():
                return [origin.strip() for origin in self.prod_cors_allowed_origins.split(",") if origin.strip()]

            if self.cors_allowed_origins.strip():
                return [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]

            # Fail safe in production: explicit browser allowlist must be configured.
            raise ValueError(
                "Production CORS allowlist is not configured. "
                "Set PROD_CORS_ALLOWED_ORIGINS (or CORS_ALLOWED_ORIGINS)."
            )

        if env in ("staging", "development") and self.staging_cors_allowed_origins.strip():
            return [origin.strip() for origin in self.staging_cors_allowed_origins.split(",") if origin.strip()]

        return self.cors_origins

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
            raise ValueError(
                "ENVIRONMENT=development requires STAGING_DATABASE_URL or DATABASE_URL."
            )

        # Defensive fallback in case enum validation is changed in the future.
        raise ValueError(f"Unknown ENVIRONMENT value: {env}")


@lru_cache
def get_settings() -> Settings:
    return Settings()
