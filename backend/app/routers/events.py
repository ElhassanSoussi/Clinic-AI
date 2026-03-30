from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.dependencies import get_supabase
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(tags=["events"])

ALLOWED_EVENTS = {"demo_opened", "demo_message_sent", "demo_cta_clicked"}


class EventCreate(BaseModel):
    event_type: str = Field(..., max_length=50)
    session_id: str = Field(default="", max_length=100)
    metadata: dict = Field(default_factory=dict)


@router.post("/events", status_code=201)
async def track_event(body: EventCreate):
    if body.event_type not in ALLOWED_EVENTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event type",
        )

    # Cap metadata to prevent abuse (max 5 keys, values truncated)
    safe_meta = {}
    for k, v in list(body.metadata.items())[:5]:
        safe_meta[str(k)[:50]] = str(v)[:200]

    try:
        db = get_supabase()
        db.table("events").insert(
            {
                "event_type": body.event_type,
                "session_id": body.session_id,
                "metadata": safe_meta,
            }
        ).execute()
    except Exception as e:
        # Log but don't fail — tracking is best-effort
        logger.warning(f"Failed to track event: {e}")

    return {"ok": True}
