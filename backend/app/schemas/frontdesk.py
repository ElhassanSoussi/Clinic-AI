from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.conversation import MessageResponse
from app.schemas.lead import LeadResponse


class InboxConversationResponse(BaseModel):
    id: str
    thread_type: str = "conversation"
    session_id: str
    thread_conversation_id: Optional[str] = None
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
    manual_takeover: bool = False
    ai_auto_reply_enabled: bool = False
    ai_auto_reply_ready: bool = False


class CommunicationEventResponse(BaseModel):
    id: str
    thread_key: str = ""
    channel: str
    direction: str
    event_type: str
    status: str
    customer_key: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: str
    summary: str = ""
    content: str = ""
    lead_id: Optional[str] = None
    conversation_id: Optional[str] = None
    waitlist_entry_id: Optional[str] = None
    follow_up_task_id: Optional[str] = None
    provider: str = ""
    external_id: str = ""
    provider_message_id: str = ""
    sender_kind: str = "patient"
    ai_generated: bool = False
    ai_confidence: str = ""
    ai_decision_reason: str = ""
    auto_reply_status: str = ""
    auto_reply_reason: str = ""
    suggested_reply_text: str = ""
    suggested_reply_status: str = ""
    suggested_reply_sent_event_id: str = ""
    failure_reason: str = ""
    skipped_reason: str = ""
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    latest_outbound_status: Optional[str] = None
    latest_outbound_summary: str = ""
    latest_outbound_reason: str = ""
    latest_outbound_at: Optional[datetime] = None
    latest_inbound_status: Optional[str] = None
    latest_inbound_summary: str = ""
    latest_inbound_at: Optional[datetime] = None
    manual_takeover: bool = False
    ai_auto_reply_enabled: bool = False
    ai_auto_reply_ready: bool = False
    operator_review_required: bool = False
    occurred_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ConversationDetailResponse(BaseModel):
    thread_type: str = "conversation"
    conversation: InboxConversationResponse
    messages: list[MessageResponse]
    lead: Optional[LeadResponse] = None
    communication_event: Optional[CommunicationEventResponse] = None
    related_events: list[CommunicationEventResponse] = []


class CustomerProfileSummaryResponse(BaseModel):
    key: str
    name: str
    phone: str
    email: str
    conversation_count: int
    lead_count: int
    booked_count: int
    open_request_count: int
    total_interactions: int
    last_outcome: str
    follow_up_needed: bool = False
    last_interaction_at: Optional[datetime] = None
    latest_note: str = ""
    latest_sms_thread_id: Optional[str] = None
    latest_sms_manual_takeover: bool = False
    latest_sms_ai_auto_reply_enabled: bool = False
    latest_sms_ai_auto_reply_ready: bool = False
    latest_sms_pending_review: bool = False
    latest_sms_confidence: str = ""


class CustomerConversationSummaryResponse(BaseModel):
    id: str
    thread_type: str = "conversation"
    channel: str = "web_chat"
    derived_status: str
    last_message_preview: str
    last_message_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    lead_id: Optional[str] = None
    manual_takeover: bool = False
    ai_auto_reply_enabled: bool = False


class CustomerTimelineItemResponse(BaseModel):
    id: str
    item_type: str
    title: str
    detail: str
    channel: Optional[str] = None
    status: Optional[str] = None
    occurred_at: Optional[datetime] = None
    lead_id: Optional[str] = None
    conversation_id: Optional[str] = None
    thread_id: Optional[str] = None
    waitlist_entry_id: Optional[str] = None
    follow_up_task_id: Optional[str] = None
    communication_event_id: Optional[str] = None


class CustomerProfileDetailResponse(CustomerProfileSummaryResponse):
    recent_conversations: list[CustomerConversationSummaryResponse]
    recent_requests: list[LeadResponse]
    timeline: list[CustomerTimelineItemResponse]


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
    potential_lost_patients: int
    recovered_opportunities: int
    estimated_value_recovered_cents: int
    estimated_value_recovered_label: str
    lead_capture_rate: float
    ai_resolution_estimate: float
    ai_resolution_estimate_label: str
    ai_auto_handled_count: int
    human_review_required_count: int
    manual_takeover_threads: int
    suggested_replies_sent_count: int
    blocked_for_review_count: int
    deposits_requested_count: int
    deposits_paid_count: int
    appointments_waiting_on_deposit_count: int
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
    auto_generated: bool = False
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
    auto_generated: bool = False
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
    deposit_requested_at: Optional[datetime] = None
    deposit_paid_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DepositSummaryResponse(BaseModel):
    required_count: int
    requested_count: int
    paid_count: int
    waiting_count: int
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


class ChannelReadinessResponse(BaseModel):
    id: str
    channel: str
    provider: str
    connection_status: str
    display_name: str
    contact_value: str
    automation_enabled: bool = False
    notes: str = ""
    live: bool = False
    summary: str
    detail: str


class SystemReadinessItemResponse(BaseModel):
    key: str
    label: str
    status: str
    scope: str
    summary: str
    detail: str
    action: str = ""


class SystemReadinessResponse(BaseModel):
    overall_status: str
    configured_count: int
    partial_count: int
    missing_count: int
    blocked_count: int
    items: list[SystemReadinessItemResponse]


class OperationsOverviewResponse(BaseModel):
    reminder_enabled: bool
    reminder_lead_hours: int
    follow_up_automation_enabled: bool = False
    follow_up_delay_minutes: int = 45
    reminder_candidates: list[OperationsLeadResponse]
    action_required_requests: list[OperationsLeadResponse]
    waitlist_entries: list[WaitlistEntryResponse]
    deposit_summary: DepositSummaryResponse
    channel_readiness: list[ChannelReadinessResponse]
    system_readiness: SystemReadinessResponse
    communication_queue: list[CommunicationEventResponse]
    review_queue: list[CommunicationEventResponse]
    due_reminders: list["ReminderPreviewResponse"]
    recent_outbound_messages: list[CommunicationEventResponse]
    outbound_activity: "OutboundActivitySummaryResponse"


class AppointmentRecordResponse(BaseModel):
    lead_id: str
    customer_key: str
    thread_id: Optional[str] = None
    patient_name: str
    patient_phone: str
    patient_email: str
    reason_for_visit: str
    preferred_datetime_text: str
    source: str
    lead_status: str
    appointment_status: str
    appointment_starts_at: Optional[datetime] = None
    appointment_ends_at: Optional[datetime] = None
    reminder_status: str
    reminder_scheduled_for: Optional[datetime] = None
    reminder_ready: bool = False
    reminder_blocked_reason: str = ""
    deposit_required: bool = False
    deposit_amount_cents: Optional[int] = None
    deposit_status: str
    deposit_requested_at: Optional[datetime] = None
    deposit_paid_at: Optional[datetime] = None
    deposit_request_delivery_status: str = ""
    deposit_request_delivery_reason: str = ""
    follow_up_open: bool = False
    follow_up_task_id: Optional[str] = None
    notes: str = ""
    updated_at: Optional[datetime] = None


class ReminderPreviewResponse(BaseModel):
    lead_id: str
    patient_name: str
    patient_phone: str = ""
    appointment_starts_at: datetime
    reminder_scheduled_for: datetime
    channel: str
    preview: str
    is_due: bool = False
    can_send: bool = False
    blocked_reason: str = ""


class OutboundActivitySummaryResponse(BaseModel):
    outbound_sms_total: int
    reminders_sent: int
    missed_call_texts_sent: int
    ai_replies_sent: int
    ai_reply_failures: int
    failed_sends: int
    skipped_sends: int
    human_review_required: int
    suggested_replies_sent: int
    blocked_for_review: int
    manual_takeover_threads: int


class AutoFollowUpRunResponse(BaseModel):
    created_count: int
    tasks: list[FollowUpTaskResponse]


class LeadOperationsUpdateRequest(BaseModel):
    appointment_status: Optional[str] = None
    appointment_starts_at: Optional[datetime] = None
    appointment_ends_at: Optional[datetime] = None
    reminder_status: Optional[str] = None
    reminder_note: Optional[str] = None
    deposit_required: Optional[bool] = None
    deposit_amount_cents: Optional[int] = None
    deposit_status: Optional[str] = None


class AppointmentUpdateRequest(BaseModel):
    status: Optional[str] = None
    appointment_status: Optional[str] = None
    appointment_starts_at: Optional[datetime] = None
    appointment_ends_at: Optional[datetime] = None
    reason_for_visit: Optional[str] = None
    preferred_datetime_text: Optional[str] = None
    note: Optional[str] = None


class AppointmentDepositRequest(BaseModel):
    amount_cents: int
    send_sms: bool = True


class AppointmentDepositResponse(BaseModel):
    lead: LeadResponse
    checkout_url: str
    communication_event: Optional[CommunicationEventResponse] = None
    sms_delivery_status: str = ""
    blocked_reason: str = ""


class ConversationLeadCreateRequest(BaseModel):
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    reason_for_visit: Optional[str] = None
    preferred_datetime_text: Optional[str] = None
    notes: Optional[str] = None


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


class ChannelConnectionUpdateRequest(BaseModel):
    provider: Optional[str] = None
    display_name: Optional[str] = None
    contact_value: Optional[str] = None
    automation_enabled: Optional[bool] = None
    notes: Optional[str] = None


class CommunicationEventCreateRequest(BaseModel):
    channel: str
    customer_name: str = ""
    customer_phone: str = ""
    customer_email: str = ""
    summary: str = ""
    content: str = ""
    lead_id: Optional[str] = None
    conversation_id: Optional[str] = None


class CommunicationEventUpdateRequest(BaseModel):
    status: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None


class SmsMessageCreateRequest(BaseModel):
    customer_name: str = ""
    customer_phone: str
    customer_email: str = ""
    body: str
    lead_id: Optional[str] = None
    conversation_id: Optional[str] = None
    follow_up_task_id: Optional[str] = None
    source_event_id: Optional[str] = None


class CommunicationSendPassResponse(BaseModel):
    processed_count: int
    sent_count: int
    failed_count: int
    skipped_count: int
    events: list[CommunicationEventResponse]


class SuggestedReplySendRequest(BaseModel):
    body: Optional[str] = None


class ConversationThreadControlUpdateRequest(BaseModel):
    manual_takeover: bool


class ConversationThreadControlResponse(BaseModel):
    conversation_id: str
    manual_takeover: bool = False
    ai_auto_reply_enabled: bool = False
    ai_auto_reply_ready: bool = False


class ThreadWorkflowUpdateRequest(BaseModel):
    status: str
    appointment_starts_at: Optional[datetime] = None
    appointment_ends_at: Optional[datetime] = None
    reason_for_visit: Optional[str] = None
    preferred_datetime_text: Optional[str] = None
    note: Optional[str] = None


class ThreadNoteCreateRequest(BaseModel):
    note: str


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
