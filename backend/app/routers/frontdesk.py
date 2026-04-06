from typing import Annotated
from urllib.parse import parse_qsl

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from app.config import get_settings
from app.dependencies import get_current_user
from app.rate_limit import create_rate_limit_dependency
from app.schemas.frontdesk import (
    AppointmentDepositRequest,
    AppointmentDepositResponse,
    AppointmentRecordResponse,
    AppointmentUpdateRequest,
    AutoFollowUpRunResponse,
    ChannelConnectionUpdateRequest,
    ChannelReadinessResponse,
    CommunicationEventCreateRequest,
    CommunicationEventResponse,
    CommunicationSendPassResponse,
    CommunicationEventUpdateRequest,
    ConversationLeadCreateRequest,
    ConversationDetailResponse,
    ConversationThreadControlResponse,
    ConversationThreadControlUpdateRequest,
    CustomerProfileDetailResponse,
    CustomerProfileSummaryResponse,
    FollowUpTaskCreateRequest,
    FollowUpTaskResponse,
    FollowUpTaskUpdateRequest,
    FrontdeskAnalyticsResponse,
    InboxConversationResponse,
    KnowledgeSourceCreateRequest,
    KnowledgeSourceUpdateRequest,
    LeadOperationsUpdateRequest,
    OperationsOverviewResponse,
    OpportunityResponse,
    ReminderPreviewResponse,
    SuggestedReplySendRequest,
    SmsMessageCreateRequest,
    SystemReadinessResponse,
    ThreadNoteCreateRequest,
    ThreadWorkflowUpdateRequest,
    TrainingKnowledgeSourceResponse,
    TrainingOverviewResponse,
    WaitlistCreateRequest,
    WaitlistEntryResponse,
    WaitlistUpdateRequest,
)
from app.schemas.lead import LeadResponse
from app.services.frontdesk_service import (
    build_appointments,
    build_customer_profiles,
    build_frontdesk_analytics,
    build_follow_up_queue,
    build_inbox_items,
    build_channel_readiness,
    build_communication_queue,
    build_operations_overview,
    build_system_readiness,
    build_reminder_previews,
    build_opportunities,
    build_training_overview,
    convert_thread_to_lead,
    create_follow_up_task,
    create_communication_event,
    create_knowledge_source,
    create_waitlist_entry,
    delete_knowledge_source,
    get_conversation_detail,
    get_customer_profile,
    process_inbound_twilio_sms,
    request_appointment_deposit,
    run_auto_follow_up_tasks,
    send_suggested_reply,
    send_due_reminders,
    send_missed_call_text_back,
    send_outbound_sms,
    send_reminder_for_lead,
    discard_suggested_reply,
    create_thread_note,
    update_channel_connection,
    update_communication_event,
    update_appointment,
    update_follow_up_task,
    update_knowledge_source,
    update_lead_operations,
    update_thread_workflow,
    update_thread_control,
    update_waitlist_entry,
    mark_appointment_deposit_not_required,
)

router = APIRouter(prefix="/frontdesk", tags=["frontdesk"])
settings = get_settings()
sms_webhook_rate_limit = create_rate_limit_dependency(
    "frontdesk_sms_webhook",
    settings.rate_limit_sms_webhook_per_minute,
)


@router.post("/communications/twilio/inbound", dependencies=[Depends(sms_webhook_rate_limit)])
async def twilio_inbound_sms(request: Request):
    body_bytes = await request.body()
    params = dict(parse_qsl(body_bytes.decode("utf-8"), keep_blank_values=True))
    signature = request.headers.get("X-Twilio-Signature", "")
    try:
        await process_inbound_twilio_sms(str(request.url), params, signature)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return Response(content="<Response></Response>", media_type="application/xml")


@router.get("/conversations", response_model=list[InboxConversationResponse])
async def list_inbox_conversations(
    current_user: Annotated[dict, Depends(get_current_user)],
    limit: Annotated[int, Query(ge=1, le=200)] = 100,
):
    return build_inbox_items(current_user["clinic_id"], limit)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def inbox_conversation_detail(
    conversation_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    detail = get_conversation_detail(current_user["clinic_id"], conversation_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return detail


@router.post("/conversations/{thread_id}/convert-to-lead", response_model=LeadResponse)
async def convert_thread(
    thread_id: str,
    body: ConversationLeadCreateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        lead = convert_thread_to_lead(
            current_user["clinic_id"],
            thread_id,
            body.model_dump(exclude_none=True),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")
    return lead


@router.get("/customers", response_model=list[CustomerProfileSummaryResponse])
async def list_customer_profiles(current_user: Annotated[dict, Depends(get_current_user)]):
    return build_customer_profiles(current_user["clinic_id"])


@router.get("/customers/{customer_key}", response_model=CustomerProfileDetailResponse)
async def customer_profile_detail(
    customer_key: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    profile = get_customer_profile(current_user["clinic_id"], customer_key)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer profile not found.")
    return profile


@router.get("/opportunities", response_model=list[OpportunityResponse])
async def list_opportunities(current_user: Annotated[dict, Depends(get_current_user)]):
    return build_opportunities(current_user["clinic_id"])


@router.get("/follow-ups", response_model=list[FollowUpTaskResponse])
async def list_follow_ups(current_user: Annotated[dict, Depends(get_current_user)]):
    return build_follow_up_queue(current_user["clinic_id"])


@router.post("/follow-ups/auto-run", response_model=AutoFollowUpRunResponse)
async def run_auto_follow_ups(current_user: Annotated[dict, Depends(get_current_user)]):
    try:
        return run_auto_follow_up_tasks(current_user["clinic_id"])
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post("/follow-ups", response_model=FollowUpTaskResponse)
async def add_follow_up(
    body: FollowUpTaskCreateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        return create_follow_up_task(
            clinic_id=current_user["clinic_id"],
            source_key=body.source_key,
            task_type=body.task_type,
            priority=body.priority,
            title=body.title,
            detail=body.detail,
            customer_name=body.customer_name,
            customer_key=body.customer_key,
            lead_id=body.lead_id,
            conversation_id=body.conversation_id,
            auto_generated=body.auto_generated,
            due_at=body.due_at,
            note=body.note,
            status=body.status,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.patch("/follow-ups/{task_id}", response_model=FollowUpTaskResponse)
async def edit_follow_up(
    task_id: str,
    body: FollowUpTaskUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        updated = update_follow_up_task(
            current_user["clinic_id"],
            task_id,
            body.model_dump(exclude_none=True),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow-up task not found.")
    return updated


@router.get("/analytics", response_model=FrontdeskAnalyticsResponse)
async def frontdesk_analytics(current_user: Annotated[dict, Depends(get_current_user)]):
    return build_frontdesk_analytics(current_user["clinic_id"])


@router.get("/appointments", response_model=list[AppointmentRecordResponse])
async def list_appointments(
    current_user: Annotated[dict, Depends(get_current_user)],
    view: Annotated[str, Query()] = "all",
):
    return build_appointments(current_user["clinic_id"], view)


@router.patch("/appointments/{lead_id}", response_model=LeadResponse)
async def edit_appointment(
    lead_id: str,
    body: AppointmentUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        updated = update_appointment(
            current_user["clinic_id"],
            lead_id,
            body.model_dump(exclude_unset=True),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    return updated


@router.post("/appointments/{lead_id}/deposit-request", response_model=AppointmentDepositResponse)
async def create_appointment_deposit_request(
    lead_id: str,
    body: AppointmentDepositRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        result = request_appointment_deposit(
            current_user["clinic_id"],
            lead_id,
            amount_cents=body.amount_cents,
            send_sms=body.send_sms,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    return result


@router.post("/appointments/{lead_id}/deposit-not-required", response_model=LeadResponse)
async def clear_appointment_deposit_requirement(
    lead_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        updated = mark_appointment_deposit_not_required(current_user["clinic_id"], lead_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    return updated


@router.get("/reminders/preview", response_model=list[ReminderPreviewResponse])
async def reminders_preview(current_user: Annotated[dict, Depends(get_current_user)]):
    return build_reminder_previews(current_user["clinic_id"])


@router.post("/reminders/send-due", response_model=CommunicationSendPassResponse)
async def reminders_send_due(current_user: Annotated[dict, Depends(get_current_user)]):
    try:
        return send_due_reminders(current_user["clinic_id"])
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post("/reminders/{lead_id}/send", response_model=CommunicationEventResponse)
async def reminders_send_one(
    lead_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        event = send_reminder_for_lead(current_user["clinic_id"], lead_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder target not found.")
    return event


@router.get("/channels", response_model=list[ChannelReadinessResponse])
async def list_channel_readiness(current_user: Annotated[dict, Depends(get_current_user)]):
    return build_channel_readiness(current_user["clinic_id"])


@router.get("/system-readiness", response_model=SystemReadinessResponse)
async def system_readiness(current_user: Annotated[dict, Depends(get_current_user)]):
    return build_system_readiness(current_user["clinic_id"])


@router.patch("/channels/{channel}", response_model=ChannelReadinessResponse)
async def edit_channel_readiness(
    channel: str,
    body: ChannelConnectionUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        updated = update_channel_connection(
            current_user["clinic_id"],
            channel,
            body.model_dump(exclude_none=True),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Channel not found.")
    return updated


@router.get("/operations", response_model=OperationsOverviewResponse)
async def operations_overview(current_user: Annotated[dict, Depends(get_current_user)]):
    try:
        return build_operations_overview(current_user["clinic_id"])
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/communications", response_model=list[CommunicationEventResponse])
async def list_communication_queue(current_user: Annotated[dict, Depends(get_current_user)]):
    return build_communication_queue(current_user["clinic_id"])


@router.post("/communications", response_model=CommunicationEventResponse)
async def add_communication_event(
    body: CommunicationEventCreateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        return create_communication_event(current_user["clinic_id"], body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.patch("/communications/{event_id}", response_model=CommunicationEventResponse)
async def edit_communication_event(
    event_id: str,
    body: CommunicationEventUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        updated = update_communication_event(
            current_user["clinic_id"],
            event_id,
            body.model_dump(exclude_none=True),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Communication event not found.")
    return updated


@router.post("/communications/{event_id}/send-text-back", response_model=CommunicationEventResponse)
async def send_text_back(
    event_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        event = send_missed_call_text_back(current_user["clinic_id"], event_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Communication event not found.")
    return event


@router.post("/communications/send-sms", response_model=CommunicationEventResponse)
async def send_sms(
    body: SmsMessageCreateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        return send_outbound_sms(
            current_user["clinic_id"],
            customer_name=body.customer_name,
            customer_phone=body.customer_phone,
            customer_email=body.customer_email,
            body=body.body,
            summary="Manual outbound SMS",
            lead_id=body.lead_id,
            conversation_id=body.conversation_id,
            follow_up_task_id=body.follow_up_task_id,
            source_event_id=body.source_event_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post("/communications/{event_id}/suggested-reply/send", response_model=CommunicationEventResponse)
async def send_thread_suggested_reply(
    event_id: str,
    body: SuggestedReplySendRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        event = send_suggested_reply(
            current_user["clinic_id"],
            event_id,
            body=body.body,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Communication event not found.")
    return event


@router.post("/communications/{event_id}/suggested-reply/discard", response_model=CommunicationEventResponse)
async def discard_thread_suggested_reply(
    event_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        event = discard_suggested_reply(current_user["clinic_id"], event_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Communication event not found.")
    return event


@router.patch("/conversations/{thread_id}/thread-control", response_model=ConversationThreadControlResponse)
async def edit_thread_control(
    thread_id: str,
    body: ConversationThreadControlUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        updated = update_thread_control(
            current_user["clinic_id"],
            thread_id,
            manual_takeover=body.manual_takeover,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation thread not found.")
    return updated


@router.patch("/conversations/{thread_id}/workflow", response_model=LeadResponse)
async def edit_thread_workflow(
    thread_id: str,
    body: ThreadWorkflowUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        updated = update_thread_workflow(
            current_user["clinic_id"],
            thread_id,
            body.model_dump(exclude_none=True),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation thread not found.")
    return updated


@router.post("/conversations/{thread_id}/notes", response_model=CommunicationEventResponse)
async def add_thread_note(
    thread_id: str,
    body: ThreadNoteCreateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        note = create_thread_note(
            current_user["clinic_id"],
            thread_id,
            body.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation thread not found.")
    return note


@router.patch("/leads/{lead_id}/operations")
async def edit_lead_operations(
    lead_id: str,
    body: LeadOperationsUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        updated = update_lead_operations(
            current_user["clinic_id"],
            lead_id,
            body.model_dump(exclude_none=True),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found.")
    return updated


@router.post("/waitlist", response_model=WaitlistEntryResponse)
async def add_waitlist_entry(
    body: WaitlistCreateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        return create_waitlist_entry(current_user["clinic_id"], body.model_dump())
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.patch("/waitlist/{entry_id}", response_model=WaitlistEntryResponse)
async def edit_waitlist_entry(
    entry_id: str,
    body: WaitlistUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        updated = update_waitlist_entry(
            current_user["clinic_id"],
            entry_id,
            body.model_dump(exclude_none=True),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist entry not found.")
    return updated


@router.get("/training", response_model=TrainingOverviewResponse)
async def training_overview(current_user: Annotated[dict, Depends(get_current_user)]):
    return build_training_overview(current_user["clinic_id"])


@router.post("/training/sources", response_model=TrainingKnowledgeSourceResponse)
async def add_training_source(
    body: KnowledgeSourceCreateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        return create_knowledge_source(current_user["clinic_id"], body.title, body.content)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.patch("/training/sources/{source_id}", response_model=TrainingKnowledgeSourceResponse)
async def edit_training_source(
    source_id: str,
    body: KnowledgeSourceUpdateRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        updated = update_knowledge_source(
            current_user["clinic_id"],
            source_id,
            body.model_dump(exclude_none=True),
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge source not found.")
    return updated


@router.delete("/training/sources/{source_id}")
async def remove_training_source(
    source_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    try:
        deleted = delete_knowledge_source(current_user["clinic_id"], source_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge source not found.")
    return {"success": True}
