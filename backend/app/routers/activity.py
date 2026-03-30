from fastapi import APIRouter, Depends, Query
from typing import Annotated, Optional
from datetime import datetime

from app.dependencies import get_current_user, get_supabase
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("")
async def get_activity(
    current_user: Annotated[dict, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
):
    """Return a lightweight activity feed composed from recent leads and conversations."""
    clinic_id = current_user["clinic_id"]
    db = get_supabase()

    events: list[dict] = []

    # Recent leads — each lead creation is an event
    leads_result = (
        db.table("leads")
        .select("id, patient_name, status, source, created_at, updated_at")
        .eq("clinic_id", clinic_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    for lead in leads_result.data or []:
        events.append({
            "type": "lead_created",
            "title": f"New appointment request from {lead['patient_name']}",
            "detail": f"Source: {lead.get('source', 'chat')}",
            "timestamp": lead["created_at"],
            "resource_id": lead["id"],
        })
        # If status is not 'new', the lead was updated
        if lead["status"] != "new" and lead["updated_at"] != lead["created_at"]:
            events.append({
                "type": "lead_status_changed",
                "title": f"{lead['patient_name']} marked as {lead['status']}",
                "detail": f"Status updated to {lead['status']}",
                "timestamp": lead["updated_at"],
                "resource_id": lead["id"],
            })

    # Recent conversations
    convs_result = (
        db.table("conversations")
        .select("id, session_id, lead_id, created_at")
        .eq("clinic_id", clinic_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    for conv in convs_result.data or []:
        events.append({
            "type": "conversation_started",
            "title": "Patient chat session started",
            "detail": f"Session {conv['session_id'][:8]}...",
            "timestamp": conv["created_at"],
            "resource_id": conv["id"],
        })

    # Sort all events by timestamp descending
    events.sort(key=lambda e: e["timestamp"], reverse=True)

    return events[:limit]
