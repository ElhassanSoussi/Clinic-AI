import sys
from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    # Required — app will not start without these
    supabase_url: str
    supabase_service_key: str
    openai_api_key: str

    # Server config
    cors_origins: str
    openai_model: str = "gpt-4o-mini"
    app_name: str = "Clinic AI Front Desk"
    environment: Literal["development", "production"]

    # Optional integrations
    google_credentials_b64: str = ""
    google_credentials_json: str = ""
    google_credentials_path: str = ""
    resend_api_key: str = ""
    resend_from_email: str = ""
    resend_from_domain: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_professional: str = ""
    stripe_price_premium: str = ""
    admin_secret: str = ""
    frontend_app_url: str = ""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[1] / ".env"),
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


def _is_loopback_host(hostname: str) -> bool:
    return hostname.lower() in {"localhost", "127.0.0.1", "::1"}


def _validate_absolute_url(name: str, value: str, *, allow_loopback: bool) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"{name} must be a full http(s) URL.")

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise ValueError(f"{name} must include a hostname.")

    if not allow_loopback and _is_loopback_host(hostname):
        raise ValueError(f"{name} cannot point to localhost or another loopback host in production.")

    return value.rstrip("/")


def _validate_settings(settings: Settings) -> None:
    """Fail fast on invalid deployment configuration."""
    import logging
    logger = logging.getLogger("clinic_ai.config")

    if not settings.cors_origin_list:
        logger.error("CORS_ORIGINS must include at least one allowed origin.")
        sys.exit(1)

    allow_loopback = not settings.is_production

    try:
        for origin in settings.cors_origin_list:
            _validate_absolute_url("CORS_ORIGINS", origin, allow_loopback=allow_loopback)
        if settings.frontend_app_url:
            _validate_absolute_url(
                "FRONTEND_APP_URL",
                settings.frontend_app_url,
                allow_loopback=allow_loopback,
            )
    except ValueError as exc:
        logger.error(str(exc))
        sys.exit(1)

    if not any([settings.google_credentials_b64, settings.google_credentials_json, settings.google_credentials_path]):
        logger.warning("No Google credentials set — Sheets sync disabled")

    if settings.is_production:
        required_production_vars = {
            "STRIPE_SECRET_KEY": settings.stripe_secret_key,
            "STRIPE_WEBHOOK_SECRET": settings.stripe_webhook_secret,
            "RESEND_API_KEY": settings.resend_api_key,
            "RESEND_FROM_EMAIL": settings.resend_from_email,
            "FRONTEND_APP_URL": settings.frontend_app_url,
            "CORS_ORIGINS": settings.cors_origins,
            "ENVIRONMENT": settings.environment,
        }
        missing = [name for name, value in required_production_vars.items() if not value]
        if missing:
            logger.error(
                "Missing required production environment variables: " + ", ".join(missing)
            )
            sys.exit(1)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    _validate_settings(settings)
    return settings
