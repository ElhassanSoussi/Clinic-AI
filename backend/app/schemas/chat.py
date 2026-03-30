from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    clinic_slug: str = Field(..., max_length=100)
    session_id: str = Field(..., max_length=200)
    message: str = Field(..., max_length=2000)


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    intent: Optional[str] = None
    lead_created: bool = False
    lead_id: Optional[str] = None
