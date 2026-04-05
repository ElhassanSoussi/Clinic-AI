from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.routers import auth, clinics, leads, conversations, chat, billing, activity, admin, events, contact, frontdesk
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

# Disable interactive API docs in production
_docs_url = None if settings.is_production else "/api/docs"
_redoc_url = None if settings.is_production else "/api/redoc"

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
)

origins = settings.cors_origin_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=settings.development_cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        return response


app.add_middleware(SecurityHeadersMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


app.include_router(auth.router, prefix="/api")
app.include_router(clinics.router, prefix="/api")
app.include_router(leads.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(contact.router, prefix="/api")
app.include_router(frontdesk.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


logger.info(f"{settings.app_name} API initialized (env={settings.environment}, cors={origins})")
