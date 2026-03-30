from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user, get_supabase
from app.schemas.conversation import ConversationResponse, MessageResponse
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(current_user: Annotated[dict, Depends(get_current_user)]):
    clinic_id = current_user["clinic_id"]
    db = get_supabase()
    result = (
        db.table("conversations")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return result.data


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    clinic_id = current_user["clinic_id"]
    db = get_supabase()

    conv = (
        db.table("conversations")
        .select("id")
        .eq("id", conversation_id)
        .eq("clinic_id", clinic_id)
        .maybe_single()
        .execute()
    )
    if not conv.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )

    result = (
        db.table("conversation_messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )
    return result.data
