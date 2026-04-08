from fastapi import APIRouter, Depends, Query
from typing import Annotated
from types import SimpleNamespace

from app.dependencies import get_current_user, get_supabase
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/activity", tags=["activity"])


def _conversation_activity_detail(session_id: object, conv_id: object) -> str:
    """Build a short detail line without assuming session_id is present (avoids TypeError on [:8])."""
    sid = session_id if isinstance(session_id, str) else ""
    if len(sid) >= 8:
        return f"Session {sid[:8]}…"
    if sid:
        return f"Session {sid}"
    cid = str(conv_id or "").strip()
    if cid:
        return f"Conversation {cid[:8]}…" if len(cid) >= 8 else f"Conversation {cid}"
    return "Web or SMS thread opened."


@router.get("")
async def get_activity(
    current_user: Annotated[dict, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
):
    """Return a lightweight activity feed composed from recent leads and conversations."""
    clinic_id = current_user["clinic_id"]
    db = get_supabase()

    events: list[dict] = []

    try:
        leads_result = (
            db.table("leads")
            .select("id, patient_name, status, source, created_at, updated_at")
            .eq("clinic_id", clinic_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception as exc:
        logger.warning("activity leads query failed clinic_id=%s error=%s", clinic_id, exc)
        leads_result = SimpleNamespace(data=[])

    for lead in leads_result.data or []:
        lid = lead.get("id")
        if not lid:
            continue
        name = (lead.get("patient_name") or "Patient").strip() or "Patient"
        src = lead.get("source") or "chat"
        created_at = lead.get("created_at")
        updated_at = lead.get("updated_at")
        status = lead.get("status") or "new"
        if not created_at:
            continue
        events.append({
            "type": "lead_created",
            "title": f"New appointment request from {name}",
            "detail": f"Source: {src}",
            "timestamp": created_at,
            "resource_id": lid,
        })
        if status != "new" and updated_at and updated_at != created_at:
            events.append({
                "type": "lead_status_changed",
                "title": f"{name} marked as {status}",
                "detail": f"Status updated to {status}",
                "timestamp": updated_at,
                "resource_id": lid,
            })

    try:
        convs_result = (
            db.table("conversations")
            .select("id, session_id, lead_id, created_at")
            .eq("clinic_id", clinic_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
    except Exception as exc:
        logger.warning("activity conversations query failed clinic_id=%s error=%s", clinic_id, exc)
        convs_result = SimpleNamespace(data=[])

    for conv in convs_result.data or []:
        cid = conv.get("id")
        if not cid or not conv.get("created_at"):
            continue
        events.append({
            "type": "conversation_started",
            "title": "Patient chat session started",
            "detail": _conversation_activity_detail(conv.get("session_id"), cid),
            "timestamp": conv["created_at"],
            "resource_id": cid,
        })

    events.sort(key=lambda e: e.get("timestamp") or "", reverse=True)

    return events[:limit]
