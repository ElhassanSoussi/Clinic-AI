import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated
from pydantic import BaseModel

from app.dependencies import get_current_user, get_supabase
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse, UpdateProfileRequest, ChangePasswordRequest
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


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
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}",
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

    logger.info(f"Registered user {user_id} with clinic {clinic['id']}")

    return AuthResponse(
        access_token=access_token,
        user_id=str(user_id),
        email=req.email,
        full_name=req.full_name,
        clinic_id=clinic["id"],
        clinic_slug=slug,
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not auth_response.user or not auth_response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user_id = auth_response.user.id

    user_result = (
        db.table("users")
        .select("*, clinics(*)")
        .eq("id", user_id)
        .single()
        .execute()
    )

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


@router.post("/oauth-complete", response_model=OAuthCompleteResponse)
async def oauth_complete(req: OAuthCompleteRequest):
    """
    Called after OAuth callback. Validates the Supabase access token,
    looks up or creates the backend user + clinic records.
    """
    db = get_supabase()

    # Validate the token and get the Supabase user
    try:
        user_response = db.auth.get_user(req.access_token)
        if not user_response or not user_response.user:
            raise ValueError("No user")
    except Exception as e:
        logger.error(f"OAuth complete: invalid token — {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
        )

    su_user = user_response.user
    user_id = su_user.id
    email = su_user.email or ""

    # Check if the user already has a backend profile
    try:
        existing = (
            db.table("users")
            .select("*, clinics(*)")
            .eq("id", user_id)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        logger.error(f"OAuth complete: failed to query user profile for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load your account. Please try again.",
        )

    existing_data = response_data(existing)

    if existing_data:
        # Existing user — return their profile
        user = existing_data
        clinic = normalize_clinic_relation(user.get("clinics"))
        full_name = as_text(user.get("full_name"), as_text(su_user.user_metadata.get("full_name") if su_user.user_metadata else None, email.split("@")[0] if email else "Clinic User"))
        logger.info(f"OAuth login for existing user {user_id}")
        return OAuthCompleteResponse(
            access_token=req.access_token,
            user_id=str(user_id),
            email=as_text(user.get("email"), email),
            full_name=full_name,
            clinic_id=as_text(user.get("clinic_id")),
            clinic_slug=as_text(clinic.get("slug")),
            is_new=False,
        )

    # New user — derive a name from the OAuth profile
    meta = su_user.user_metadata or {}
    full_name = as_text(
        meta.get("full_name") or meta.get("name"),
        email.split("@")[0] if email else "Clinic User",
    )

    # Create clinic + user
    clinic_name = f"{full_name}'s Clinic"
    base_slug = slugify(clinic_name)
    slug = base_slug or f"clinic-{str(uuid.uuid4())[:8]}"

    try:
        slug_check = db.table("clinics").select("slug").eq("slug", slug).execute()
        if response_data(slug_check):
            prefix = base_slug or "clinic"
            slug = f"{prefix}-{str(uuid.uuid4())[:6]}"
    except Exception as e:
        logger.error(f"OAuth complete: failed to check clinic slug for {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to prepare your clinic profile. Please try again.",
        )

    clinic = None
    try:
        clinic_result = db.table("clinics").insert({
            "name": clinic_name,
            "slug": slug,
            "plan": "trial",
            "subscription_status": "trialing",
            "monthly_lead_limit": 25,
            "monthly_leads_used": 0,
        }).execute()
        clinic_rows = response_data(clinic_result)
        if not isinstance(clinic_rows, list) or not clinic_rows:
            raise ValueError("Clinic insert returned no rows")
        clinic = clinic_rows[0]

        db.table("users").insert({
            "id": user_id,
            "clinic_id": clinic["id"],
            "full_name": full_name,
            "email": email,
            "role": "owner",
        }).execute()
    except Exception as e:
        logger.error(f"OAuth profile creation failed for {user_id}: {e}")
        try:
            existing_retry = (
                db.table("users")
                .select("*, clinics(*)")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )
            retry_data = response_data(existing_retry)
            if retry_data:
                user = retry_data
                clinic_retry = normalize_clinic_relation(user.get("clinics"))
                logger.info(f"OAuth profile already existed after retry for {user_id}")
                return OAuthCompleteResponse(
                    access_token=req.access_token,
                    user_id=str(user_id),
                    email=as_text(user.get("email"), email),
                    full_name=as_text(user.get("full_name"), full_name),
                    clinic_id=as_text(user.get("clinic_id")),
                    clinic_slug=as_text(clinic_retry.get("slug")),
                    is_new=False,
                )
        except Exception as retry_error:
            logger.error(f"OAuth retry lookup failed for {user_id}: {retry_error}")

        if clinic and clinic.get("id"):
            try:
                db.table("clinics").delete().eq("id", clinic["id"]).execute()
            except Exception as cleanup_error:
                logger.error(f"OAuth clinic cleanup failed for {user_id}: {cleanup_error}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create profile. Please try again.",
        )

    logger.info(f"OAuth registered new user {user_id} with clinic {clinic['id']}")

    return OAuthCompleteResponse(
        access_token=req.access_token,
        user_id=str(user_id),
        email=as_text(email),
        full_name=full_name,
        clinic_id=as_text(clinic["id"]),
        clinic_slug=slug,
        is_new=True,
    )
