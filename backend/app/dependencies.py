from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client as SupabaseClient

from app.config import get_settings, Settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
security = HTTPBearer()


def response_data(response: object) -> object:
    return getattr(response, "data", None) if response is not None else None


def get_supabase() -> SupabaseClient:
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials
    try:
        db = get_supabase()
        user_response = db.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
            )
            
        user_id = user_response.user.id

        db = get_supabase()
        result = db.table("users").select("*, clinics(*)").eq("id", user_id).maybe_single().execute()
        result_data = response_data(result)
        if not result_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found. Please complete registration.",
            )
        logger.info(f"Authenticated user: {user_id}")
        return result_data
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
