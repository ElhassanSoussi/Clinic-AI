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
    appointment_status: Optional[str] = None
    appointment_starts_at: Optional[datetime] = None
    appointment_ends_at: Optional[datetime] = None
    reminder_status: Optional[str] = None
    reminder_scheduled_for: Optional[datetime] = None
    reminder_note: Optional[str] = ""
    deposit_required: Optional[bool] = False
    deposit_amount_cents: Optional[int] = None
    deposit_status: Optional[str] = None
    source: str
    notes: str
    slot_row_index: Optional[int] = None
    slot_source: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class LeadUpdateRequest(BaseModel):
    status: Optional[str] = None
    appointment_status: Optional[str] = None
    appointment_starts_at: Optional[datetime] = None
    appointment_ends_at: Optional[datetime] = None
    reminder_status: Optional[str] = None
    reminder_scheduled_for: Optional[datetime] = None
    reminder_note: Optional[str] = None
    deposit_required: Optional[bool] = None
    deposit_amount_cents: Optional[int] = None
    deposit_status: Optional[str] = None
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
    appointment_status: Optional[str] = None
    appointment_starts_at: Optional[datetime] = None
    appointment_ends_at: Optional[datetime] = None
    reminder_status: Optional[str] = None
    reminder_scheduled_for: Optional[datetime] = None
    reminder_note: Optional[str] = None
    deposit_required: Optional[bool] = None
    deposit_amount_cents: Optional[int] = None
    deposit_status: Optional[str] = None
    slot_row_index: Optional[int] = None
    slot_source: Optional[str] = None
