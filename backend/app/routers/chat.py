from fastapi import APIRouter, Depends, HTTPException, status

from app.config import get_settings
from app.rate_limit import create_rate_limit_dependency
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat_service import process_chat
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()
router = APIRouter(prefix="/chat", tags=["chat"])
chat_rate_limit = create_rate_limit_dependency("chat", settings.rate_limit_chat_per_minute)


@router.post("", response_model=ChatResponse, dependencies=[Depends(chat_rate_limit)])
async def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )
    if not req.clinic_slug.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Clinic slug is required.",
        )
    if not req.session_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Session ID is required.",
        )

    logger.info(f"Chat message for clinic '{req.clinic_slug}', session '{req.session_id[:8]}...'")

    try:
        result = await process_chat(req.clinic_slug, req.session_id, req.message)
        return ChatResponse(**result)
    except Exception as e:
        logger.error(f"Chat processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred processing your message. Please try again.",
        )
