from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Annotated, Optional

from app.dependencies import get_current_user, get_supabase
from app.schemas.lead import LeadResponse, LeadUpdateRequest, LeadCreateRequest
from app.services.lead_service import get_leads, get_lead, update_lead, create_lead
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/leads", tags=["leads"])

VALID_STATUSES = {"new", "contacted", "booked", "closed"}
LEAD_NOT_FOUND = "Lead not found."


@router.get("", response_model=list[LeadResponse])
async def list_leads(
    current_user: Annotated[dict, Depends(get_current_user)],
    status_filter: Annotated[Optional[str], Query(alias="status")] = None,
):
    clinic_id = current_user["clinic_id"]
    if status_filter and status_filter not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )
    return get_leads(clinic_id, status_filter)


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead_detail(
    lead_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    clinic_id = current_user["clinic_id"]
    lead = get_lead(clinic_id, lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=LEAD_NOT_FOUND,
        )
    return lead


@router.post("", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
async def create_new_lead(
    req: LeadCreateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    clinic_id = current_user["clinic_id"]
    lead = create_lead(clinic_id, req.model_dump())
    return lead


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead_detail(
    lead_id: str,
    req: LeadUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    clinic_id = current_user["clinic_id"]
    if req.status and req.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}",
        )
    lead = update_lead(clinic_id, lead_id, req.model_dump(exclude_none=True))
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=LEAD_NOT_FOUND,
        )
    logger.info(f"Lead {lead_id} updated by user {current_user['id']}")
    return lead


@router.get("/{lead_id}/conversation")
async def get_lead_conversation(
    lead_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    clinic_id = current_user["clinic_id"]
    lead = get_lead(clinic_id, lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=LEAD_NOT_FOUND,
        )
    db = get_supabase()
    conv = (
        db.table("conversations")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("lead_id", lead_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not conv.data:
        return {"conversation": None, "messages": []}
    conversation = conv.data[0]
    msgs = (
        db.table("conversation_messages")
        .select("*")
        .eq("conversation_id", conversation["id"])
        .order("created_at", desc=True)
        .limit(6)
        .execute()
    )
    messages = list(reversed(msgs.data)) if msgs.data else []
    return {"conversation": conversation, "messages": messages}
