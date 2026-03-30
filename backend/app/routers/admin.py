from fastapi import APIRouter, HTTPException, Header, status
from typing import Annotated, Optional

from app.config import get_settings
from app.dependencies import get_supabase
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])


def _verify_admin_secret(x_admin_secret: Annotated[Optional[str], Header()] = None) -> None:
    settings = get_settings()
    if not settings.admin_secret:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if x_admin_secret != settings.admin_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid admin credentials")


@router.get("/clinics")
async def list_all_clinics(x_admin_secret: Annotated[Optional[str], Header()] = None):
    """List all clinics with key metrics. Protected by admin secret."""
    _verify_admin_secret(x_admin_secret)
    db = get_supabase()

    result = db.table("clinics").select(
        "id, name, slug, plan, subscription_status, "
        "monthly_leads_used, monthly_lead_limit, "
        "onboarding_completed, created_at"
    ).order("created_at", desc=True).execute()

    # Get user count per clinic
    users_result = db.table("users").select("clinic_id").execute()
    user_counts: dict[str, int] = {}
    for u in users_result.data:
        cid = u.get("clinic_id")
        if cid:
            user_counts[cid] = user_counts.get(cid, 0) + 1

    clinics = []
    for c in result.data:
        clinics.append({
            **c,
            "user_count": user_counts.get(c["id"], 0),
        })

    return {"clinics": clinics, "total": len(clinics)}
