from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies import get_current_user
from app.schemas.frontdesk import (
    ConversationDetailResponse,
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
    TrainingKnowledgeSourceResponse,
    TrainingOverviewResponse,
    WaitlistCreateRequest,
    WaitlistEntryResponse,
    WaitlistUpdateRequest,
)
from app.services.frontdesk_service import (
    build_customer_profiles,
    build_frontdesk_analytics,
    build_follow_up_queue,
    build_inbox_items,
    build_operations_overview,
    build_opportunities,
    build_training_overview,
    create_follow_up_task,
    create_knowledge_source,
    create_waitlist_entry,
    delete_knowledge_source,
    get_conversation_detail,
    get_customer_profile,
    update_follow_up_task,
    update_knowledge_source,
    update_lead_operations,
    update_waitlist_entry,
)

router = APIRouter(prefix="/frontdesk", tags=["frontdesk"])


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


@router.get("/operations", response_model=OperationsOverviewResponse)
async def operations_overview(current_user: Annotated[dict, Depends(get_current_user)]):
    try:
        return build_operations_overview(current_user["clinic_id"])
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


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
