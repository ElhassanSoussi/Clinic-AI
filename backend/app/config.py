import sys
from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from pydantic import AliasChoices, Field, ValidationError
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


class Settings(BaseSettings):
    # Required — app will not start without these
    supabase_url: str
    supabase_service_key: str = Field(
        validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY")
    )
    openai_api_key: str

    # Server config
    cors_origins: str
    openai_model: str = "gpt-4o-mini"
    app_name: str = "Clinic AI Front Desk"
    environment: Literal["development", "production"]
    scheduler_enabled: bool = True
    rate_limit_auth_per_minute: int = 10
    rate_limit_chat_per_minute: int = 20
    rate_limit_contact_per_minute: int = 10
    rate_limit_sms_webhook_per_minute: int = 30

    # Optional integrations
    google_credentials_b64: str = ""
    google_credentials_json: str = ""
    google_credentials_path: str = ""
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    microsoft_oauth_client_id: str = ""
    microsoft_oauth_client_secret: str = ""
    microsoft_oauth_tenant: str = "common"
    resend_api_key: str = ""
    resend_from_email: str = ""
    resend_from_domain: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_professional: str = ""
    stripe_price_premium: str = ""
    admin_secret: str = ""
    frontend_app_url: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    twilio_messaging_service_sid: str = ""
    sentry_dsn: str = ""

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

    @property
    def development_cors_origin_regex(self) -> str | None:
        if self.is_production:
            return None
        return (
            r"^https?://("
            r"localhost|127\.0\.0\.1|"
            r"10\.\d+\.\d+\.\d+|"
            r"192\.168\.\d+\.\d+|"
            r"172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+"
            r"):(1201|3000)$"
        )

    @property
    def google_credentials_configured(self) -> bool:
        return bool(
            self.google_credentials_b64
            or self.google_credentials_json
            or self.google_credentials_path
        )

    @property
    def google_oauth_configured(self) -> bool:
        return bool(self.google_oauth_client_id and self.google_oauth_client_secret)

    @property
    def microsoft_oauth_configured(self) -> bool:
        return bool(self.microsoft_oauth_client_id and self.microsoft_oauth_client_secret)

    @property
    def resend_sender_configured(self) -> bool:
        return bool(self.resend_from_email or self.resend_from_domain)

    @property
    def resend_configured(self) -> bool:
        return bool(self.resend_api_key and self.resend_sender_configured)

    @property
    def stripe_billing_configured(self) -> bool:
        return bool(
            self.stripe_secret_key
            and self.stripe_webhook_secret
            and self.stripe_price_professional
            and self.stripe_price_premium
        )

    @property
    def twilio_configured(self) -> bool:
        return bool(
            self.twilio_account_sid
            and self.twilio_auth_token
            and (self.twilio_from_number or self.twilio_messaging_service_sid)
        )

    @property
    def admin_tools_configured(self) -> bool:
        return bool(self.admin_secret)


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

    if not settings.google_credentials_configured:
        logger.warning("No Google credentials set — Sheets sync disabled")

    if settings.is_production:
        required_production_vars = {
            "CORS_ORIGINS": settings.cors_origins,
            "ENVIRONMENT": settings.environment,
        }
        missing = [name for name, value in required_production_vars.items() if not value]
        if missing:
            logger.error(
                "Missing required production environment variables: " + ", ".join(missing)
            )
            sys.exit(1)

        if not settings.frontend_app_url:
            logger.warning("FRONTEND_APP_URL is not set — Stripe deposit links and dashboard email links will stay disabled.")
        if not settings.stripe_secret_key:
            logger.warning("STRIPE_SECRET_KEY is not set — billing checkout and deposit requests will stay disabled.")
        if settings.stripe_secret_key and not settings.stripe_webhook_secret:
            logger.warning("STRIPE_WEBHOOK_SECRET is not set — Stripe payment status updates will not be confirmed.")
        if settings.stripe_secret_key and (
            not settings.stripe_price_professional or not settings.stripe_price_premium
        ):
            logger.warning("Stripe price IDs are incomplete — paid plan checkout will stay disabled for one or more plans.")
        if not settings.resend_api_key:
            logger.warning("RESEND_API_KEY is not set — email notifications will stay disabled.")
        elif not settings.resend_sender_configured:
            logger.warning("Resend sender identity is not configured — email notifications will stay disabled.")
        if not settings.twilio_configured:
            logger.warning("Twilio is not fully configured — SMS sending and inbound replies will stay disabled.")
        if not settings.admin_tools_configured:
            logger.warning("ADMIN_SECRET is not set — protected admin routes will stay unavailable.")


@lru_cache
def get_settings() -> Settings:
    try:
        settings = Settings()
    except ValidationError as exc:
        import logging

        logger = logging.getLogger("clinic_ai.config")
        env_names = {
            "supabase_url": "SUPABASE_URL",
            "supabase_service_key": "SUPABASE_SERVICE_ROLE_KEY",
            "openai_api_key": "OPENAI_API_KEY",
            "cors_origins": "CORS_ORIGINS",
            "environment": "ENVIRONMENT",
        }
        missing = sorted(
            {
                env_names.get(str(error.get("loc", ("",))[0]), str(error.get("loc", ("",))[0]).upper())
                for error in exc.errors()
                if error.get("type") == "missing"
            }
        )
        if missing:
            logger.error("Missing required environment variables: " + ", ".join(missing))
        else:
            logger.error("Invalid environment configuration.")
        sys.exit(1)

    _validate_settings(settings)
    return settings
