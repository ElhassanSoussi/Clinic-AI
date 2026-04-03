import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated, cast
from pydantic import BaseModel

from app.dependencies import get_current_user, get_supabase
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, UpdateProfileRequest, ChangePasswordRequest
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

USER_WITH_CLINIC_SELECT = "*, clinics(*)"


def slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug


def as_text(value: object, fallback: str = "") -> str:
    if value is None:
        return fallback
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or fallback
    return str(value)


def normalize_clinic_relation(value: object) -> dict:
    if isinstance(value, list):
        for item in value:
            if isinstance(item, dict):
                return item
        return {}
    if isinstance(value, dict):
        return value
    return {}


def response_data(response: object) -> object:
    return getattr(response, "data", None) if response is not None else None


def get_user_profile(db: object, user_id: object) -> object:
    return (
        db.table("users")
        .select(USER_WITH_CLINIC_SELECT)
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )


def get_session_access_token(db: object, email: str, password: str) -> str:
    try:
        sign_in_response = db.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
    except Exception:
        return ""

    session = getattr(sign_in_response, "session", None)
    access_token = getattr(session, "access_token", "")
    return cast(str, access_token or "")


def _normalized_auth_error(exc: Exception, *, action: str) -> tuple[int, str]:
    message = str(exc).strip()
    lower = message.lower()

    if "rate limit" in lower:
        return (
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many sign-up attempts right now. Please wait a minute and try again.",
        )
    if "user already registered" in lower or "already been registered" in lower:
        return (
            status.HTTP_400_BAD_REQUEST,
            "An account with this email already exists. Try signing in instead.",
        )
    if "email not confirmed" in lower:
        return (
            status.HTTP_403_FORBIDDEN,
            "Check your email to confirm your address before signing in.",
        )
    if "invalid login credentials" in lower:
        return (
            status.HTTP_401_UNAUTHORIZED,
            "Invalid email or password.",
        )
    if action == "register":
        return (
            status.HTTP_400_BAD_REQUEST,
            f"Registration failed: {message}",
        )
    return (
        status.HTTP_401_UNAUTHORIZED,
        "Invalid email or password.",
    )


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest):
    db = get_supabase()
    try:
        auth_response = db.auth.sign_up({
            "email": req.email,
            "password": req.password,
        })
    except Exception as e:
        logger.error(f"Supabase auth sign_up error: {e}")
        status_code, detail = _normalized_auth_error(e, action="register")
        raise HTTPException(
            status_code=status_code,
            detail=detail,
        )

    if not auth_response.user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Please try again.",
        )

    user_id = auth_response.user.id
    base_slug = slugify(req.clinic_name)
    slug = base_slug

    existing = db.table("clinics").select("slug").eq("slug", slug).execute()
    if existing.data:
        import uuid
        slug = f"{base_slug}-{str(uuid.uuid4())[:6]}"

    try:
        clinic_result = db.table("clinics").insert({
            "name": req.clinic_name,
            "slug": slug,
            "plan": "trial",
            "subscription_status": "trialing",
            "monthly_lead_limit": 25,
            "monthly_leads_used": 0,
        }).execute()
        clinic = clinic_result.data[0]

        db.table("users").insert({
            "id": user_id,
            "clinic_id": clinic["id"],
            "full_name": req.full_name,
            "email": req.email,
            "role": "owner",
        }).execute()
    except Exception as e:
        logger.error(f"Profile creation failed for user {user_id}, rolling back auth user: {e}")
        try:
            db.auth.admin.delete_user(user_id)
        except Exception as rollback_err:
            logger.error(f"Rollback failed — orphaned auth user {user_id}: {rollback_err}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed during profile creation. Please try again.",
        )

    access_token = auth_response.session.access_token if auth_response.session else ""
    if not access_token:
        access_token = get_session_access_token(db, req.email, req.password)

    logger.info(f"Registered user {user_id} with clinic {clinic['id']}")

    return AuthResponse(
        access_token=access_token,
        user_id=str(user_id),
        email=req.email,
        full_name=req.full_name,
        clinic_id=clinic["id"],
        clinic_slug=slug,
        requires_email_confirmation=not bool(access_token),
        message=(
            "Account created. Check your email to confirm your address before signing in."
            if not access_token
            else ""
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    db = get_supabase()
    try:
        auth_response = db.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })
    except Exception as e:
        logger.error(f"Login error: {e}")
        status_code, detail = _normalized_auth_error(e, action="login")
        raise HTTPException(
            status_code=status_code,
            detail=detail,
        )

    if not auth_response.user or not auth_response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user_id = auth_response.user.id

    user_result = get_user_profile(db, user_id)

    if not user_result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found.",
        )

    user = user_result.data
    clinic = user.get("clinics", {})

    logger.info(f"User logged in: {user_id}")

    return AuthResponse(
        access_token=auth_response.session.access_token,
        user_id=str(user_id),
        email=user["email"],
        full_name=user["full_name"],
        clinic_id=user["clinic_id"],
        clinic_slug=clinic.get("slug", ""),
        requires_email_confirmation=False,
        message="",
    )


@router.put("/profile")
async def update_profile(
    req: UpdateProfileRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    updates = req.model_dump(exclude_none=True)
    if not updates:
        return {"message": "No changes."}
    db = get_supabase()
    db.table("users").update(updates).eq("id", current_user["id"]).execute()
    logger.info(f"User {current_user['id']} updated profile: {list(updates.keys())}")
    return {"message": "Profile updated."}


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    db = get_supabase()
    # Verify current password by attempting sign-in
    try:
        db.auth.sign_in_with_password({
            "email": current_user["email"],
            "password": req.current_password,
        })
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    # Update via admin API
    try:
        db.auth.admin.update_user_by_id(
            current_user["id"],
            {"password": req.new_password},
        )
    except Exception as e:
        logger.error(f"Password update failed for {current_user['id']}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password. Please try again.",
        )
    logger.info(f"User {current_user['id']} changed password")
    return {"message": "Password changed successfully."}


class OAuthCompleteRequest(BaseModel):
    access_token: str


class OAuthCompleteResponse(BaseModel):
    access_token: str
    user_id: str
    email: str
    full_name: str
    clinic_id: str
    clinic_slug: str
    is_new: bool


def build_oauth_response(
    access_token: str,
    user_id: object,
    email: object,
    full_name: object,
    clinic_id: object,
    clinic_slug: object,
    is_new: bool,
) -> OAuthCompleteResponse:
    return OAuthCompleteResponse(
        access_token=access_token,
        user_id=str(user_id),
        email=as_text(email),
        full_name=as_text(full_name),
        clinic_id=as_text(clinic_id),
        clinic_slug=as_text(clinic_slug),
        is_new=is_new,
    )


def get_authenticated_oauth_user(db: object, access_token: str) -> tuple[object, str, str]:
    try:
        user_response = db.auth.get_user(access_token)
        if not user_response or not user_response.user:
            raise ValueError("No user")
    except Exception as e:
        logger.error(f"OAuth complete: invalid token — {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        )

    user = user_response.user
    return user, user.id, user.email or ""


def get_oauth_full_name(supabase_user: object, email: str) -> str:
    metadata = getattr(supabase_user, "user_metadata", None) or {}
    return as_text(
        metadata.get("full_name") or metadata.get("name"),
        email.split("@")[0] if email else "Clinic User",
    )


def lookup_existing_oauth_profile(db: object, user_id: str, email: str, supabase_user: object) -> OAuthCompleteResponse | None:
    try:
        existing = get_user_profile(db, user_id)
    except Exception as e:
        logger.error(f"OAuth complete: failed to query user profile for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load your account. Please try again.",
        )

    user = response_data(existing)
    if not user:
        return None

    clinic = normalize_clinic_relation(user.get("clinics"))
    full_name = as_text(user.get("full_name"), get_oauth_full_name(supabase_user, email))
    logger.info(f"OAuth login for existing user {user_id}")
    return build_oauth_response(
        access_token="",
        user_id=user_id,
        email=as_text(user.get("email"), email),
        full_name=full_name,
        clinic_id=user.get("clinic_id"),
        clinic_slug=clinic.get("slug"),
        is_new=False,
    )


def generate_available_slug(db: object, clinic_name: str, user_id: str) -> str:
    base_slug = slugify(clinic_name)
    slug = base_slug or f"clinic-{str(uuid.uuid4())[:8]}"

    try:
        slug_check = db.table("clinics").select("slug").eq("slug", slug).execute()
    except Exception as e:
        logger.error(f"OAuth complete: failed to check clinic slug for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to prepare your clinic profile. Please try again.",
        )

    if response_data(slug_check):
        prefix = base_slug or "clinic"
        return f"{prefix}-{str(uuid.uuid4())[:6]}"
    return slug


def retry_oauth_profile_lookup(db: object, user_id: str, access_token: str, email: str, full_name: str) -> OAuthCompleteResponse | None:
    try:
        existing_retry = get_user_profile(db, user_id)
    except Exception as retry_error:
        logger.error(f"OAuth retry lookup failed for {user_id}: {retry_error}")
        return None

    user = response_data(existing_retry)
    if not user:
        return None

    clinic = normalize_clinic_relation(user.get("clinics"))
    logger.info(f"OAuth profile already existed after retry for {user_id}")
    return build_oauth_response(
        access_token=access_token,
        user_id=user_id,
        email=as_text(user.get("email"), email),
        full_name=as_text(user.get("full_name"), full_name),
        clinic_id=user.get("clinic_id"),
        clinic_slug=clinic.get("slug"),
        is_new=False,
    )


def create_oauth_clinic_and_user(db: object, user_id: str, email: str, full_name: str) -> tuple[dict, str]:
    clinic_name = f"{full_name}'s Clinic"
    slug = generate_available_slug(db, clinic_name, user_id)
    clinic: dict = {}

    try:
        clinic_result = db.table("clinics").insert({
            "name": clinic_name,
            "slug": slug,
            "plan": "trial",
            "subscription_status": "trialing",
            "monthly_lead_limit": 25,
            "monthly_leads_used": 0,
        }).execute()
        clinic_rows_data = response_data(clinic_result)
        if not isinstance(clinic_rows_data, list):
            raise ValueError("Clinic insert returned invalid rows")

        clinic_rows: list[object] = cast(list[object], clinic_rows_data)
        clinic = next((row for row in clinic_rows if isinstance(row, dict)), {})
        if not clinic:
            raise ValueError("Clinic insert returned no rows")

        db.table("users").insert({
            "id": user_id,
            "clinic_id": clinic["id"],
            "full_name": full_name,
            "email": email,
            "role": "owner",
        }).execute()
    except Exception as e:
        logger.error(f"OAuth profile creation failed for {user_id}: {e}")
        existing_profile = retry_oauth_profile_lookup(db, user_id, "", email, full_name)
        if existing_profile:
            return {"id": existing_profile.clinic_id, "slug": existing_profile.clinic_slug}, existing_profile.full_name

        if clinic.get("id"):
            try:
                db.table("clinics").delete().eq("id", clinic["id"]).execute()
            except Exception as cleanup_error:
                logger.error(f"OAuth clinic cleanup failed for {user_id}: {cleanup_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create profile. Please try again.",
        )

    return clinic, full_name


@router.post("/oauth-complete", response_model=OAuthCompleteResponse)
async def oauth_complete(req: OAuthCompleteRequest):
    """
    Called after OAuth callback. Validates the Supabase access token,
    looks up or creates the backend user + clinic records.
    """
    db = get_supabase()
    supabase_user, user_id, email = get_authenticated_oauth_user(db, req.access_token)

    existing_profile = lookup_existing_oauth_profile(db, user_id, email, supabase_user)
    if existing_profile:
        existing_profile.access_token = req.access_token
        return existing_profile

    full_name = get_oauth_full_name(supabase_user, email)
    clinic, resolved_full_name = create_oauth_clinic_and_user(db, user_id, email, full_name)

    logger.info(f"OAuth registered new user {user_id} with clinic {clinic['id']}")
    return build_oauth_response(
        access_token=req.access_token,
        user_id=user_id,
        email=email,
        full_name=resolved_full_name,
        clinic_id=clinic["id"],
        clinic_slug=clinic["slug"],
        is_new=True,
    )
