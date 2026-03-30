from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LeadResponse(BaseModel):
    id: str
    clinic_id: str
    patient_name: str
    patient_phone: str
    patient_email: str
    reason_for_visit: str
    preferred_datetime_text: str
    status: str
    source: str
    notes: str
    slot_row_index: Optional[int] = None
    slot_source: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class LeadUpdateRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    reason_for_visit: Optional[str] = None
    preferred_datetime_text: Optional[str] = None


class LeadCreateRequest(BaseModel):
    patient_name: str
    patient_phone: str = ""
    patient_email: str = ""
    reason_for_visit: str = ""
    preferred_datetime_text: str = ""
    source: str = "web_chat"
    notes: str = ""
    slot_row_index: Optional[int] = None
    slot_source: Optional[str] = None
