from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from app.dependencies import get_supabase

FOLLOW_UP_TASK_STATUSES = {"open", "snoozed", "completed"}
FOLLOW_UP_TASK_TYPES = {
    "abandoned_conversation",
    "new_lead_stale",
    "follow_up_needed",
    "cancel_request",
    "reschedule_request",
    "no_show_risk",
}
FOLLOW_UP_PRIORITIES = {"high", "medium", "low"}
APPOINTMENT_STATUSES = {
    "request_open",
    "confirmed",
    "cancel_requested",
    "reschedule_requested",
    "cancelled",
    "completed",
    "no_show",
}
REMINDER_STATUSES = {"not_ready", "ready", "scheduled", "sent"}
DEPOSIT_STATUSES = {"not_required", "pending", "paid", "waived"}
WAITLIST_STATUSES = {"waiting", "contacted", "booked", "closed"}


def _parse_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _to_json_list(value: Any) -> list[Any]:
    if isinstance(value, list):
        return value
    if isinstance(value, str) and value:
        try:
            parsed = json.loads(value)
        except ValueError:
            return []
        return parsed if isinstance(parsed, list) else []
    return []


def _to_json_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value:
        try:
            parsed = json.loads(value)
        except ValueError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D+", "", phone or "")
    return digits[-10:] if digits else ""


def _normalize_identity(lead: dict[str, Any]) -> str:
    email = (lead.get("patient_email") or "").strip().lower()
    phone = _normalize_phone(lead.get("patient_phone") or "")
    name = re.sub(r"\s+", " ", (lead.get("patient_name") or "").strip().lower())
    if email:
        return f"email:{email}"
    if phone:
        return f"phone:{phone}"
    if name:
        return f"name:{name}"
    return f"lead:{lead['id']}"


def _customer_key(identity: str) -> str:
    digest = hashlib.sha1(identity.encode("utf-8")).hexdigest()
    return digest[:16]


def _truncate(text: str, limit: int = 120) -> str:
    value = (text or "").strip()
    if len(value) <= limit:
        return value
    return f"{value[: limit - 1].rstrip()}…"


def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _serialize_datetime(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _maybe_single_data(query: Any) -> Optional[dict[str, Any]]:
    result = query.maybe_single().execute()
    if result is None:
        return None
    return getattr(result, "data", None)


def _reminder_preview(
    clinic_name: str,
    patient_name: str,
    appointment_starts_at: Optional[datetime],
) -> Optional[str]:
    if appointment_starts_at is None:
        return None
    return (
        f"Hi {patient_name or 'there'}, this is a reminder from {clinic_name} "
        f"about your appointment on {appointment_starts_at.strftime('%A, %b %-d at %-I:%M %p')}."
    )


def _is_follow_up_needed(lead: Optional[dict[str, Any]], updated_at: Optional[datetime]) -> bool:
    if updated_at is None:
        return False
    now = datetime.now(timezone.utc)
    age = now - updated_at
    if lead is None:
        return age >= timedelta(minutes=45)
    status = lead.get("status")
    if status == "new":
        return age >= timedelta(hours=8)
    if status == "contacted":
        return age >= timedelta(hours=24)
    return False


def _derive_conversation_status(lead: Optional[dict[str, Any]], updated_at: Optional[datetime]) -> str:
    if lead:
        status = lead.get("status")
        if status == "booked":
            return "booked"
        if status == "closed":
            return "handled"
        if _is_follow_up_needed(lead, updated_at):
            return "needs_follow_up"
        if status == "contacted":
            return "handled"
        return "open"

    if _is_follow_up_needed(None, updated_at):
        return "needs_follow_up"
    return "open"


def _channel_for_conversation(lead: Optional[dict[str, Any]]) -> str:
    source = (lead or {}).get("source") or "web_chat"
    if source == "manual":
        return "manual"
    if source == "web_chat":
        return "web_chat"
    return source


def _load_conversations_for_clinic(clinic_id: str, limit: int = 100) -> tuple[list[dict[str, Any]], dict[str, list[dict[str, Any]]], dict[str, dict[str, Any]]]:
    db = get_supabase()
    conversations = (
        db.table("conversations")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("updated_at", desc=True)
        .limit(limit)
        .execute()
        .data
        or []
    )
    lead_ids = [row["lead_id"] for row in conversations if row.get("lead_id")]
    leads_by_id: dict[str, dict[str, Any]] = {}
    if lead_ids:
        lead_rows = (
            db.table("leads")
            .select("*")
            .in_("id", lead_ids)
            .execute()
            .data
            or []
        )
        leads_by_id = {lead["id"]: lead for lead in lead_rows}

    messages_by_conversation: dict[str, list[dict[str, Any]]] = {}
    conversation_ids = [row["id"] for row in conversations]
    if conversation_ids:
        message_rows = (
            db.table("conversation_messages")
            .select("*")
            .in_("conversation_id", conversation_ids)
            .order("created_at")
            .execute()
            .data
            or []
        )
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in message_rows:
            grouped[row["conversation_id"]].append(row)
        messages_by_conversation = dict(grouped)

    return conversations, messages_by_conversation, leads_by_id


def _load_follow_up_tasks(clinic_id: str, include_completed: bool = False) -> list[dict[str, Any]]:
    db = get_supabase()
    query = (
        db.table("follow_up_tasks")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("due_at")
    )
    if not include_completed:
        query = query.in_("status", ["open", "snoozed"])
    return query.execute().data or []


def build_inbox_items(clinic_id: str, limit: int = 100) -> list[dict[str, Any]]:
    conversations, messages_by_conversation, leads_by_id = _load_conversations_for_clinic(clinic_id, limit)
    items: list[dict[str, Any]] = []

    for conversation in conversations:
        messages = messages_by_conversation.get(conversation["id"], [])
        lead = leads_by_id.get(conversation.get("lead_id") or "")
        last_message = messages[-1] if messages else None
        updated_at = _parse_datetime((last_message or {}).get("created_at")) or _parse_datetime(conversation.get("updated_at")) or _parse_datetime(conversation.get("created_at"))
        derived_status = _derive_conversation_status(lead, updated_at)
        customer_name = (lead or {}).get("patient_name") or "Visitor"
        customer_key = _customer_key(_normalize_identity(lead)) if lead else None
        preview = (
            (last_message or {}).get("content")
            or (conversation.get("summary") or "").strip()
            or "Conversation started"
        )
        items.append(
            {
                "id": conversation["id"],
                "session_id": conversation["session_id"],
                "customer_key": customer_key,
                "customer_name": customer_name,
                "customer_phone": (lead or {}).get("patient_phone", ""),
                "customer_email": (lead or {}).get("patient_email", ""),
                "channel": _channel_for_conversation(lead),
                "lead_id": conversation.get("lead_id"),
                "lead_status": (lead or {}).get("status"),
                "derived_status": derived_status,
                "last_intent": conversation.get("last_intent"),
                "summary": (conversation.get("summary") or "").strip() or None,
                "last_message_preview": _truncate(preview),
                "last_message_role": (last_message or {}).get("role"),
                "last_message_at": updated_at,
                "conversation_started_at": _parse_datetime(conversation.get("created_at")),
                "updated_at": _parse_datetime(conversation.get("updated_at")),
                "requires_attention": derived_status == "needs_follow_up",
                "unlinked": not bool(conversation.get("lead_id")),
            }
        )

    return items


def get_conversation_detail(clinic_id: str, conversation_id: str) -> Optional[dict[str, Any]]:
    items = build_inbox_items(clinic_id, limit=200)
    conversation = next((item for item in items if item["id"] == conversation_id), None)
    if conversation is None:
        return None

    db = get_supabase()
    messages = (
        db.table("conversation_messages")
        .select("*")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
        .data
        or []
    )
    lead = None
    if conversation.get("lead_id"):
        lead = _maybe_single_data(
            db.table("leads")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("id", conversation["lead_id"])
        )

    return {
        "conversation": conversation,
        "messages": messages,
        "lead": lead,
    }


def build_customer_profiles(clinic_id: str) -> list[dict[str, Any]]:
    db = get_supabase()
    leads = (
        db.table("leads")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("updated_at", desc=True)
        .execute()
        .data
        or []
    )
    if not leads:
        return []

    conversations, messages_by_conversation, _ = _load_conversations_for_clinic(clinic_id, limit=200)
    conversations_by_lead: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for conversation in conversations:
        if conversation.get("lead_id"):
            conversations_by_lead[conversation["lead_id"]].append(conversation)

    grouped: dict[str, dict[str, Any]] = {}
    for lead in leads:
        identity = _normalize_identity(lead)
        key = _customer_key(identity)
        group = grouped.setdefault(
            key,
            {
                "key": key,
                "name": lead.get("patient_name") or "Unknown patient",
                "phone": lead.get("patient_phone") or "",
                "email": lead.get("patient_email") or "",
                "lead_count": 0,
                "booked_count": 0,
                "open_request_count": 0,
                "last_interaction_at": _parse_datetime(lead.get("updated_at")),
                "latest_note": "",
                "lead_ids": [],
                "recent_requests": [],
                "recent_conversations": [],
                "conversation_ids": set(),
            },
        )
        group["lead_count"] += 1
        if lead.get("status") == "booked":
            group["booked_count"] += 1
        if lead.get("status") in {"new", "contacted"}:
            group["open_request_count"] += 1
        if not group["phone"] and lead.get("patient_phone"):
            group["phone"] = lead["patient_phone"]
        if not group["email"] and lead.get("patient_email"):
            group["email"] = lead["patient_email"]
        note = (lead.get("notes") or "").strip()
        if note and not group["latest_note"]:
            group["latest_note"] = note
        lead_updated = _parse_datetime(lead.get("updated_at"))
        if lead_updated and (group["last_interaction_at"] is None or lead_updated > group["last_interaction_at"]):
            group["last_interaction_at"] = lead_updated
        group["lead_ids"].append(lead["id"])
        group["recent_requests"].append(lead)

        for conversation in conversations_by_lead.get(lead["id"], []):
            if conversation["id"] in group["conversation_ids"]:
                continue
            group["conversation_ids"].add(conversation["id"])
            messages = messages_by_conversation.get(conversation["id"], [])
            last_message = messages[-1] if messages else None
            updated_at = _parse_datetime((last_message or {}).get("created_at")) or _parse_datetime(conversation.get("updated_at"))
            if updated_at and (group["last_interaction_at"] is None or updated_at > group["last_interaction_at"]):
                group["last_interaction_at"] = updated_at
            group["recent_conversations"].append(
                {
                    "id": conversation["id"],
                    "derived_status": _derive_conversation_status(lead, updated_at),
                    "last_message_preview": _truncate(
                        (last_message or {}).get("content")
                        or (conversation.get("summary") or "").strip()
                        or "Conversation started"
                    ),
                    "last_message_at": updated_at,
                    "updated_at": _parse_datetime(conversation.get("updated_at")),
                    "lead_id": lead["id"],
                }
            )

    profiles: list[dict[str, Any]] = []
    for profile in grouped.values():
        profile["recent_requests"] = sorted(
            profile["recent_requests"],
            key=lambda row: _parse_datetime(row.get("updated_at")) or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )[:5]
        profile["recent_conversations"] = sorted(
            profile["recent_conversations"],
            key=lambda row: row.get("last_message_at") or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )[:5]
        profile["conversation_count"] = len(profile.pop("conversation_ids"))
        profile.pop("lead_ids", None)
        profiles.append(profile)

    profiles.sort(
        key=lambda row: row.get("last_interaction_at") or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return profiles


def get_customer_profile(clinic_id: str, customer_key: str) -> Optional[dict[str, Any]]:
    profiles = build_customer_profiles(clinic_id)
    return next((profile for profile in profiles if profile["key"] == customer_key), None)


def build_opportunities(clinic_id: str) -> list[dict[str, Any]]:
    db = get_supabase()
    opportunities: list[dict[str, Any]] = []
    inbox_items = build_inbox_items(clinic_id, limit=200)
    now = datetime.now(timezone.utc)
    existing_tasks = {
        task["source_key"]: task
        for task in _load_follow_up_tasks(clinic_id, include_completed=True)
    }

    def append_opportunity(item: dict[str, Any]) -> None:
        task = existing_tasks.get(item["id"])
        if task and task.get("status") == "completed":
            return
        if task:
            item["follow_up_task_id"] = task["id"]
            item["follow_up_task_status"] = task["status"]
        opportunities.append(item)

    for item in inbox_items:
        occurred_at = item.get("last_message_at") or item.get("updated_at")
        if item["unlinked"] and item["derived_status"] == "needs_follow_up":
            append_opportunity(
                {
                    "id": f"conversation:{item['id']}",
                    "type": "abandoned_conversation",
                    "title": "Conversation ended before contact details were captured",
                    "detail": item["last_message_preview"] or "Patient stopped responding before completing the intake.",
                    "priority": "high",
                    "customer_key": item.get("customer_key"),
                    "customer_name": item["customer_name"],
                    "occurred_at": occurred_at,
                    "conversation_id": item["id"],
                    "lead_id": None,
                    "derived_status": item["derived_status"],
                }
            )

    leads = (
        db.table("leads")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("updated_at", desc=True)
        .execute()
        .data
        or []
    )
    for lead in leads:
        updated_at = _parse_datetime(lead.get("updated_at")) or _parse_datetime(lead.get("created_at"))
        if not updated_at:
            continue
        age = now - updated_at
        if lead.get("status") == "new" and age >= timedelta(hours=8):
            append_opportunity(
                {
                    "id": f"lead:new:{lead['id']}",
                    "type": "new_lead_stale",
                    "title": "New request still waiting for outreach",
                    "detail": lead.get("reason_for_visit") or "Patient requested an appointment but has not been worked yet.",
                    "priority": "high",
                    "customer_key": _customer_key(_normalize_identity(lead)),
                    "customer_name": lead.get("patient_name") or "Unknown patient",
                    "occurred_at": updated_at,
                    "conversation_id": None,
                    "lead_id": lead["id"],
                    "derived_status": "needs_follow_up",
                }
            )
        elif lead.get("status") == "contacted" and age >= timedelta(hours=24):
            append_opportunity(
                {
                    "id": f"lead:contacted:{lead['id']}",
                    "type": "follow_up_needed",
                    "title": "Patient may need a follow-up nudge",
                    "detail": lead.get("preferred_datetime_text") or "A contacted request has not reached a booked outcome yet.",
                    "priority": "medium",
                    "customer_key": _customer_key(_normalize_identity(lead)),
                    "customer_name": lead.get("patient_name") or "Unknown patient",
                    "occurred_at": updated_at,
                    "conversation_id": None,
                    "lead_id": lead["id"],
                    "derived_status": "needs_follow_up",
                }
            )

    opportunities.sort(
        key=lambda item: item.get("occurred_at") or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return opportunities


def build_frontdesk_analytics(clinic_id: str) -> dict[str, Any]:
    db = get_supabase()
    conversations = (
        db.table("conversations")
        .select("id, lead_id, last_intent, created_at, updated_at")
        .eq("clinic_id", clinic_id)
        .execute()
        .data
        or []
    )
    leads = (
        db.table("leads")
        .select("id, clinic_id, status, source, created_at, updated_at")
        .eq("clinic_id", clinic_id)
        .execute()
        .data
        or []
    )
    opportunities = build_opportunities(clinic_id)

    user_hours = Counter()
    conversation_ids = [conversation["id"] for conversation in conversations]
    if conversation_ids:
        messages = (
            db.table("conversation_messages")
            .select("conversation_id, role, created_at")
            .in_("conversation_id", conversation_ids)
            .eq("role", "user")
            .execute()
            .data
            or []
        )
        for message in messages:
            created_at = _parse_datetime(message.get("created_at"))
            if created_at is None:
                continue
            user_hours[created_at.hour] += 1

    busiest_contact_hours = [
        {
            "hour": hour,
            "label": datetime(2024, 1, 1, hour, 0).strftime("%-I %p"),
            "count": count,
        }
        for hour, count in user_hours.most_common(4)
    ]

    conversations_total = len(conversations)
    leads_created = len(leads)
    booked_requests = sum(1 for lead in leads if lead.get("status") == "booked")
    resolved_conversations = 0
    for conversation in conversations:
        lead = next((lead for lead in leads if lead["id"] == conversation.get("lead_id")), None)
        if lead and lead.get("status") in {"booked", "closed"}:
            resolved_conversations += 1
        elif conversation.get("last_intent") == "booking_complete":
            resolved_conversations += 1

    captured_conversations = sum(1 for conversation in conversations if conversation.get("lead_id"))
    lead_capture_rate = round((captured_conversations / conversations_total) * 100, 1) if conversations_total else 0.0
    ai_resolution_estimate = round((resolved_conversations / conversations_total) * 100, 1) if conversations_total else 0.0

    return {
        "conversations_total": conversations_total,
        "leads_created": leads_created,
        "booked_requests": booked_requests,
        "unresolved_count": sum(1 for lead in leads if lead.get("status") in {"new", "contacted"}),
        "follow_up_needed_count": len(opportunities),
        "lead_capture_rate": lead_capture_rate,
        "ai_resolution_estimate": ai_resolution_estimate,
        "ai_resolution_estimate_label": "Estimate based on conversations that reached booking completion or ended in a booked/closed request.",
        "busiest_contact_hours": busiest_contact_hours,
    }


def build_training_overview(clinic_id: str) -> dict[str, Any]:
    db = get_supabase()
    clinic = _maybe_single_data(
        db.table("clinics")
        .select("*")
        .eq("id", clinic_id)
    )
    if not clinic:
        return {
            "clinic_name": "",
            "assistant_name": "",
            "knowledge_score": 0,
            "knowledge_status": "not_configured",
            "readiness_items": [],
            "knowledge_gaps": [],
            "custom_sources": [],
        }

    services = _to_json_list(clinic.get("services"))
    faq = _to_json_list(clinic.get("faq"))
    hours = _to_json_dict(clinic.get("business_hours"))
    try:
        custom_sources = (
            db.table("knowledge_sources")
            .select("*")
            .eq("clinic_id", clinic_id)
            .order("updated_at", desc=True)
            .execute()
            .data
            or []
        )
    except Exception:
        custom_sources = []

    readiness_items = [
        {
            "key": "services",
            "label": "Services and pricing",
            "configured": len(services) > 0,
            "detail": f"{len(services)} service entries configured" if services else "No services added yet",
        },
        {
            "key": "faq",
            "label": "Frequently asked questions",
            "configured": len(faq) > 0,
            "detail": f"{len(faq)} FAQ entries configured" if faq else "No FAQ entries added yet",
        },
        {
            "key": "hours",
            "label": "Business hours",
            "configured": len(hours) > 0,
            "detail": "Weekly hours configured" if hours else "Hours not configured yet",
        },
        {
            "key": "assistant_messages",
            "label": "Assistant tone and fallback",
            "configured": bool((clinic.get("greeting_message") or "").strip()) and bool((clinic.get("fallback_message") or "").strip()),
            "detail": "Greeting and fallback messages set" if (clinic.get("greeting_message") or "").strip() and (clinic.get("fallback_message") or "").strip() else "Greeting or fallback message still missing",
        },
        {
            "key": "manual_sources",
            "label": "Custom knowledge notes",
            "configured": len(custom_sources) > 0,
            "detail": f"{len(custom_sources)} custom notes added" if custom_sources else "No custom notes added yet",
        },
    ]

    configured_count = sum(1 for item in readiness_items if item["configured"])
    knowledge_score = round((configured_count / len(readiness_items)) * 100) if readiness_items else 0
    knowledge_gaps = [item["label"] for item in readiness_items if not item["configured"]]

    if knowledge_score >= 80:
        knowledge_status = "strong"
    elif knowledge_score >= 50:
        knowledge_status = "partial"
    else:
        knowledge_status = "needs_setup"

    return {
        "clinic_name": clinic.get("name", ""),
        "assistant_name": clinic.get("assistant_name") or clinic.get("name") or "Clinic Assistant",
        "knowledge_score": knowledge_score,
        "knowledge_status": knowledge_status,
        "readiness_items": readiness_items,
        "knowledge_gaps": knowledge_gaps,
        "custom_sources": custom_sources,
    }


def create_knowledge_source(clinic_id: str, title: str, content: str) -> dict[str, Any]:
    db = get_supabase()
    try:
        result = (
            db.table("knowledge_sources")
            .insert(
                {
                    "clinic_id": clinic_id,
                    "source_type": "manual_note",
                    "title": title.strip(),
                    "content": content.strip(),
                    "status": "active",
                }
            )
            .execute()
        )
    except Exception as exc:
        raise RuntimeError("Knowledge sources are not available until the latest database migration is applied.") from exc
    return result.data[0]


def update_knowledge_source(clinic_id: str, source_id: str, updates: dict[str, Any]) -> Optional[dict[str, Any]]:
    filtered = {
        key: value.strip() if isinstance(value, str) else value
        for key, value in updates.items()
        if value is not None
    }
    if not filtered:
        return None

    db = get_supabase()
    try:
        result = (
            db.table("knowledge_sources")
            .update(filtered)
            .eq("clinic_id", clinic_id)
            .eq("id", source_id)
            .execute()
        )
    except Exception as exc:
        raise RuntimeError("Knowledge sources are not available until the latest database migration is applied.") from exc
    return result.data[0] if result.data else None


def delete_knowledge_source(clinic_id: str, source_id: str) -> bool:
    db = get_supabase()
    try:
        result = (
            db.table("knowledge_sources")
            .delete()
            .eq("clinic_id", clinic_id)
            .eq("id", source_id)
            .execute()
        )
    except Exception as exc:
        raise RuntimeError("Knowledge sources are not available until the latest database migration is applied.") from exc
    return bool(result.data)


def build_follow_up_queue(clinic_id: str) -> list[dict[str, Any]]:
    tasks = _load_follow_up_tasks(clinic_id)
    tasks.sort(
        key=lambda row: (
            _parse_datetime(row.get("due_at")) or datetime.max.replace(tzinfo=timezone.utc),
            _parse_datetime(row.get("created_at")) or datetime.max.replace(tzinfo=timezone.utc),
        )
    )
    return tasks


def create_follow_up_task(
    clinic_id: str,
    source_key: str,
    task_type: str,
    priority: str,
    title: str,
    detail: str,
    customer_name: str,
    customer_key: Optional[str] = None,
    lead_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    due_at: Optional[datetime] = None,
    note: str = "",
    status: str = "open",
) -> dict[str, Any]:
    if task_type not in FOLLOW_UP_TASK_TYPES:
        raise ValueError("Invalid follow-up task type.")
    if priority not in FOLLOW_UP_PRIORITIES:
        raise ValueError("Invalid follow-up priority.")
    if status not in FOLLOW_UP_TASK_STATUSES:
        raise ValueError("Invalid follow-up task status.")

    db = get_supabase()
    payload = {
        "clinic_id": clinic_id,
        "source_key": source_key,
        "task_type": task_type,
        "priority": priority,
        "title": _safe_text(title),
        "detail": _safe_text(detail),
        "customer_key": _safe_text(customer_key),
        "customer_name": _safe_text(customer_name) or "Unknown patient",
        "lead_id": lead_id,
        "conversation_id": conversation_id,
        "due_at": _serialize_datetime(due_at or datetime.now(timezone.utc)),
        "note": _safe_text(note),
        "status": status,
        "last_action_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        existing = _maybe_single_data(
            db.table("follow_up_tasks")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("source_key", source_key)
        )
        if existing:
            result = (
                db.table("follow_up_tasks")
                .update({k: v for k, v in payload.items() if k != "clinic_id"})
                .eq("clinic_id", clinic_id)
                .eq("id", existing["id"])
                .execute()
            )
            return result.data[0]
        result = db.table("follow_up_tasks").insert(payload).execute()
    except Exception as exc:
        raise RuntimeError("Follow-up tasks are not available until the latest database migration is applied.") from exc
    return result.data[0]


def update_follow_up_task(
    clinic_id: str,
    task_id: str,
    updates: dict[str, Any],
) -> Optional[dict[str, Any]]:
    filtered = {
        key: _serialize_datetime(value)
        for key, value in updates.items()
        if value is not None
    }
    if "status" in filtered and filtered["status"] not in FOLLOW_UP_TASK_STATUSES:
        raise ValueError("Invalid follow-up task status.")
    lead_status = filtered.pop("lead_status", None)
    if not filtered and lead_status is None:
        return None

    db = get_supabase()
    try:
        current = _maybe_single_data(
            db.table("follow_up_tasks")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("id", task_id)
        )
        if not current:
            return None

        filtered["last_action_at"] = datetime.now(timezone.utc).isoformat()
        result = (
            db.table("follow_up_tasks")
            .update(filtered)
            .eq("clinic_id", clinic_id)
            .eq("id", task_id)
            .execute()
        )
        updated = result.data[0] if result.data else current

        if lead_status and current.get("lead_id"):
            db.table("leads").update({"status": lead_status}).eq("clinic_id", clinic_id).eq("id", current["lead_id"]).execute()

        return updated
    except Exception as exc:
        raise RuntimeError("Follow-up tasks are not available until the latest database migration is applied.") from exc


def _operation_lead_payload(
    clinic_name: str,
    reminder_enabled: bool,
    reminder_lead_hours: int,
    lead: dict[str, Any],
) -> dict[str, Any]:
    appointment_starts_at = _parse_datetime(lead.get("appointment_starts_at"))
    reminder_scheduled_for = _parse_datetime(lead.get("reminder_scheduled_for"))
    reminder_ready = bool(
        reminder_enabled
        and lead.get("appointment_status") == "confirmed"
        and appointment_starts_at is not None
    )
    preview = _reminder_preview(clinic_name, lead.get("patient_name") or "", appointment_starts_at)
    if reminder_enabled and reminder_ready and reminder_scheduled_for is None:
        reminder_scheduled_for = appointment_starts_at - timedelta(hours=reminder_lead_hours)

    return {
        "lead_id": lead["id"],
        "patient_name": lead.get("patient_name") or "Unknown patient",
        "patient_phone": lead.get("patient_phone") or "",
        "patient_email": lead.get("patient_email") or "",
        "reason_for_visit": lead.get("reason_for_visit") or "",
        "preferred_datetime_text": lead.get("preferred_datetime_text") or "",
        "lead_status": lead.get("status") or "new",
        "appointment_status": lead.get("appointment_status") or "request_open",
        "appointment_starts_at": appointment_starts_at,
        "appointment_ends_at": _parse_datetime(lead.get("appointment_ends_at")),
        "reminder_status": lead.get("reminder_status") or "not_ready",
        "reminder_scheduled_for": reminder_scheduled_for,
        "reminder_preview": preview,
        "reminder_ready": reminder_ready,
        "deposit_required": bool(lead.get("deposit_required")),
        "deposit_amount_cents": lead.get("deposit_amount_cents"),
        "deposit_status": lead.get("deposit_status") or "not_required",
        "updated_at": _parse_datetime(lead.get("updated_at")),
    }


def build_operations_overview(clinic_id: str) -> dict[str, Any]:
    db = get_supabase()
    clinic = _maybe_single_data(
        db.table("clinics")
        .select("name, reminder_enabled, reminder_lead_hours")
        .eq("id", clinic_id)
    ) or {}
    reminder_enabled = bool(clinic.get("reminder_enabled"))
    reminder_lead_hours = int(clinic.get("reminder_lead_hours") or 24)
    leads = (
        db.table("leads")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("updated_at", desc=True)
        .execute()
        .data
        or []
    )
    try:
        waitlist_entries = (
            db.table("waitlist_entries")
            .select("*")
            .eq("clinic_id", clinic_id)
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        raise RuntimeError("Operations data is not available until the latest database migration is applied.") from exc

    reminder_candidates: list[dict[str, Any]] = []
    action_required_requests: list[dict[str, Any]] = []
    for lead in leads:
        payload = _operation_lead_payload(clinic.get("name") or "Your clinic", reminder_enabled, reminder_lead_hours, lead)
        appointment_status = payload["appointment_status"]
        if appointment_status in {"cancel_requested", "reschedule_requested", "no_show"}:
            action_required_requests.append(payload)
        elif lead.get("status") == "booked":
            reminder_candidates.append(payload)

    deposit_summary = {
        "required_count": sum(1 for lead in leads if lead.get("deposit_required")),
        "pending_count": sum(1 for lead in leads if lead.get("deposit_status") == "pending"),
        "configured_count": sum(
            1
            for lead in leads
            if lead.get("deposit_required") and lead.get("deposit_amount_cents")
        ),
        "note": "Stripe subscription billing is live. Booking-specific deposit collection is not wired yet, so this tracks readiness only.",
    }

    return {
        "reminder_enabled": reminder_enabled,
        "reminder_lead_hours": reminder_lead_hours,
        "reminder_candidates": reminder_candidates,
        "action_required_requests": action_required_requests,
        "waitlist_entries": waitlist_entries,
        "deposit_summary": deposit_summary,
    }


def update_lead_operations(
    clinic_id: str,
    lead_id: str,
    updates: dict[str, Any],
) -> Optional[dict[str, Any]]:
    filtered = {
        key: _serialize_datetime(value)
        for key, value in updates.items()
        if value is not None
    }
    if "appointment_status" in filtered and filtered["appointment_status"] not in APPOINTMENT_STATUSES:
        raise ValueError("Invalid appointment status.")
    if "reminder_status" in filtered and filtered["reminder_status"] not in REMINDER_STATUSES:
        raise ValueError("Invalid reminder status.")
    if "deposit_status" in filtered and filtered["deposit_status"] not in DEPOSIT_STATUSES:
        raise ValueError("Invalid deposit status.")
    if not filtered:
        return None

    db = get_supabase()
    try:
        current = _maybe_single_data(
            db.table("leads")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("id", lead_id)
        )
        if not current:
            return None

        clinic = _maybe_single_data(
            db.table("clinics")
            .select("reminder_enabled, reminder_lead_hours")
            .eq("id", clinic_id)
        ) or {}
        reminder_enabled = bool(clinic.get("reminder_enabled"))
        reminder_lead_hours = int(clinic.get("reminder_lead_hours") or 24)
        appointment_status = filtered.get("appointment_status", current.get("appointment_status") or "request_open")
        appointment_starts_at = _parse_datetime(
            filtered.get("appointment_starts_at") or current.get("appointment_starts_at")
        )

        if appointment_status in {"cancel_requested", "reschedule_requested", "cancelled", "no_show"}:
            filtered["reminder_status"] = "not_ready"
            filtered["reminder_scheduled_for"] = None
        elif appointment_status == "confirmed" and appointment_starts_at is not None:
            if reminder_enabled:
                filtered.setdefault("reminder_status", "ready")
                filtered["reminder_scheduled_for"] = (
                    appointment_starts_at - timedelta(hours=reminder_lead_hours)
                ).isoformat()
            else:
                filtered.setdefault("reminder_status", current.get("reminder_status") or "not_ready")

        if filtered.get("deposit_required") is False:
            filtered["deposit_amount_cents"] = None
            filtered["deposit_status"] = "not_required"
        elif filtered.get("deposit_required") is True and "deposit_status" not in filtered:
            filtered["deposit_status"] = current.get("deposit_status") or "pending"

        result = (
            db.table("leads")
            .update(filtered)
            .eq("clinic_id", clinic_id)
            .eq("id", lead_id)
            .execute()
        )
    except Exception as exc:
        raise RuntimeError("Operations data is not available until the latest database migration is applied.") from exc
    return result.data[0] if result.data else None


def create_waitlist_entry(
    clinic_id: str,
    data: dict[str, Any],
) -> dict[str, Any]:
    payload = {
        "clinic_id": clinic_id,
        "lead_id": data.get("lead_id"),
        "customer_key": _safe_text(data.get("customer_key")),
        "patient_name": _safe_text(data.get("patient_name")) or "Unknown patient",
        "patient_phone": _safe_text(data.get("patient_phone")),
        "patient_email": _safe_text(data.get("patient_email")),
        "service_requested": _safe_text(data.get("service_requested")),
        "preferred_times": _safe_text(data.get("preferred_times")),
        "notes": _safe_text(data.get("notes")),
        "status": "waiting",
    }
    db = get_supabase()
    try:
        result = db.table("waitlist_entries").insert(payload).execute()
    except Exception as exc:
        raise RuntimeError("Waitlist entries are not available until the latest database migration is applied.") from exc
    return result.data[0]


def update_waitlist_entry(
    clinic_id: str,
    entry_id: str,
    updates: dict[str, Any],
) -> Optional[dict[str, Any]]:
    filtered = {
        key: _safe_text(value) if isinstance(value, str) else value
        for key, value in updates.items()
        if value is not None
    }
    if "status" in filtered and filtered["status"] not in WAITLIST_STATUSES:
        raise ValueError("Invalid waitlist status.")
    if not filtered:
        return None

    db = get_supabase()
    try:
        result = (
            db.table("waitlist_entries")
            .update(filtered)
            .eq("clinic_id", clinic_id)
            .eq("id", entry_id)
            .execute()
        )
    except Exception as exc:
        raise RuntimeError("Waitlist entries are not available until the latest database migration is applied.") from exc
    return result.data[0] if result.data else None
