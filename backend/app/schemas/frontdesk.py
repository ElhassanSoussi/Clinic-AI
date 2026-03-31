from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.conversation import MessageResponse
from app.schemas.lead import LeadResponse


class InboxConversationResponse(BaseModel):
    id: str
    session_id: str
    customer_key: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: str
    channel: str
    lead_id: Optional[str] = None
    lead_status: Optional[str] = None
    derived_status: str
    last_intent: Optional[str] = None
    summary: Optional[str] = None
    last_message_preview: str
    last_message_role: Optional[str] = None
    last_message_at: Optional[datetime] = None
    conversation_started_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    requires_attention: bool = False
    unlinked: bool = False


class ConversationDetailResponse(BaseModel):
    conversation: InboxConversationResponse
    messages: list[MessageResponse]
    lead: Optional[LeadResponse] = None


class CustomerProfileSummaryResponse(BaseModel):
    key: str
    name: str
    phone: str
    email: str
    conversation_count: int
    lead_count: int
    booked_count: int
    open_request_count: int
    last_interaction_at: Optional[datetime] = None
    latest_note: str = ""


class CustomerConversationSummaryResponse(BaseModel):
    id: str
    derived_status: str
    last_message_preview: str
    last_message_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    lead_id: Optional[str] = None


class CustomerProfileDetailResponse(CustomerProfileSummaryResponse):
    recent_conversations: list[CustomerConversationSummaryResponse]
    recent_requests: list[LeadResponse]


class OpportunityResponse(BaseModel):
    id: str
    type: str
    title: str
    detail: str
    priority: str
    customer_key: Optional[str] = None
    customer_name: str
    occurred_at: Optional[datetime] = None
    conversation_id: Optional[str] = None
    lead_id: Optional[str] = None
    derived_status: Optional[str] = None
    follow_up_task_id: Optional[str] = None
    follow_up_task_status: Optional[str] = None


class AnalyticsHourBucketResponse(BaseModel):
    hour: int
    label: str
    count: int


class FrontdeskAnalyticsResponse(BaseModel):
    conversations_total: int
    leads_created: int
    booked_requests: int
    unresolved_count: int
    follow_up_needed_count: int
    lead_capture_rate: float
    ai_resolution_estimate: float
    ai_resolution_estimate_label: str
    busiest_contact_hours: list[AnalyticsHourBucketResponse]


class FollowUpTaskResponse(BaseModel):
    id: str
    source_key: str
    task_type: str
    status: str
    priority: str
    title: str
    detail: str
    customer_key: Optional[str] = None
    customer_name: str
    lead_id: Optional[str] = None
    conversation_id: Optional[str] = None
    due_at: Optional[datetime] = None
    note: str = ""
    last_action_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class FollowUpTaskCreateRequest(BaseModel):
    source_key: str
    task_type: str
    priority: str
    title: str
    detail: str = ""
    customer_key: Optional[str] = None
    customer_name: str
    lead_id: Optional[str] = None
    conversation_id: Optional[str] = None
    due_at: Optional[datetime] = None
    note: str = ""
    status: str = "open"


class FollowUpTaskUpdateRequest(BaseModel):
    status: Optional[str] = None
    due_at: Optional[datetime] = None
    note: Optional[str] = None
    lead_status: Optional[str] = None


class OperationsLeadResponse(BaseModel):
    lead_id: str
    patient_name: str
    patient_phone: str
    patient_email: str
    reason_for_visit: str
    preferred_datetime_text: str
    lead_status: str
    appointment_status: str
    appointment_starts_at: Optional[datetime] = None
    appointment_ends_at: Optional[datetime] = None
    reminder_status: str
    reminder_scheduled_for: Optional[datetime] = None
    reminder_preview: Optional[str] = None
    reminder_ready: bool = False
    deposit_required: bool = False
    deposit_amount_cents: Optional[int] = None
    deposit_status: str
    updated_at: Optional[datetime] = None


class DepositSummaryResponse(BaseModel):
    required_count: int
    pending_count: int
    configured_count: int
    note: str


class WaitlistEntryResponse(BaseModel):
    id: str
    lead_id: Optional[str] = None
    customer_key: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: str
    service_requested: str
    preferred_times: str
    notes: str
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class OperationsOverviewResponse(BaseModel):
    reminder_enabled: bool
    reminder_lead_hours: int
    reminder_candidates: list[OperationsLeadResponse]
    action_required_requests: list[OperationsLeadResponse]
    waitlist_entries: list[WaitlistEntryResponse]
    deposit_summary: DepositSummaryResponse


class LeadOperationsUpdateRequest(BaseModel):
    appointment_status: Optional[str] = None
    appointment_starts_at: Optional[datetime] = None
    appointment_ends_at: Optional[datetime] = None
    reminder_status: Optional[str] = None
    reminder_note: Optional[str] = None
    deposit_required: Optional[bool] = None
    deposit_amount_cents: Optional[int] = None
    deposit_status: Optional[str] = None


class WaitlistCreateRequest(BaseModel):
    lead_id: Optional[str] = None
    customer_key: Optional[str] = None
    patient_name: str
    patient_phone: str = ""
    patient_email: str = ""
    service_requested: str = ""
    preferred_times: str = ""
    notes: str = ""


class WaitlistUpdateRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    service_requested: Optional[str] = None
    preferred_times: Optional[str] = None


class TrainingKnowledgeSourceResponse(BaseModel):
    id: str
    source_type: str
    title: str
    content: str
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class TrainingReadinessItemResponse(BaseModel):
    key: str
    label: str
    configured: bool
    detail: str


class TrainingOverviewResponse(BaseModel):
    clinic_name: str
    assistant_name: str
    knowledge_score: int
    knowledge_status: str
    readiness_items: list[TrainingReadinessItemResponse]
    knowledge_gaps: list[str]
    custom_sources: list[TrainingKnowledgeSourceResponse]


class KnowledgeSourceCreateRequest(BaseModel):
    title: str
    content: str


class KnowledgeSourceUpdateRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
