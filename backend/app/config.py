import sys
from pathlib import Path
from urllib.parse import urlparse
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Required — app will not start without these
    supabase_url: str
    supabase_service_key: str
    openai_api_key: str

    # Server config
    cors_origins: str = (
        "http://localhost:1201,"
        "http://127.0.0.1:1201,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )
    openai_model: str = "gpt-4o-mini"
    app_name: str = "Clinic AI Front Desk"
    environment: str = "development"  # "development" | "production"

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


def _validate_settings(settings: Settings) -> None:
    """Fail fast if critical config is missing. Warn for optional integrations."""
    import logging
    logger = logging.getLogger("clinic_ai.config")

    # Warn about optional integrations that won't work
    if not settings.stripe_secret_key:
        logger.warning("STRIPE_SECRET_KEY not set — billing features disabled")
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — email notifications disabled")
    elif not (settings.resend_from_email or settings.resend_from_domain):
        logger.warning(
            "RESEND_API_KEY is set but RESEND_FROM_EMAIL/RESEND_FROM_DOMAIN is missing — outbound email may fail"
        )
    if not any([settings.google_credentials_b64, settings.google_credentials_json, settings.google_credentials_path]):
        logger.warning("No Google credentials set — Sheets sync disabled")

    if settings.is_production:
        loopback_hosts = {"localhost", "127.0.0.1", "::1"}
        invalid_origins = [
            origin
            for origin in settings.cors_origin_list
            if (urlparse(origin).hostname or "").lower() in loopback_hosts
        ]
        if invalid_origins:
            logger.error(
                "CORS_ORIGINS contains loopback hosts in production — update it to your real frontend domain(s): "
                + ", ".join(invalid_origins)
            )
            sys.exit(1)

        if settings.frontend_app_url:
            frontend_host = (urlparse(settings.frontend_app_url).hostname or "").lower()
            if frontend_host in loopback_hosts:
                logger.error("FRONTEND_APP_URL points to a loopback host in production")
                sys.exit(1)
        else:
            logger.warning(
                "FRONTEND_APP_URL is not set — email/dashboard links will be unavailable in production"
            )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    _validate_settings(settings)
    return settings
