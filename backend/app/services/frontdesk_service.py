from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import uuid4

from app.config import get_settings
from app.dependencies import get_supabase
from app.services.billing_service import (
    create_deposit_checkout_session,
    stripe_readiness_summary,
    stripe_ready_for_payments,
)
from app.services.chat_service import (
    BookingData,
    detect_intent,
    is_simple_greeting,
    load_or_create_conversation,
    persist_assistant_message,
    persist_user_message,
    process_conversation_turn,
    save_state,
)
from app.services.sms_service import (
    get_sms_configuration,
    get_sms_sender_identity,
    parse_twilio_inbound_payload,
    send_sms_message,
    validate_twilio_signature,
)
from app.utils.logger import get_logger

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
DEPOSIT_STATUSES = {"not_required", "required", "requested", "paid", "failed", "expired", "waived"}
WAITLIST_STATUSES = {"waiting", "contacted", "booked", "closed"}
CHANNEL_TYPES = {"web_chat", "sms", "whatsapp", "missed_call", "callback_request", "manual"}
CHANNEL_CONNECTION_STATUSES = {"not_connected", "ready_for_setup", "connected"}
COMMUNICATION_DIRECTIONS = {"inbound", "outbound", "internal"}
COMMUNICATION_EVENT_TYPES = {"message", "missed_call", "text_back", "callback_request", "note", "reminder", "deposit_request"}
COMMUNICATION_EVENT_STATUSES = {"new", "queued", "attempted", "sent", "delivered", "failed", "skipped", "completed", "dismissed"}
MESSAGE_SENDER_KINDS = {"patient", "assistant", "staff", "system"}
SMS_AI_CONFIDENCE_LEVELS = {"high", "medium", "low", "blocked"}
SMS_SUGGESTED_REPLY_STATUSES = {"pending", "sent", "edited_sent", "discarded"}
SMS_OPT_OUT_KEYWORDS = {"stop", "stopall", "unsubscribe", "cancel", "end", "quit"}
SMS_REVIEW_KEYWORDS = (
    "chest pain",
    "difficulty breathing",
    "shortness of breath",
    "severe pain",
    "suicidal",
    "stroke",
    "emergency",
    "prescription",
    "dosage",
    "medication",
    "diagnosis",
)

CHANNEL_DEFAULTS: dict[str, dict[str, Any]] = {
    "web_chat": {
        "provider": "Built-in widget",
        "display_name": "Website chat widget",
        "live": True,
        "detail": "Website chat is already live in the product and feeds the inbox directly.",
    },
    "sms": {
        "provider": "Twilio",
        "display_name": "SMS inbox",
        "live": False,
        "detail": "Outbound SMS becomes live when Twilio is configured. Two-way replies appear after Twilio points inbound messages to the SMS webhook path.",
    },
    "whatsapp": {
        "provider": "WhatsApp Business provider",
        "display_name": "WhatsApp inbox",
        "live": False,
        "detail": "WhatsApp support is prepared in the product model but still needs a provider connection.",
    },
    "missed_call": {
        "provider": "Twilio recovery",
        "display_name": "Missed-call recovery",
        "live": False,
        "detail": "Missed-call recovery can send a real text-back when Twilio is configured and recovery automation is enabled. Inbound SMS replies continue the same recovery thread.",
    },
    "callback_request": {
        "provider": "Front desk workflow",
        "display_name": "Callback requests",
        "live": False,
        "detail": "Callback requests can be queued now and wired into future messaging channels later.",
    },
    "manual": {
        "provider": "Internal workflow",
        "display_name": "Manual entries",
        "live": True,
        "detail": "Manual operator notes and follow-up work are already supported.",
    },
}

logger = get_logger(__name__)
APPOINTMENT_VIEWS = {"all", "upcoming", "attention", "past", "cancelled"}

SMS_DECISION_REASON_MESSAGES: dict[str, str] = {
    "safe_to_send": "The assistant reply is ready to send.",
    "low_confidence": "The assistant drafted a reply, but staff review is recommended before sending.",
    "unsupported_question": "This message should be reviewed by staff before sending a reply.",
    "risky_content": "This message needs staff review before sending a reply.",
    "manual_takeover": "Manual takeover is active for this thread.",
    "automation_disabled": "Automation is turned off for this workflow.",
    "clinic_not_live": "SMS AI auto-reply is only available after the clinic is live.",
    "empty_message": "The inbound SMS was empty.",
    "pending_review": "A suggested reply is already waiting for staff review on this thread.",
    "ai_generation_failed": "The assistant could not generate an SMS reply.",
    "assistant_empty": "The assistant did not generate a reply.",
}


def _parse_datetime(value: Optional[Any]) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
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


def _normalize_channel(value: Optional[str], fallback: str = "web_chat") -> str:
    channel = _safe_text(value).lower().replace(" ", "_")
    return channel if channel in CHANNEL_TYPES else fallback


def _normalize_deposit_status(value: Optional[str]) -> str:
    status = _safe_text(value).lower()
    if status == "pending":
        return "requested"
    return status if status in DEPOSIT_STATUSES else "not_required"


def _event_timestamp(event: dict[str, Any]) -> datetime:
    return (
        _parse_datetime(event.get("occurred_at"))
        or _parse_datetime(event.get("sent_at"))
        or _parse_datetime(event.get("created_at"))
        or datetime.min.replace(tzinfo=timezone.utc)
    )


def _thread_key_for_event(event: dict[str, Any]) -> str:
    stored = _safe_text(event.get("thread_key"))
    if stored:
        return stored
    channel = _normalize_channel(event.get("channel"), "manual")
    if channel not in {"sms", "missed_call", "callback_request"}:
        return _safe_text(event.get("id"))
    lead_id = _safe_text(event.get("lead_id"))
    if lead_id:
        return f"sms:lead:{lead_id}"
    customer_key = _safe_text(event.get("customer_key"))
    if customer_key:
        return f"sms:customer:{customer_key}"
    normalized_phone = _normalize_phone(_safe_text(event.get("customer_phone")))
    if normalized_phone:
        return f"sms:phone:{normalized_phone}"
    return _safe_text(event.get("id")) or f"sms:thread:{uuid4().hex}"


def _build_identity_from_fields(name: str, phone: str, email: str, fallback: str) -> str:
    email_value = _safe_text(email).lower()
    phone_value = _normalize_phone(phone)
    name_value = re.sub(r"\s+", " ", _safe_text(name).lower())
    if email_value:
        return f"email:{email_value}"
    if phone_value:
        return f"phone:{phone_value}"
    if name_value:
        return f"name:{name_value}"
    return fallback


def _customer_key_from_fields(name: str, phone: str, email: str, fallback: str) -> str:
    return _customer_key(_build_identity_from_fields(name, phone, email, fallback))


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


def _serialize_payload(value: dict[str, Any]) -> dict[str, Any]:
    return {
        key: _serialize_datetime(item)
        for key, item in value.items()
        if item is not None
    }


def _safe_int(value: Any, default: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


def _current_timestamp() -> datetime:
    return datetime.now(timezone.utc)


def _payload_field(event: dict[str, Any], key: str) -> str:
    payload = _to_json_dict(event.get("payload"))
    return _safe_text(payload.get(key))


def _normalize_sms_ai_confidence(value: Any) -> str:
    normalized = _safe_text(value).lower()
    return normalized if normalized in SMS_AI_CONFIDENCE_LEVELS else ""


def _normalize_suggested_reply_status(value: Any) -> str:
    normalized = _safe_text(value).lower()
    return normalized if normalized in SMS_SUGGESTED_REPLY_STATUSES else ""


def _sms_decision_message(reason_code: str) -> str:
    return SMS_DECISION_REASON_MESSAGES.get(reason_code, "Staff review is recommended before sending a reply.")


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


def _missed_call_text_back_preview(clinic_name: str) -> str:
    return (
        f"Hi, this is {clinic_name}. We noticed your missed call and can help with scheduling "
        "or questions by text. Reply here and our front desk will follow up."
    )


def _humanize_intent(intent: str) -> str:
    normalized = _safe_text(intent).replace("_", " ")
    return normalized.title() if normalized else "Patient request"


def _derive_conversation_reason(conversation: dict[str, Any], messages: list[dict[str, Any]]) -> str:
    if _safe_text(conversation.get("last_intent")) not in {"", "general"}:
        return _humanize_intent(conversation.get("last_intent") or "")
    for message in reversed(messages):
        if _safe_text(message.get("role")) == "user" and _safe_text(message.get("content")):
            return _truncate(_safe_text(message.get("content")), 80)
    if _safe_text(conversation.get("summary")):
        return _truncate(_safe_text(conversation.get("summary")), 80)
    return "Website chat request"


def _is_follow_up_needed(
    lead: Optional[dict[str, Any]],
    updated_at: Optional[datetime],
    *,
    delay_minutes: int = 45,
) -> bool:
    if updated_at is None:
        return False
    now = datetime.now(timezone.utc)
    age = now - updated_at
    if lead is None:
        return age >= timedelta(minutes=delay_minutes)
    status = lead.get("status")
    if status == "new":
        return age >= timedelta(minutes=delay_minutes)
    if status == "contacted":
        return age >= timedelta(hours=24)
    return False


def _derive_conversation_status(
    lead: Optional[dict[str, Any]],
    updated_at: Optional[datetime],
    *,
    delay_minutes: int = 45,
) -> str:
    if lead:
        status = lead.get("status")
        if status == "booked":
            return "booked"
        if status == "closed":
            return "handled"
        if _is_follow_up_needed(lead, updated_at, delay_minutes=delay_minutes):
            return "needs_follow_up"
        if status == "contacted":
            return "handled"
        return "open"

    if _is_follow_up_needed(None, updated_at, delay_minutes=delay_minutes):
        return "needs_follow_up"
    return "open"


def _thread_key(thread_type: str, raw_id: str) -> str:
    if thread_type == "event":
        return f"event:{raw_id}"
    return raw_id


def _channel_for_conversation(conversation: Optional[dict[str, Any]], lead: Optional[dict[str, Any]]) -> str:
    if conversation and conversation.get("channel"):
        return _normalize_channel(conversation.get("channel"))
    return _normalize_channel((lead or {}).get("source") or "web_chat")


def _last_message_role_for_direction(direction: str) -> Optional[str]:
    if direction == "inbound":
        return "user"
    if direction == "outbound":
        return "assistant"
    return "system"


def _communication_status_to_thread_status(status: str) -> str:
    if status in {"completed", "dismissed"}:
        return "handled"
    return "needs_follow_up"


def _communication_preview(event: dict[str, Any]) -> str:
    if _safe_text(event.get("failure_reason")):
        return _safe_text(event.get("failure_reason"))
    if _safe_text(event.get("skipped_reason")):
        return _safe_text(event.get("skipped_reason"))
    if _safe_text(event.get("event_type")) == "message" and _safe_text(event.get("content")):
        return _safe_text(event.get("content"))
    if _safe_text(event.get("summary")):
        return _safe_text(event.get("summary"))
    if _safe_text(event.get("content")):
        return _safe_text(event.get("content"))
    event_type = event.get("event_type")
    if event_type == "missed_call":
        return "Missed call captured and waiting for recovery."
    if event_type == "callback_request":
        return "Customer requested a callback."
    if event_type == "text_back":
        return "Text-back attempt logged."
    if event_type == "reminder":
        return "Appointment reminder logged."
    if event_type == "deposit_request":
        return "Appointment deposit request logged."
    return "Communication activity recorded."


def _communication_title(event: dict[str, Any]) -> str:
    event_type = _safe_text(event.get("event_type"))
    channel = _normalize_channel(event.get("channel"), "manual")
    direction = _safe_text(event.get("direction"))
    if event_type == "missed_call":
        return "Missed call"
    if event_type == "callback_request":
        return "Callback request"
    if event_type == "text_back":
        return "Text-back message"
    if event_type == "reminder":
        return "Appointment reminder"
    if event_type == "deposit_request":
        return "Deposit request"
    if event_type == "message" and direction == "outbound" and channel == "sms":
        return "Outbound SMS"
    if event_type == "message" and direction == "inbound" and channel == "sms":
        return "Inbound SMS"
    return event_type.replace("_", " ").title() or "Communication"


def _sms_reply_matches_fallback(clinic: dict[str, Any], reply_text: str) -> bool:
    fallback_message = _safe_text(
        clinic.get("fallback_message")
        or "I can help collect your information so the clinic can follow up with you directly."
    )
    normalized_reply = re.sub(r"\s+", " ", _safe_text(reply_text).lower())
    normalized_fallback = re.sub(r"\s+", " ", fallback_message.lower())
    if normalized_reply == normalized_fallback:
        return True
    return normalized_fallback and normalized_fallback in normalized_reply


def _deposit_status_label(status: str) -> str:
    normalized = _safe_text(status) or "not_required"
    labels = {
        "not_required": "No deposit required",
        "required": "Deposit required",
        "requested": "Deposit requested",
        "paid": "Deposit paid",
        "failed": "Deposit failed",
        "expired": "Deposit expired",
        "waived": "Deposit waived",
    }
    return labels.get(normalized, normalized.replace("_", " ").title())


def _clinic_has_grounded_faq_context(clinic: dict[str, Any], user_message: str) -> bool:
    normalized = _safe_text(user_message).lower()
    if not normalized:
        return False
    services = _to_json_list(clinic.get("services"))
    faq = _to_json_list(clinic.get("faq"))
    hours = _to_json_dict(clinic.get("business_hours"))
    if any(keyword in normalized for keyword in {"hours", "open", "close", "when"}) and hours:
        return True
    if any(keyword in normalized for keyword in {"where", "address", "location", "directions"}):
        return bool(_safe_text(clinic.get("address")))
    if any(keyword in normalized for keyword in {"phone", "call", "contact"}):
        return bool(_safe_text(clinic.get("phone")))
    if "email" in normalized:
        return bool(_safe_text(clinic.get("email")))
    if any(keyword in normalized for keyword in {"service", "offer", "cleaning", "consult", "appointment"}):
        return bool(services or faq)
    if any(keyword in normalized for keyword in {"price", "cost", "insurance", "accept"}):
        return bool(faq)
    return bool(faq)


def _event_link_key(event: dict[str, Any]) -> str:
    return _safe_text(event.get("provider_message_id")) or _safe_text(event.get("external_id")) or _safe_text(event.get("id"))


def _event_matches_source(event: dict[str, Any], source_event_id: str) -> bool:
    payload = _to_json_dict(event.get("payload"))
    return _safe_text(payload.get("source_event_id")) == source_event_id


def _load_channel_connection_rows(clinic_id: str) -> list[dict[str, Any]]:
    db = get_supabase()
    try:
        return (
            db.table("channel_connections")
            .select("*")
            .eq("clinic_id", clinic_id)
            .execute()
            .data
            or []
        )
    except Exception:
        return []


def _build_channel_readiness_item(
    clinic: dict[str, Any],
    row_by_channel: dict[str, dict[str, Any]],
    channel: str,
) -> dict[str, Any]:
    defaults = CHANNEL_DEFAULTS[channel]
    row = row_by_channel.get(channel) or {}
    sms_config = get_sms_configuration()
    contact_value = _safe_text(row.get("contact_value"))
    if not contact_value and channel in {"sms", "missed_call", "callback_request"}:
        contact_value = _safe_text(clinic.get("phone"))
    if not contact_value and channel in {"sms", "missed_call"}:
        contact_value = _safe_text(get_sms_sender_identity())
    provider = _safe_text(row.get("provider")) or defaults["provider"]
    display_name = _safe_text(row.get("display_name")) or defaults["display_name"]
    automation_enabled = bool(row.get("automation_enabled"))
    notes = _safe_text(row.get("notes"))
    if channel in {"web_chat", "manual"}:
        connection_status = "connected"
    elif channel in {"sms", "missed_call"} and sms_config["configured"]:
        connection_status = "connected"
        provider = "Twilio"
    elif contact_value or provider != defaults["provider"] or notes or automation_enabled:
        connection_status = "ready_for_setup"
    else:
        connection_status = "not_connected"
    if row.get("connection_status") in CHANNEL_CONNECTION_STATUSES and channel not in {"web_chat", "manual"}:
        connection_status = row["connection_status"]
    summary = {
        "connected": "Live now",
        "ready_for_setup": "Ready for provider setup",
        "not_connected": "Not connected",
    }[connection_status]
    return {
        "id": row.get("id") or f"virtual:{channel}",
        "channel": channel,
        "provider": provider,
        "connection_status": connection_status,
        "display_name": display_name,
        "contact_value": contact_value,
        "automation_enabled": automation_enabled if connection_status == "connected" else False,
        "notes": notes,
        "live": bool((defaults["live"] or channel in {"sms", "missed_call"}) and connection_status == "connected"),
        "summary": summary,
        "detail": defaults["detail"],
    }


def build_channel_readiness(clinic_id: str) -> list[dict[str, Any]]:
    db = get_supabase()
    clinic = _maybe_single_data(
        db.table("clinics")
        .select("phone, email, name")
        .eq("id", clinic_id)
    ) or {}
    rows = _load_channel_connection_rows(clinic_id)
    row_by_channel = {
        _normalize_channel(row.get("channel"), ""): row
        for row in rows
        if _normalize_channel(row.get("channel"), "")
    }
    return [
        _build_channel_readiness_item(clinic, row_by_channel, channel)
        for channel in ["web_chat", "sms", "whatsapp", "missed_call", "callback_request", "manual"]
    ]


def _channel_readiness_map(clinic_id: str) -> dict[str, dict[str, Any]]:
    return {
        item["channel"]: item
        for item in build_channel_readiness(clinic_id)
    }


def _system_readiness_item(
    *,
    key: str,
    label: str,
    status: str,
    scope: str,
    summary: str,
    detail: str,
    action: str = "",
) -> dict[str, Any]:
    return {
        "key": key,
        "label": label,
        "status": status,
        "scope": scope,
        "summary": summary,
        "detail": detail,
        "action": action,
    }


def build_system_readiness(clinic_id: str) -> dict[str, Any]:
    from app.services.google_sheets import get_gspread_client
    from app.services.pricing import has_feature

    settings = get_settings()
    db = get_supabase()
    clinic = _maybe_single_data(
        db.table("clinics")
        .select(
            "id, name, email, phone, plan, spreadsheet_provider, google_sheet_id, excel_workbook_id, "
            "notifications_enabled, notification_email, is_live"
        )
        .eq("id", clinic_id)
    ) or {}
    readiness_by_channel = _channel_readiness_map(clinic_id)
    sms_channel = readiness_by_channel.get("sms") or {}
    plan_id = _safe_text(clinic.get("plan")) or "trial"

    items: list[dict[str, Any]] = [
        _system_readiness_item(
            key="openai_assistant",
            label="OpenAI assistant",
            status="configured",
            scope="core",
            summary="Clinic AI responses are available.",
            detail="The assistant runtime key is configured and the core AI workflow is ready.",
            action="No action needed.",
        )
    ]

    twilio_missing = []
    if not settings.twilio_account_sid:
        twilio_missing.append("TWILIO_ACCOUNT_SID")
    if not settings.twilio_auth_token:
        twilio_missing.append("TWILIO_AUTH_TOKEN")
    if not (settings.twilio_from_number or settings.twilio_messaging_service_sid):
        twilio_missing.append("TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID")

    if len(twilio_missing) == 3:
        items.append(
            _system_readiness_item(
                key="twilio_sms",
                label="Twilio SMS",
                status="missing",
                scope="feature",
                summary="SMS is not configured on the server yet.",
                detail="Inbound SMS, reminders, and text-back workflows stay disabled until Twilio credentials and a sender are set.",
                action="Add the Twilio account SID, auth token, and a sender number or messaging service SID.",
            )
        )
    elif twilio_missing:
        items.append(
            _system_readiness_item(
                key="twilio_sms",
                label="Twilio SMS",
                status="partially_configured",
                scope="feature",
                summary="Twilio setup is incomplete.",
                detail="The SMS provider is only partially configured, so send and reply workflows remain blocked.",
                action="Finish the missing Twilio values: " + ", ".join(twilio_missing),
            )
        )
    elif sms_channel.get("connection_status") != "connected":
        items.append(
            _system_readiness_item(
                key="twilio_sms",
                label="Twilio SMS",
                status="partially_configured",
                scope="feature",
                summary="Twilio is configured, but the clinic SMS channel still needs activation.",
                detail="The server can send SMS, but this clinic still needs its SMS channel saved with the live number and inbound webhook path.",
                action="Confirm the Twilio number is mapped on the SMS channel and point inbound SMS to /api/frontdesk/communications/twilio/inbound.",
            )
        )
    else:
        items.append(
            _system_readiness_item(
                key="twilio_sms",
                label="Twilio SMS",
                status="configured",
                scope="feature",
                summary="Twilio SMS is configured.",
                detail="Manual SMS, reminders, and two-way SMS threads are available when Twilio delivery is allowed by the account and carrier.",
                action="Keep the live webhook URL current in local development.",
            )
        )

    spreadsheet_provider = _safe_text(clinic.get("spreadsheet_provider"))
    google_ready = settings.google_credentials_configured and bool(get_gspread_client())
    excel_ready = settings.microsoft_oauth_configured

    if not has_feature(plan_id, "google_sheets"):
        items.append(
            _system_readiness_item(
                key="google_sheets",
                label="Spreadsheet sync",
                status="blocked",
                scope="feature",
                summary="Spreadsheet sync is blocked on the current plan.",
                detail="This clinic plan does not currently include spreadsheet sync.",
                action="Switch to a plan that includes spreadsheet sync before connecting Google Sheets or Excel.",
            )
        )
    elif spreadsheet_provider == "excel":
        items.append(
            _system_readiness_item(
                key="google_sheets",
                label="Spreadsheet sync",
                status="configured" if excel_ready and _safe_text(clinic.get("excel_workbook_id")) else "missing",
                scope="feature",
                summary=(
                    "Microsoft Excel is configured."
                    if excel_ready and _safe_text(clinic.get("excel_workbook_id"))
                    else "Microsoft Excel quick connect is not configured on the server yet."
                ),
                detail=(
                    "This clinic is connected to Excel and spreadsheet sync is ready."
                    if excel_ready and _safe_text(clinic.get("excel_workbook_id"))
                    else "Set Microsoft OAuth credentials before enabling Excel quick connect."
                ),
                action=(
                    "No action needed."
                    if excel_ready and _safe_text(clinic.get("excel_workbook_id"))
                    else "Set MICROSOFT_OAUTH_CLIENT_ID and MICROSOFT_OAUTH_CLIENT_SECRET."
                ),
            )
        )        
    elif not google_ready and not excel_ready:
        items.append(
            _system_readiness_item(
                key="google_sheets",
                label="Spreadsheet sync",
                status="missing",
                scope="feature",
                summary="Spreadsheet sync is not configured on the server yet.",
                detail="Neither Google Sheets nor Microsoft Excel quick connect is configured for this environment.",
                action="Set Google service credentials or Microsoft OAuth credentials.",
            )
        )
    elif spreadsheet_provider == "google" and not google_ready:
        items.append(
            _system_readiness_item(
                key="google_sheets",
                label="Spreadsheet sync",
                status="blocked",
                scope="feature",
                summary="Google Sheets credentials are present, but the client could not initialize.",
                detail="The configured Google credentials are invalid or do not match a supported format for Sheets access.",
                action="Re-check the Google credentials payload and service-account access.",
            )
        )
    elif spreadsheet_provider == "excel" and not _safe_text(clinic.get("excel_workbook_id")):
        items.append(
            _system_readiness_item(
                key="google_sheets",
                label="Spreadsheet sync",
                status="partially_configured",
                scope="feature",
                summary="Microsoft Excel quick connect is ready, but this clinic has not connected a workbook yet.",
                detail="The runtime can connect to Excel, but no workbook is saved for this clinic.",
                action="Use Connect with Microsoft in onboarding or settings.",
            )
        )
    elif spreadsheet_provider == "google" and not _safe_text(clinic.get("google_sheet_id")):
        items.append(
            _system_readiness_item(
                key="google_sheets",
                label="Spreadsheet sync",
                status="partially_configured",
                scope="feature",
                summary="Google Sheets is ready on the server, but this clinic has not connected a sheet yet.",
                detail="The runtime can access Google Sheets, but no spreadsheet is configured for this clinic.",
                action="Use Connect with Google in onboarding or settings.",
            )
        )
    elif not spreadsheet_provider and (google_ready or excel_ready):
        items.append(
            _system_readiness_item(
                key="google_sheets",
                label="Spreadsheet sync",
                status="partially_configured",
                scope="feature",
                summary="Spreadsheet sync is available, but this clinic has not connected Google Sheets or Excel yet.",
                detail="The server is ready for quick connect, but the clinic still needs to pick a spreadsheet provider.",
                action="Use Connect with Google or Connect with Microsoft in onboarding or settings.",
            )
        )
    else:
        items.append(
            _system_readiness_item(
                key="google_sheets",
                label="Spreadsheet sync",
                status="configured",
                scope="feature",
                summary="Spreadsheet sync is configured.",
                detail="This clinic has a saved spreadsheet connection for lead sync or availability checks.",
                action="No action needed.",
            )
        )

    resend_sender_ready = settings.resend_sender_configured
    notification_target = _safe_text(clinic.get("notification_email")) or _safe_text(clinic.get("email"))
    notifications_enabled = bool(clinic.get("notifications_enabled"))
    if not has_feature(plan_id, "email_notifications"):
        items.append(
            _system_readiness_item(
                key="resend_email",
                label="Resend email",
                status="blocked",
                scope="feature",
                summary="Email notifications are blocked on the current plan.",
                detail="Clinic email notifications require a Professional or Premium plan.",
                action="Upgrade the clinic plan before enabling email notifications.",
            )
        )
    elif not settings.resend_api_key and not resend_sender_ready:
        items.append(
            _system_readiness_item(
                key="resend_email",
                label="Resend email",
                status="missing",
                scope="feature",
                summary="Email notifications are not configured on the server yet.",
                detail="The runtime is missing both the Resend API key and a sender identity, so notification email cannot be sent.",
                action="Set RESEND_API_KEY and either RESEND_FROM_EMAIL or RESEND_FROM_DOMAIN.",
            )
        )
    elif not settings.resend_api_key or not resend_sender_ready:
        missing_parts = []
        if not settings.resend_api_key:
            missing_parts.append("RESEND_API_KEY")
        if not resend_sender_ready:
            missing_parts.append("RESEND_FROM_EMAIL or RESEND_FROM_DOMAIN")
        items.append(
            _system_readiness_item(
                key="resend_email",
                label="Resend email",
                status="partially_configured",
                scope="feature",
                summary="Email notifications are partially configured.",
                detail="The server is missing part of the email sender setup, so notification email stays disabled.",
                action="Add the missing email values: " + ", ".join(missing_parts),
            )
        )
    elif not notifications_enabled:
        items.append(
            _system_readiness_item(
                key="resend_email",
                label="Resend email",
                status="partially_configured",
                scope="feature",
                summary="Resend is configured, but clinic notifications are turned off.",
                detail="The email sender is ready on the server, but this clinic has not enabled notifications yet.",
                action="Turn on email notifications in Settings when you want lead alerts sent.",
            )
        )
    elif not notification_target:
        items.append(
            _system_readiness_item(
                key="resend_email",
                label="Resend email",
                status="partially_configured",
                scope="feature",
                summary="Resend is configured, but no notification recipient is set for this clinic.",
                detail="The product can send email, but there is no clinic notification address to receive alerts.",
                action="Add a notification email in Settings.",
            )
        )
    else:
        items.append(
            _system_readiness_item(
                key="resend_email",
                label="Resend email",
                status="configured",
                scope="feature",
                summary="Resend email notifications are configured.",
                detail="The server has a valid sender setup and this clinic has notifications enabled with a destination address.",
                action="No action needed.",
            )
        )

    stripe_state = stripe_readiness_summary()
    items.append(
        _system_readiness_item(
            key="stripe_billing",
            label="Stripe billing",
            status=_safe_text(stripe_state.get("status")) or "missing",
            scope="feature",
            summary=_safe_text(stripe_state.get("summary")),
            detail=_safe_text(stripe_state.get("detail")),
            action=(
                "Add the missing Stripe values: " + ", ".join(stripe_state.get("missing") or [])
                if stripe_state.get("missing")
                else "No action needed."
            ),
        )
    )

    if settings.admin_tools_configured:
        items.append(
            _system_readiness_item(
                key="admin_tools",
                label="Admin tooling",
                status="configured",
                scope="internal",
                summary="Protected admin routes are enabled.",
                detail="The admin secret is configured, so internal admin routes can be used with the matching header.",
                action="Keep the admin secret restricted to internal operators only.",
            )
        )
    else:
        items.append(
            _system_readiness_item(
                key="admin_tools",
                label="Admin tooling",
                status="missing",
                scope="internal",
                summary="Protected admin routes are disabled.",
                detail="ADMIN_SECRET is not set, so internal admin endpoints intentionally stay unavailable.",
                action="Set ADMIN_SECRET only if you need the protected admin capability.",
            )
        )
    configured_count = sum(1 for item in items if item["status"] == "configured")
    partial_count = sum(1 for item in items if item["status"] == "partially_configured")
    missing_count = sum(1 for item in items if item["status"] == "missing")
    blocked_count = sum(1 for item in items if item["status"] == "blocked")
    overall_status = "ready"
    if any(item["scope"] == "core" and item["status"] != "configured" for item in items):
        overall_status = "blocked"
    elif blocked_count or missing_count or partial_count:
        overall_status = "attention"
    return {
        "overall_status": overall_status,
        "configured_count": configured_count,
        "partial_count": partial_count,
        "missing_count": missing_count,
        "blocked_count": blocked_count,
        "items": items,
    }


def _sms_can_send(clinic_id: str, *, require_automation: bool = False, channel: str = "sms") -> tuple[bool, str]:
    readiness = _channel_readiness_map(clinic_id)
    sms_channel = readiness.get("sms")
    if not sms_channel or sms_channel.get("connection_status") != "connected":
        return False, "SMS is ready in the product but Twilio is not connected yet."
    if require_automation:
        channel_state = readiness.get(channel) or sms_channel
        if not channel_state.get("automation_enabled"):
            return False, "Automation is turned off for this workflow."
    return True, ""


def _normalize_communication_event_row(event: dict[str, Any]) -> dict[str, Any]:
    event["channel"] = _normalize_channel(event.get("channel"), "manual")
    event["customer_key"] = event.get("customer_key") or _customer_key_from_fields(
        event.get("customer_name") or "",
        event.get("customer_phone") or "",
        event.get("customer_email") or "",
        f"event:{event['id']}",
    )
    event["provider_message_id"] = _safe_text(event.get("provider_message_id"))
    event["failure_reason"] = _safe_text(event.get("failure_reason"))
    event["skipped_reason"] = _safe_text(event.get("skipped_reason"))
    event["thread_key"] = _thread_key_for_event(event)
    sender_kind = _payload_field(event, "sender_kind")
    event["sender_kind"] = sender_kind if sender_kind in MESSAGE_SENDER_KINDS else (
        "patient" if _safe_text(event.get("direction")) == "inbound" else "staff"
    )
    event["auto_reply_status"] = _payload_field(event, "auto_reply_status")
    event["auto_reply_reason"] = _payload_field(event, "auto_reply_reason")
    event["ai_confidence"] = _normalize_sms_ai_confidence(_payload_field(event, "ai_confidence"))
    event["ai_decision_reason"] = _safe_text(_payload_field(event, "ai_decision_reason"))
    event["suggested_reply_text"] = _payload_field(event, "suggested_reply_text")
    event["suggested_reply_status"] = _normalize_suggested_reply_status(_payload_field(event, "suggested_reply_status"))
    event["suggested_reply_sent_event_id"] = _payload_field(event, "suggested_reply_sent_event_id")
    event["ai_generated"] = event["sender_kind"] == "assistant"
    event["manual_takeover"] = bool(event.get("manual_takeover"))
    event["ai_auto_reply_enabled"] = bool(event.get("ai_auto_reply_enabled"))
    event["ai_auto_reply_ready"] = bool(event.get("ai_auto_reply_ready"))
    event["operator_review_required"] = _sms_review_required(event)
    return event


def _create_communication_event_record(
    clinic_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    db = get_supabase()
    try:
        result = db.table("communication_events").insert(_serialize_payload(payload)).execute()
    except Exception as exc:
        raise RuntimeError("Communication events are not available until the latest database migration is applied.") from exc
    return _normalize_communication_event_row(result.data[0])


def _update_communication_event_record(
    clinic_id: str,
    event_id: str,
    updates: dict[str, Any],
) -> Optional[dict[str, Any]]:
    db = get_supabase()
    try:
        result = (
            db.table("communication_events")
            .update(_serialize_payload(updates))
            .eq("clinic_id", clinic_id)
            .eq("id", event_id)
            .execute()
        )
    except Exception as exc:
        raise RuntimeError("Communication events are not available until the latest database migration is applied.") from exc
    if not result.data:
        return None
    return _normalize_communication_event_row(result.data[0])


def _load_communication_events(
    clinic_id: str,
    limit: int = 100,
    *,
    include_all_statuses: bool = True,
) -> list[dict[str, Any]]:
    db = get_supabase()
    try:
        query = (
            db.table("communication_events")
            .select("*")
            .eq("clinic_id", clinic_id)
            .order("occurred_at", desc=True)
            .limit(limit)
        )
        events = query.execute().data or []
    except Exception:
        return []

    normalized_events: list[dict[str, Any]] = []
    for event in events:
        if not include_all_statuses and _safe_text(event.get("status")) in {"completed", "dismissed"}:
            continue
        normalized_events.append(_normalize_communication_event_row(event))
    return normalized_events


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


def _load_sms_conversation_maps(clinic_id: str) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    try:
        rows = (
            get_supabase()
            .table("conversations")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("channel", "sms")
            .execute()
            .data
            or []
        )
    except Exception:
        return {}, {}

    by_id = {row["id"]: row for row in rows}
    by_session = {
        _safe_text(row.get("session_id")): row
        for row in rows
        if _safe_text(row.get("session_id"))
    }
    return by_id, by_session


def _load_latest_conversations_by_lead(clinic_id: str) -> dict[str, dict[str, Any]]:
    conversations, _, _ = _load_conversations_for_clinic(clinic_id, limit=500)
    latest_by_lead: dict[str, dict[str, Any]] = {}
    for conversation in conversations:
        lead_id = _safe_text(conversation.get("lead_id"))
        if lead_id and lead_id not in latest_by_lead:
            latest_by_lead[lead_id] = conversation
    return latest_by_lead


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


def _latest_related_outbound_events(events: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    mapping: dict[str, dict[str, Any]] = {}
    for event in events:
        if _safe_text(event.get("direction")) != "outbound":
            continue
        payload = _to_json_dict(event.get("payload"))
        source_event_id = _safe_text(payload.get("source_event_id"))
        if not source_event_id:
            continue
        current = mapping.get(source_event_id)
        event_time = _parse_datetime(event.get("sent_at")) or _parse_datetime(event.get("created_at"))
        current_time = _parse_datetime((current or {}).get("sent_at")) or _parse_datetime((current or {}).get("created_at"))
        if current is None or (event_time and current_time and event_time > current_time) or (event_time and current_time is None):
            mapping[source_event_id] = event
    return mapping


def _latest_thread_event_by_direction(
    events: list[dict[str, Any]],
    direction: str,
) -> dict[str, dict[str, Any]]:
    mapping: dict[str, dict[str, Any]] = {}
    for event in events:
        if _safe_text(event.get("direction")) != direction:
            continue
        thread_key = _safe_text(event.get("thread_key"))
        if not thread_key:
            continue
        current = mapping.get(thread_key)
        if current is None or _event_timestamp(event) > _event_timestamp(current):
            mapping[thread_key] = event
    return mapping


def _group_communication_threads(events: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in events:
        channel = _normalize_channel(event.get("channel"), "manual")
        if channel not in {"sms", "missed_call", "callback_request"}:
            continue
        grouped[_safe_text(event.get("thread_key")) or _thread_key_for_event(event)].append(event)
    for group in grouped.values():
        group.sort(key=_event_timestamp)
    return dict(grouped)


def _primary_event_for_thread(events: list[dict[str, Any]]) -> dict[str, Any]:
    for event in events:
        if _normalize_channel(event.get("channel"), "") in {"missed_call", "callback_request"}:
            return event
    return events[0]


def _thread_latest_inbound_reply(events: list[dict[str, Any]]) -> Optional[dict[str, Any]]:
    primary = _primary_event_for_thread(events)
    for event in reversed(events):
        if event["id"] == primary["id"]:
            continue
        if _safe_text(event.get("direction")) == "inbound" and _normalize_channel(event.get("channel"), "") == "sms":
            return event
    return None


def _derive_event_thread_status(events: list[dict[str, Any]]) -> str:
    primary = _primary_event_for_thread(events)
    latest = events[-1]
    latest_inbound_reply = _thread_latest_inbound_reply(events)
    primary_channel = _normalize_channel(primary.get("channel"), "manual")
    primary_status = _safe_text(primary.get("status")) or "new"

    if primary_channel in {"missed_call", "callback_request"}:
        if latest_inbound_reply:
            return "open"
        if primary_status in {"completed", "dismissed"}:
            return "handled"
        return "needs_follow_up"

    if _safe_text(latest.get("direction")) == "inbound":
        return "open"
    if _safe_text(latest.get("status")) in {"failed", "skipped"}:
        return "needs_follow_up"
    return "handled"


def _find_matching_lead_by_phone(clinic_id: str, phone: str) -> Optional[dict[str, Any]]:
    normalized_phone = _normalize_phone(phone)
    if not normalized_phone:
        return None
    db = get_supabase()
    leads = (
        db.table("leads")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("updated_at", desc=True)
        .limit(200)
        .execute()
        .data
        or []
    )
    for lead in leads:
        if _normalize_phone(lead.get("patient_phone") or "") == normalized_phone:
            return lead
    return None


def _find_matching_lead_by_email(clinic_id: str, email: str) -> Optional[dict[str, Any]]:
    normalized_email = _safe_text(email).lower()
    if not normalized_email:
        return None
    db = get_supabase()
    leads = (
        db.table("leads")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("updated_at", desc=True)
        .limit(200)
        .execute()
        .data
        or []
    )
    for lead in leads:
        if _safe_text(lead.get("patient_email")).lower() == normalized_email:
            return lead
    return None


def _find_matching_lead_by_identity(
    clinic_id: str,
    *,
    phone: str = "",
    email: str = "",
) -> Optional[dict[str, Any]]:
    return _find_matching_lead_by_email(clinic_id, email) or _find_matching_lead_by_phone(clinic_id, phone)


def _merge_note_text(existing: str, addition: str) -> str:
    current = _safe_text(existing)
    extra = _safe_text(addition)
    if not extra:
        return current
    if not current:
        return extra
    if extra in current:
        return current
    return f"{current}\n\n{extra}"


def _format_appointment_summary(value: datetime) -> str:
    local_value = value.astimezone()
    hour = local_value.strftime("%I").lstrip("0") or "0"
    return f"{local_value.strftime('%b')} {local_value.day}, {local_value.year} at {hour}:{local_value.strftime('%M %p')}"


def _find_latest_sms_thread_event(clinic_id: str, phone: str) -> Optional[dict[str, Any]]:
    normalized_phone = _normalize_phone(phone)
    if not normalized_phone:
        return None
    events = _load_communication_events(clinic_id, limit=400, include_all_statuses=True)
    matches = [
        event
        for event in events
        if _normalize_phone(event.get("customer_phone") or "") == normalized_phone
        and _normalize_channel(event.get("channel"), "manual") in {"sms", "missed_call", "callback_request"}
    ]
    matches.sort(key=_event_timestamp, reverse=True)
    return matches[0] if matches else None


def _load_clinic_record(clinic_id: str) -> dict[str, Any]:
    clinic = _maybe_single_data(
        get_supabase()
        .table("clinics")
        .select("*")
        .eq("id", clinic_id)
    )
    if not clinic:
        raise ValueError("Clinic not found.")
    return clinic


def _maybe_load_conversation(clinic_id: str, conversation_id: Optional[str]) -> Optional[dict[str, Any]]:
    resolved_id = _safe_text(conversation_id)
    if not resolved_id:
        return None
    return _maybe_single_data(
        get_supabase()
        .table("conversations")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("id", resolved_id)
    )


def _ensure_sms_thread_conversation(
    clinic_id: str,
    *,
    thread_key: str,
    lead_id: Optional[str],
    conversation_id: Optional[str],
) -> dict[str, Any]:
    db = get_supabase()
    conversation = _maybe_load_conversation(clinic_id, conversation_id)
    if conversation is None:
        conversation = load_or_create_conversation(
            db,
            clinic_id,
            thread_key,
            channel="sms",
        )
    updates: dict[str, Any] = {}
    if conversation.get("channel") != "sms":
        updates["channel"] = "sms"
    if lead_id and not conversation.get("lead_id"):
        updates["lead_id"] = lead_id
    if updates:
        refreshed = (
            db.table("conversations")
            .update(updates)
            .eq("clinic_id", clinic_id)
            .eq("id", conversation["id"])
            .execute()
        )
        if refreshed.data:
            conversation = refreshed.data[0]
    return conversation


def _load_sms_thread_conversation(clinic_id: str, thread_key: str) -> Optional[dict[str, Any]]:
    return _maybe_single_data(
        get_supabase()
        .table("conversations")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("session_id", thread_key)
    )


def _message_needs_human_review(message: str) -> bool:
    normalized = _safe_text(message).lower()
    if not normalized:
        return False
    if normalized in SMS_OPT_OUT_KEYWORDS:
        return True
    return any(keyword in normalized for keyword in SMS_REVIEW_KEYWORDS)


def _sms_auto_reply_block_reason(
    clinic: dict[str, Any],
    conversation: dict[str, Any],
    user_message: str,
) -> tuple[str, str]:
    clinic_id = clinic["id"]
    normalized_message = _safe_text(user_message)
    if not normalized_message:
        return "empty_message", _sms_decision_message("empty_message")
    can_send, blocked_reason = _sms_can_send(clinic_id, require_automation=True, channel="sms")
    if not can_send:
        return "automation_disabled", blocked_reason
    if not bool(clinic.get("is_live")):
        return "clinic_not_live", _sms_decision_message("clinic_not_live")
    if bool(conversation.get("manual_takeover")):
        return "manual_takeover", _sms_decision_message("manual_takeover")
    if _thread_has_pending_suggested_reply(clinic_id, _safe_text(conversation.get("session_id"))):
        return "pending_review", _sms_decision_message("pending_review")

    normalized_message = normalized_message.lower()
    if normalized_message in SMS_OPT_OUT_KEYWORDS:
        return "risky_content", "The patient sent an opt-out keyword."
    if _message_needs_human_review(user_message):
        return "risky_content", _sms_decision_message("risky_content")
    return "", ""


def _sms_thread_auto_reply_state(clinic_id: str, conversation: Optional[dict[str, Any]]) -> tuple[bool, bool]:
    if not conversation or _normalize_channel(conversation.get("channel"), "") != "sms":
        return False, False
    sms_channel = _channel_readiness_map(clinic_id).get("sms", {})
    ready = bool(
        sms_channel.get("connection_status") == "connected"
        and sms_channel.get("automation_enabled")
    )
    enabled = bool(ready and not conversation.get("manual_takeover"))
    return enabled, ready


def _assess_sms_reply_confidence(
    clinic: dict[str, Any],
    conversation: dict[str, Any],
    user_message: str,
    reply_text: str,
    result: dict[str, Any],
) -> tuple[str, str]:
    if not _safe_text(reply_text):
        return "blocked", "assistant_empty"

    prior_state = _safe_text(conversation.get("last_intent")) or "general"
    next_state = _safe_text(result.get("intent")) or prior_state
    has_existing_request = bool(conversation.get("lead_id")) or bool(result.get("lead_id"))
    intent = detect_intent(user_message)

    if _sms_reply_matches_fallback(clinic, reply_text):
        return "low", "unsupported_question"
    if is_simple_greeting(user_message):
        return "high", "safe_to_send"
    if intent == "faq":
        return (
            ("high", "safe_to_send")
            if _clinic_has_grounded_faq_context(clinic, user_message)
            else ("medium", "low_confidence")
        )
    if intent == "booking":
        if next_state.startswith("booking") or next_state == "booking_complete" or has_existing_request:
            return "high", "safe_to_send"
        return "medium", "low_confidence"
    if has_existing_request and (
        prior_state.startswith("booking")
        or prior_state == "booking_complete"
        or "?" in user_message
        or len(_safe_text(user_message).split()) >= 3
    ):
        return "high", "safe_to_send"
    if len(_safe_text(user_message).split()) <= 2:
        return "medium", "low_confidence"
    return "low", "unsupported_question"


def _update_auto_reply_state(event: dict[str, Any], *, status: str, reason: str = "") -> dict[str, Any]:
    payload = _to_json_dict(event.get("payload"))
    payload["auto_reply_status"] = status
    if reason:
        payload["auto_reply_reason"] = reason
    elif "auto_reply_reason" in payload:
        payload.pop("auto_reply_reason")
    return payload


def _thread_has_pending_suggested_reply(clinic_id: str, thread_key: str) -> bool:
    if not thread_key:
        return False
    events = _load_communication_events(clinic_id, limit=400, include_all_statuses=True)
    for event in events:
        if _safe_text(event.get("thread_key")) != thread_key:
            continue
        if _normalize_channel(event.get("channel"), "") != "sms":
            continue
        if _safe_text(event.get("direction")) != "inbound":
            continue
        if _normalize_suggested_reply_status(_payload_field(event, "suggested_reply_status")) == "pending":
            return True
    return False


def _update_sms_review_state(
    event: dict[str, Any],
    *,
    confidence: Optional[str] = None,
    reason_code: Optional[str] = None,
    auto_reply_status: Optional[str] = None,
    auto_reply_reason: Optional[str] = None,
    suggested_reply_text: Optional[str] = None,
    suggested_reply_status: Optional[str] = None,
    suggested_reply_sent_event_id: Optional[str] = None,
    pending_next_state: Optional[str] = None,
    pending_booking_data: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    payload = _to_json_dict(event.get("payload"))
    if confidence is not None:
        normalized_confidence = _normalize_sms_ai_confidence(confidence)
        if normalized_confidence:
            payload["ai_confidence"] = normalized_confidence
        else:
            payload.pop("ai_confidence", None)
    if reason_code is not None:
        resolved_reason_code = _safe_text(reason_code)
        if resolved_reason_code:
            payload["ai_decision_reason"] = resolved_reason_code
        else:
            payload.pop("ai_decision_reason", None)
    if auto_reply_status is not None:
        resolved_status = _safe_text(auto_reply_status)
        if resolved_status:
            payload["auto_reply_status"] = resolved_status
        else:
            payload.pop("auto_reply_status", None)
    if auto_reply_reason is not None:
        resolved_reason = _safe_text(auto_reply_reason)
        if resolved_reason:
            payload["auto_reply_reason"] = resolved_reason
        else:
            payload.pop("auto_reply_reason", None)
    if suggested_reply_text is not None:
        resolved_text = _safe_text(suggested_reply_text)
        if resolved_text:
            payload["suggested_reply_text"] = resolved_text
        else:
            payload.pop("suggested_reply_text", None)
    if suggested_reply_status is not None:
        normalized_status = _normalize_suggested_reply_status(suggested_reply_status)
        if normalized_status:
            payload["suggested_reply_status"] = normalized_status
        else:
            payload.pop("suggested_reply_status", None)
    if suggested_reply_sent_event_id is not None:
        resolved_sent_event = _safe_text(suggested_reply_sent_event_id)
        if resolved_sent_event:
            payload["suggested_reply_sent_event_id"] = resolved_sent_event
        else:
            payload.pop("suggested_reply_sent_event_id", None)
    if pending_next_state is not None:
        resolved_state = _safe_text(pending_next_state)
        if resolved_state:
            payload["pending_next_state"] = resolved_state
        else:
            payload.pop("pending_next_state", None)
    if pending_booking_data is not None:
        if pending_booking_data:
            payload["pending_booking_data"] = pending_booking_data
        else:
            payload.pop("pending_booking_data", None)
    return payload


def _apply_sms_conversation_progress(conversation_id: str, next_state: str, booking_data: dict[str, Any]) -> None:
    save_state(get_supabase(), conversation_id, _safe_text(next_state) or "general", BookingData.from_dict(booking_data or {}))


def _sms_review_required(event: dict[str, Any]) -> bool:
    if _normalize_channel(event.get("channel"), "") != "sms":
        return False
    if _safe_text(event.get("direction")) != "inbound":
        return False
    suggested_reply_status = _normalize_suggested_reply_status(_payload_field(event, "suggested_reply_status"))
    if suggested_reply_status == "pending":
        return True
    auto_reply_status = _safe_text(_payload_field(event, "auto_reply_status"))
    if auto_reply_status == "failed":
        return True
    confidence = _normalize_sms_ai_confidence(_payload_field(event, "ai_confidence"))
    reason_code = _safe_text(_payload_field(event, "ai_decision_reason"))
    return confidence == "blocked" and reason_code in {"risky_content", "unsupported_question"}


def _resolve_sms_thread_context(
    clinic_id: str,
    *,
    customer_name: str,
    customer_phone: str,
    customer_email: str = "",
    lead_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    source_event_id: Optional[str] = None,
) -> dict[str, Any]:
    db = get_supabase()
    source_event = None
    source_event_id = _safe_text(source_event_id)
    if source_event_id:
        source_event = _maybe_single_data(
            db.table("communication_events")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("id", source_event_id)
        )
        if source_event:
            source_event = _normalize_communication_event_row(source_event)

    matched_lead = None
    if lead_id:
        matched_lead = _maybe_single_data(
            db.table("leads")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("id", lead_id)
        )
    if matched_lead is None and customer_phone:
        matched_lead = _find_matching_lead_by_phone(clinic_id, customer_phone)

    resolved_lead_id = _safe_text((matched_lead or {}).get("id")) or _safe_text((source_event or {}).get("lead_id")) or _safe_text(lead_id)
    resolved_name = _safe_text(customer_name) or _safe_text((matched_lead or {}).get("patient_name")) or _safe_text((source_event or {}).get("customer_name")) or "Unknown customer"
    resolved_phone = _safe_text(customer_phone) or _safe_text((matched_lead or {}).get("patient_phone")) or _safe_text((source_event or {}).get("customer_phone"))
    resolved_email = _safe_text(customer_email) or _safe_text((matched_lead or {}).get("patient_email")) or _safe_text((source_event or {}).get("customer_email"))
    resolved_customer_key = (
        _safe_text((source_event or {}).get("customer_key"))
        or (_customer_key(_normalize_identity(matched_lead)) if matched_lead else "")
        or _customer_key_from_fields(resolved_name, resolved_phone, resolved_email, f"sms:{uuid4().hex}")
    )
    latest_event = _find_latest_sms_thread_event(clinic_id, resolved_phone)
    thread_key = (
        _safe_text((source_event or {}).get("thread_key"))
        or _safe_text((latest_event or {}).get("thread_key"))
        or (f"sms:lead:{resolved_lead_id}" if resolved_lead_id else "")
        or (f"sms:customer:{resolved_customer_key}" if resolved_customer_key else "")
        or (f"sms:phone:{_normalize_phone(resolved_phone)}" if _normalize_phone(resolved_phone) else "")
        or f"sms:thread:{uuid4().hex}"
    )

    return {
        "source_event": source_event,
        "lead_id": resolved_lead_id or None,
        "conversation_id": _safe_text((source_event or {}).get("conversation_id")) or _safe_text(conversation_id) or None,
        "customer_name": resolved_name,
        "customer_phone": resolved_phone,
        "customer_email": resolved_email,
        "customer_key": resolved_customer_key,
        "thread_key": thread_key,
    }


def build_inbox_items(clinic_id: str, limit: int = 100) -> list[dict[str, Any]]:
    settings = _load_frontdesk_settings(clinic_id)
    conversations, messages_by_conversation, leads_by_id = _load_conversations_for_clinic(clinic_id, limit)
    communication_events = _load_communication_events(clinic_id, limit)
    sms_conversations_by_id, sms_conversations_by_session = _load_sms_conversation_maps(clinic_id)
    readiness_by_channel = _channel_readiness_map(clinic_id)
    items: list[dict[str, Any]] = []

    event_lead_ids = {
        _safe_text(event.get("lead_id"))
        for event in communication_events
        if _safe_text(event.get("lead_id")) and _safe_text(event.get("lead_id")) not in leads_by_id
    }
    if event_lead_ids:
        db = get_supabase()
        event_leads = (
            db.table("leads")
            .select("*")
            .in_("id", list(event_lead_ids))
            .execute()
            .data
            or []
        )
        leads_by_id.update({lead["id"]: lead for lead in event_leads})

    event_conversation_ids = {
        _safe_text(event.get("conversation_id"))
        for event in communication_events
        if _safe_text(event.get("conversation_id"))
    }
    event_conversations_by_id: dict[str, dict[str, Any]] = {}
    if event_conversation_ids:
        db = get_supabase()
        event_conversations = (
            db.table("conversations")
            .select("*")
            .in_("id", list(event_conversation_ids))
            .execute()
            .data
            or []
        )
        event_conversations_by_id = {row["id"]: row for row in event_conversations}

    for conversation in conversations:
        messages = messages_by_conversation.get(conversation["id"], [])
        lead = leads_by_id.get(conversation.get("lead_id") or "")
        last_message = messages[-1] if messages else None
        updated_at = _parse_datetime((last_message or {}).get("created_at")) or _parse_datetime(conversation.get("updated_at")) or _parse_datetime(conversation.get("created_at"))
        derived_status = _derive_conversation_status(
            lead,
            updated_at,
            delay_minutes=settings["follow_up_delay_minutes"],
        )
        customer_name = (lead or {}).get("patient_name") or "Visitor"
        customer_key = _customer_key(_normalize_identity(lead)) if lead else None
        preview = (
            (last_message or {}).get("content")
            or (conversation.get("summary") or "").strip()
            or "Conversation started"
        )
        ai_auto_reply_enabled, ai_auto_reply_ready = _sms_thread_auto_reply_state(clinic_id, conversation)
        items.append(
            {
                "id": _thread_key("conversation", conversation["id"]),
                "thread_type": "conversation",
                "session_id": conversation["session_id"],
                "customer_key": customer_key,
                "customer_name": customer_name,
                "customer_phone": (lead or {}).get("patient_phone", ""),
                "customer_email": (lead or {}).get("patient_email", ""),
                "channel": _channel_for_conversation(conversation, lead),
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
                "thread_conversation_id": conversation["id"],
                "manual_takeover": bool(conversation.get("manual_takeover")),
                "ai_auto_reply_enabled": ai_auto_reply_enabled,
                "ai_auto_reply_ready": ai_auto_reply_ready,
            }
        )

    event_threads = _group_communication_threads(communication_events)
    for thread_key, thread_events in event_threads.items():
        if thread_events and all(
            _normalize_channel(event.get("channel"), "manual") == "manual"
            and _safe_text(event.get("direction")) == "internal"
            and _safe_text(event.get("event_type")) == "note"
            for event in thread_events
        ):
            continue
        primary_event = _primary_event_for_thread(thread_events)
        latest_event = thread_events[-1]
        latest_outbound = next(
            (event for event in reversed(thread_events) if _safe_text(event.get("direction")) == "outbound"),
            None,
        )
        latest_inbound_reply = _thread_latest_inbound_reply(thread_events)
        conversation_row = next(
            (
                event_conversations_by_id.get(_safe_text(event.get("conversation_id")))
                for event in reversed(thread_events)
                if event_conversations_by_id.get(_safe_text(event.get("conversation_id")))
            ),
            None,
        ) or sms_conversations_by_session.get(thread_key)
        occurred_at = _event_timestamp(latest_event)
        lead = leads_by_id.get(
            _safe_text(primary_event.get("lead_id"))
            or _safe_text(latest_event.get("lead_id"))
            or ""
        )
        derived_status = (
            _derive_conversation_status(
                lead,
                occurred_at,
                delay_minutes=settings["follow_up_delay_minutes"],
            )
            if lead
            else _derive_event_thread_status(thread_events)
        )
        ai_auto_reply_enabled, ai_auto_reply_ready = _sms_thread_auto_reply_state(clinic_id, conversation_row)
        customer_name = (
            _safe_text(latest_event.get("customer_name"))
            or _safe_text(primary_event.get("customer_name"))
            or (lead or {}).get("patient_name")
            or "Unknown customer"
        )
        items.append(
            {
                "id": _thread_key("event", thread_key),
                "thread_type": "event",
                "session_id": _safe_text(latest_event.get("external_id")) or primary_event["id"],
                "customer_key": _safe_text(primary_event.get("customer_key")) or _safe_text(latest_event.get("customer_key")),
                "customer_name": customer_name,
                "customer_phone": _safe_text(latest_event.get("customer_phone")) or _safe_text(primary_event.get("customer_phone")) or (lead or {}).get("patient_phone", ""),
                "customer_email": _safe_text(latest_event.get("customer_email")) or _safe_text(primary_event.get("customer_email")) or (lead or {}).get("patient_email", ""),
                "channel": _normalize_channel(primary_event.get("channel"), "manual"),
                "lead_id": _safe_text(primary_event.get("lead_id")) or _safe_text(latest_event.get("lead_id")) or None,
                "lead_status": (lead or {}).get("status"),
                "derived_status": derived_status,
                "last_intent": latest_event.get("event_type"),
                "summary": _safe_text(primary_event.get("summary")) or None,
                "last_message_preview": _truncate(_communication_preview(latest_event)),
                "last_message_role": _last_message_role_for_direction(_safe_text(latest_event.get("direction")) or "inbound"),
                "last_message_at": occurred_at,
                "conversation_started_at": _event_timestamp(primary_event),
                "updated_at": _parse_datetime(latest_event.get("updated_at")) or occurred_at,
                "requires_attention": derived_status == "needs_follow_up",
                "unlinked": not bool(
                    _safe_text(primary_event.get("lead_id"))
                    or _safe_text(latest_event.get("lead_id"))
                    or _safe_text(primary_event.get("conversation_id"))
                    or _safe_text(latest_event.get("conversation_id"))
                ),
                "latest_outbound_status": _safe_text((latest_outbound or {}).get("status")) or None,
                "latest_outbound_summary": _safe_text((latest_outbound or {}).get("summary")),
                "latest_outbound_reason": _safe_text((latest_outbound or {}).get("failure_reason")) or _safe_text((latest_outbound or {}).get("skipped_reason")),
                "latest_outbound_at": _parse_datetime((latest_outbound or {}).get("sent_at")) or _parse_datetime((latest_outbound or {}).get("created_at")),
                "latest_inbound_status": _safe_text((latest_inbound_reply or {}).get("status")) or None,
                "latest_inbound_summary": _safe_text((latest_inbound_reply or {}).get("summary")) or _safe_text((latest_inbound_reply or {}).get("content")),
                "latest_inbound_at": _parse_datetime((latest_inbound_reply or {}).get("occurred_at")) or _parse_datetime((latest_inbound_reply or {}).get("created_at")),
                "thread_conversation_id": (conversation_row or {}).get("id"),
                "manual_takeover": bool((conversation_row or {}).get("manual_takeover")),
                "ai_auto_reply_enabled": ai_auto_reply_enabled,
                "ai_auto_reply_ready": ai_auto_reply_ready,
            }
        )

    items.sort(
        key=lambda row: row.get("last_message_at") or row.get("updated_at") or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return items


def get_conversation_detail(clinic_id: str, conversation_id: str) -> Optional[dict[str, Any]]:
    items = build_inbox_items(clinic_id, limit=200)
    conversation = next((item for item in items if item["id"] == conversation_id), None)
    if conversation is None:
        return None

    db = get_supabase()
    messages: list[dict[str, Any]] = []
    lead = None
    communication_event = None
    related_events: list[dict[str, Any]] = []

    if conversation["thread_type"] == "conversation":
        raw_conversation_id = conversation_id
        messages = (
            db.table("conversation_messages")
            .select("*")
            .eq("conversation_id", raw_conversation_id)
            .order("created_at")
            .execute()
            .data
            or []
        )
        related_events = [
            event
            for event in _load_communication_events(clinic_id, limit=200)
            if (
                event.get("conversation_id") == raw_conversation_id
                or (conversation.get("lead_id") and event.get("lead_id") == conversation.get("lead_id"))
            )
        ]
        related_events.sort(key=_event_timestamp)
    else:
        thread_key = conversation_id.split("event:", 1)[1]
        related_events = [
            event
            for event in _load_communication_events(clinic_id, limit=400, include_all_statuses=True)
            if _safe_text(event.get("thread_key")) == thread_key
        ]
        related_events.sort(key=_event_timestamp)
        if related_events:
            communication_event = _primary_event_for_thread(related_events)
            latest_outbound = next(
                (event for event in reversed(related_events) if _safe_text(event.get("direction")) == "outbound"),
                None,
            )
            latest_inbound_reply = _thread_latest_inbound_reply(related_events)
            communication_event["latest_outbound_status"] = _safe_text((latest_outbound or {}).get("status")) or None
            communication_event["latest_outbound_summary"] = _safe_text((latest_outbound or {}).get("summary"))
            communication_event["latest_outbound_reason"] = _safe_text((latest_outbound or {}).get("failure_reason")) or _safe_text((latest_outbound or {}).get("skipped_reason"))
            communication_event["latest_outbound_at"] = _parse_datetime((latest_outbound or {}).get("sent_at")) or _parse_datetime((latest_outbound or {}).get("created_at"))
            communication_event["latest_inbound_status"] = _safe_text((latest_inbound_reply or {}).get("status")) or None
            communication_event["latest_inbound_summary"] = _safe_text((latest_inbound_reply or {}).get("summary")) or _safe_text((latest_inbound_reply or {}).get("content"))
            communication_event["latest_inbound_at"] = _parse_datetime((latest_inbound_reply or {}).get("occurred_at")) or _parse_datetime((latest_inbound_reply or {}).get("created_at"))

    if conversation.get("lead_id"):
        lead = _maybe_single_data(
            db.table("leads")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("id", conversation["lead_id"])
        )

    return {
        "thread_type": conversation["thread_type"],
        "conversation": conversation,
        "messages": messages,
        "lead": lead,
        "communication_event": communication_event,
        "related_events": related_events,
    }


def _build_customer_profile_groups(clinic_id: str) -> list[dict[str, Any]]:
    db = get_supabase()
    settings = _load_frontdesk_settings(clinic_id)
    sms_conversations_by_id, sms_conversations_by_session = _load_sms_conversation_maps(clinic_id)
    leads = (
        db.table("leads")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("updated_at", desc=True)
        .execute()
        .data
        or []
    )
    conversations, messages_by_conversation, _ = _load_conversations_for_clinic(clinic_id, limit=200)
    communication_events = _load_communication_events(clinic_id, limit=200)
    follow_up_tasks = _load_follow_up_tasks(clinic_id, include_completed=True)
    try:
        waitlist_entries = (
            db.table("waitlist_entries")
            .select("*")
            .eq("clinic_id", clinic_id)
            .order("updated_at", desc=True)
            .execute()
            .data
            or []
        )
    except Exception:
        waitlist_entries = []

    conversations_by_lead: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for conversation in conversations:
        if conversation.get("lead_id"):
            conversations_by_lead[conversation["lead_id"]].append(conversation)

    grouped: dict[str, dict[str, Any]] = {}
    lead_to_customer_key: dict[str, str] = {}

    def ensure_group(customer_key: str, *, name: str, phone: str, email: str, occurred_at: Optional[datetime] = None) -> dict[str, Any]:
        group = grouped.setdefault(
            customer_key,
            {
                "key": customer_key,
                "name": _safe_text(name) or "Unknown patient",
                "phone": _safe_text(phone),
                "email": _safe_text(email),
                "lead_count": 0,
                "booked_count": 0,
                "open_request_count": 0,
                "total_interactions": 0,
                "last_outcome": "open",
                "follow_up_needed": False,
                "last_interaction_at": occurred_at,
                "latest_note": "",
                "latest_sms_thread_id": None,
                "latest_sms_manual_takeover": False,
                "latest_sms_ai_auto_reply_enabled": False,
                "latest_sms_ai_auto_reply_ready": False,
                "latest_sms_pending_review": False,
                "latest_sms_confidence": "",
                "latest_sms_at": None,
                "recent_requests": [],
                "recent_conversations": [],
                "timeline": [],
                "conversation_ids": set(),
                "event_ids": set(),
                "lead_ids": set(),
                "active_follow_up_count": 0,
            },
        )
        if not group["phone"] and phone:
            group["phone"] = _safe_text(phone)
        if not group["email"] and email:
            group["email"] = _safe_text(email)
        if group["name"] == "Unknown patient" and _safe_text(name):
            group["name"] = _safe_text(name)
        if occurred_at and (group["last_interaction_at"] is None or occurred_at > group["last_interaction_at"]):
            group["last_interaction_at"] = occurred_at
        return group

    def update_latest_sms_state(
        group: dict[str, Any],
        *,
        thread_id: Optional[str],
        occurred_at: Optional[datetime],
        conversation_row: Optional[dict[str, Any]],
        event: Optional[dict[str, Any]] = None,
    ) -> None:
        if not thread_id or occurred_at is None:
            return
        current = group.get("latest_sms_at")
        if current is not None and occurred_at <= current:
            return
        ai_auto_reply_enabled, ai_auto_reply_ready = _sms_thread_auto_reply_state(
            clinic_id,
            conversation_row,
        )
        group["latest_sms_thread_id"] = thread_id
        group["latest_sms_manual_takeover"] = bool((conversation_row or {}).get("manual_takeover"))
        group["latest_sms_ai_auto_reply_enabled"] = ai_auto_reply_enabled
        group["latest_sms_ai_auto_reply_ready"] = ai_auto_reply_ready
        group["latest_sms_pending_review"] = bool((event or {}).get("operator_review_required"))
        group["latest_sms_confidence"] = _normalize_sms_ai_confidence((event or {}).get("ai_confidence"))
        group["latest_sms_at"] = occurred_at

    for lead in leads:
        customer_key = _customer_key(_normalize_identity(lead))
        lead_to_customer_key[lead["id"]] = customer_key
        lead_updated = _parse_datetime(lead.get("updated_at")) or _parse_datetime(lead.get("created_at"))
        group = ensure_group(
            customer_key,
            name=lead.get("patient_name") or "",
            phone=lead.get("patient_phone") or "",
            email=lead.get("patient_email") or "",
            occurred_at=lead_updated,
        )
        if lead["id"] not in group["lead_ids"]:
            group["lead_ids"].add(lead["id"])
            group["lead_count"] += 1
            if lead.get("status") == "booked":
                group["booked_count"] += 1
            if lead.get("status") in {"new", "contacted"}:
                group["open_request_count"] += 1
        note = _safe_text(lead.get("notes"))
        if note and not group["latest_note"]:
            group["latest_note"] = note
        group["recent_requests"].append(lead)
        group["total_interactions"] += 1
        group["timeline"].append(
            {
                "id": f"lead:{lead['id']}",
                "item_type": "request",
                "title": lead.get("reason_for_visit") or "Appointment request",
                "detail": lead.get("preferred_datetime_text") or lead.get("notes") or "Patient request captured.",
                "channel": _normalize_channel(lead.get("source"), "manual"),
                "status": lead.get("status"),
                "occurred_at": lead_updated,
                "lead_id": lead["id"],
            }
        )

        for conversation in conversations_by_lead.get(lead["id"], []):
            if conversation["id"] in group["conversation_ids"]:
                continue
            group["conversation_ids"].add(conversation["id"])
            messages = messages_by_conversation.get(conversation["id"], [])
            last_message = messages[-1] if messages else None
            updated_at = _parse_datetime((last_message or {}).get("created_at")) or _parse_datetime(conversation.get("updated_at"))
            if updated_at and (group["last_interaction_at"] is None or updated_at > group["last_interaction_at"]):
                group["last_interaction_at"] = updated_at
            channel = _channel_for_conversation(conversation, lead)
            preview = _truncate(
                (last_message or {}).get("content")
                or (conversation.get("summary") or "").strip()
                or "Conversation started"
            )
            group["recent_conversations"].append(
                {
                    "id": conversation["id"],
                    "thread_type": "conversation",
                    "channel": channel,
                    "derived_status": _derive_conversation_status(
                        lead,
                        updated_at,
                        delay_minutes=settings["follow_up_delay_minutes"],
                    ),
                    "last_message_preview": preview,
                    "last_message_at": updated_at,
                    "updated_at": _parse_datetime(conversation.get("updated_at")),
                    "lead_id": lead["id"],
                    "manual_takeover": bool(conversation.get("manual_takeover")),
                    "ai_auto_reply_enabled": _sms_thread_auto_reply_state(clinic_id, conversation)[0],
                }
            )
            if channel == "sms":
                update_latest_sms_state(
                    group,
                    thread_id=_thread_key("conversation", conversation["id"]),
                    occurred_at=updated_at,
                    conversation_row=conversation,
                    event=None,
                )
            group["total_interactions"] += 1
            group["timeline"].append(
                {
                    "id": f"conversation:{conversation['id']}",
                    "item_type": "conversation",
                    "title": "Chat conversation",
                    "detail": preview,
                    "channel": channel,
                    "status": _derive_conversation_status(
                        lead,
                        updated_at,
                        delay_minutes=settings["follow_up_delay_minutes"],
                    ),
                    "occurred_at": updated_at,
                    "lead_id": lead["id"],
                    "conversation_id": conversation["id"],
                    "thread_id": _thread_key("conversation", conversation["id"]),
                }
            )

    for event in communication_events:
        customer_key = event.get("customer_key") or lead_to_customer_key.get(event.get("lead_id") or "")
        if not customer_key:
            customer_key = _customer_key_from_fields(
                event.get("customer_name") or "",
                event.get("customer_phone") or "",
                event.get("customer_email") or "",
                f"event:{event['id']}",
            )
        occurred_at = _parse_datetime(event.get("occurred_at")) or _parse_datetime(event.get("created_at"))
        group = ensure_group(
            customer_key,
            name=event.get("customer_name") or "",
            phone=event.get("customer_phone") or "",
            email=event.get("customer_email") or "",
            occurred_at=occurred_at,
        )
        if event["id"] in group["event_ids"]:
            continue
        group["event_ids"].add(event["id"])
        preview = _truncate(_communication_preview(event))
        if preview and not group["latest_note"]:
            group["latest_note"] = preview
        group["total_interactions"] += 1
        if _safe_text(event.get("status")) not in {"completed", "dismissed"}:
            group["follow_up_needed"] = True
        conversation_row = (
            sms_conversations_by_id.get(_safe_text(event.get("conversation_id")))
            if _safe_text(event.get("conversation_id"))
            else sms_conversations_by_session.get(_safe_text(event.get("thread_key")))
        )
        channel = _normalize_channel(event.get("channel"), "manual")
        if channel == "sms":
            update_latest_sms_state(
                group,
                thread_id=_thread_key("event", _safe_text(event.get("thread_key")) or event["id"]),
                occurred_at=occurred_at,
                conversation_row=conversation_row,
                event=event,
            )
        group["timeline"].append(
            {
                "id": f"communication:{event['id']}",
                "item_type": "communication_event",
                "title": _communication_title(event),
                "detail": preview,
                "channel": channel,
                "status": _safe_text(event.get("status")) or "new",
                "occurred_at": occurred_at,
                "lead_id": event.get("lead_id"),
                "conversation_id": event.get("conversation_id"),
                "thread_id": _thread_key("event", _safe_text(event.get("thread_key")) or event["id"]),
                "communication_event_id": event["id"],
            }
        )

    for task in follow_up_tasks:
        customer_key = _safe_text(task.get("customer_key")) or lead_to_customer_key.get(task.get("lead_id") or "")
        if not customer_key:
            continue
        occurred_at = _parse_datetime(task.get("updated_at")) or _parse_datetime(task.get("created_at"))
        group = ensure_group(
            customer_key,
            name=task.get("customer_name") or "",
            phone="",
            email="",
            occurred_at=occurred_at,
        )
        group["total_interactions"] += 1
        if _safe_text(task.get("status")) != "completed":
            group["active_follow_up_count"] += 1
            group["follow_up_needed"] = True
        group["timeline"].append(
            {
                "id": f"followup:{task['id']}",
                "item_type": "follow_up",
                "title": task.get("title") or "Follow-up task",
                "detail": task.get("detail") or task.get("note") or "Follow-up work tracked for this customer.",
                "status": task.get("status"),
                "occurred_at": occurred_at,
                "lead_id": task.get("lead_id"),
                "conversation_id": task.get("conversation_id"),
                "thread_id": task.get("conversation_id"),
                "follow_up_task_id": task["id"],
            }
        )

    for entry in waitlist_entries:
        customer_key = _safe_text(entry.get("customer_key")) or lead_to_customer_key.get(entry.get("lead_id") or "")
        if not customer_key:
            customer_key = _customer_key_from_fields(
                entry.get("patient_name") or "",
                entry.get("patient_phone") or "",
                entry.get("patient_email") or "",
                f"waitlist:{entry['id']}",
            )
        occurred_at = _parse_datetime(entry.get("updated_at")) or _parse_datetime(entry.get("created_at"))
        group = ensure_group(
            customer_key,
            name=entry.get("patient_name") or "",
            phone=entry.get("patient_phone") or "",
            email=entry.get("patient_email") or "",
            occurred_at=occurred_at,
        )
        group["total_interactions"] += 1
        group["timeline"].append(
            {
                "id": f"waitlist:{entry['id']}",
                "item_type": "waitlist",
                "title": "Waitlist entry",
                "detail": entry.get("service_requested") or entry.get("preferred_times") or "Customer added to the waitlist.",
                "status": entry.get("status"),
                "occurred_at": occurred_at,
                "lead_id": entry.get("lead_id"),
                "waitlist_entry_id": entry["id"],
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
        profile["timeline"] = sorted(
            profile["timeline"],
            key=lambda row: row.get("occurred_at") or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )[:12]
        profile["conversation_count"] = len(profile.pop("conversation_ids"))
        profile.pop("event_ids", None)
        profile.pop("lead_ids", None)
        profile.pop("latest_sms_at", None)
        active_follow_up_count = profile.pop("active_follow_up_count", 0)
        if profile["open_request_count"] > 0 or active_follow_up_count > 0:
            profile["last_outcome"] = "open"
            profile["follow_up_needed"] = True
        elif profile["booked_count"] > 0:
            profile["last_outcome"] = "booked"
        elif profile["lead_count"] > 0 or profile["total_interactions"] > 0:
            profile["last_outcome"] = "lost"
        profiles.append(profile)

    profiles.sort(
        key=lambda row: row.get("last_interaction_at") or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return profiles


def build_customer_profiles(clinic_id: str) -> list[dict[str, Any]]:
    profiles = _build_customer_profile_groups(clinic_id)
    for profile in profiles:
        profile.pop("timeline", None)
    return profiles


def get_customer_profile(clinic_id: str, customer_key: str) -> Optional[dict[str, Any]]:
    profiles = _build_customer_profile_groups(clinic_id)
    return next((profile for profile in profiles if profile["key"] == customer_key), None)


def build_opportunities(clinic_id: str) -> list[dict[str, Any]]:
    db = get_supabase()
    settings = _load_frontdesk_settings(clinic_id)
    opportunities: list[dict[str, Any]] = []
    inbox_items = build_inbox_items(clinic_id, limit=200)
    communication_events = _load_communication_events(clinic_id, limit=200)
    latest_inbound_by_thread = _latest_thread_event_by_direction(communication_events, "inbound")
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

    for event in communication_events:
        if _safe_text(event.get("status")) in {"completed", "dismissed"}:
            continue
        if event.get("channel") not in {"missed_call", "callback_request"}:
            continue
        latest_inbound = latest_inbound_by_thread.get(_safe_text(event.get("thread_key")))
        if latest_inbound and latest_inbound["id"] != event["id"]:
            continue
        append_opportunity(
            {
                "id": f"communication:{event['id']}",
                "type": "follow_up_needed",
                "title": "Missed-call recovery is waiting"
                if event.get("channel") == "missed_call"
                else "Callback request still needs a response",
                "detail": _communication_preview(event),
                "priority": "high" if event.get("channel") == "missed_call" else "medium",
                "customer_key": event.get("customer_key"),
                "customer_name": event.get("customer_name") or "Unknown customer",
                "occurred_at": _parse_datetime(event.get("occurred_at")) or _parse_datetime(event.get("created_at")),
                "conversation_id": None,
                "lead_id": event.get("lead_id"),
                "derived_status": "needs_follow_up",
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
        if lead.get("status") == "new" and age >= timedelta(minutes=settings["follow_up_delay_minutes"]):
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
        .select("id, clinic_id, status, source, appointment_status, deposit_required, deposit_amount_cents, deposit_status, created_at, updated_at")
        .eq("clinic_id", clinic_id)
        .execute()
        .data
        or []
    )
    opportunities = build_opportunities(clinic_id)
    follow_up_tasks = _load_follow_up_tasks(clinic_id, include_completed=True)
    communication_events = _load_communication_events(clinic_id, limit=400, include_all_statuses=True)

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
    recovered_tasks = [task for task in follow_up_tasks if task.get("status") == "completed"]
    leads_by_id = {lead["id"]: lead for lead in leads}
    inbound_sms_events = [
        event
        for event in communication_events
        if _safe_text(event.get("direction")) == "inbound" and _normalize_channel(event.get("channel"), "") == "sms"
    ]
    try:
        manual_takeover_threads = sum(
            1
            for conversation in (
                db.table("conversations")
                .select("id")
                .eq("clinic_id", clinic_id)
                .eq("channel", "sms")
                .eq("manual_takeover", True)
                .execute()
                .data
                or []
            )
        )
    except Exception:
        manual_takeover_threads = 0
    estimated_value_recovered_cents = sum(
        int(leads_by_id[task["lead_id"]].get("deposit_amount_cents") or 0)
        for task in recovered_tasks
        if task.get("lead_id") in leads_by_id
    )
    deposits_requested_count = sum(1 for lead in leads if _normalize_deposit_status(lead.get("deposit_status")) == "requested")
    deposits_paid_count = sum(1 for lead in leads if _normalize_deposit_status(lead.get("deposit_status")) == "paid")
    appointments_waiting_on_deposit_count = sum(
        1
        for lead in leads
        if bool(lead.get("deposit_required"))
        and _safe_text(lead.get("appointment_status")) == "confirmed"
        and _normalize_deposit_status(lead.get("deposit_status")) not in {"paid", "waived", "not_required"}
    )

    return {
        "conversations_total": conversations_total,
        "leads_created": leads_created,
        "booked_requests": booked_requests,
        "unresolved_count": sum(1 for lead in leads if lead.get("status") in {"new", "contacted"}),
        "follow_up_needed_count": len(opportunities),
        "potential_lost_patients": len(opportunities),
        "recovered_opportunities": len(recovered_tasks),
        "estimated_value_recovered_cents": estimated_value_recovered_cents,
        "estimated_value_recovered_label": "Estimate based on completed follow-up tasks tied to booked requests with configured deposit amounts.",
        "lead_capture_rate": lead_capture_rate,
        "ai_resolution_estimate": ai_resolution_estimate,
        "ai_resolution_estimate_label": "Estimate based on conversations that reached booking completion or ended in a booked/closed request.",
        "ai_auto_handled_count": sum(
            1
            for event in inbound_sms_events
            if _normalize_sms_ai_confidence(event.get("ai_confidence")) == "high"
            and _safe_text(event.get("auto_reply_status")) in {"sent", "delivered"}
        ),
        "human_review_required_count": sum(1 for event in inbound_sms_events if event.get("operator_review_required")),
        "manual_takeover_threads": manual_takeover_threads,
        "suggested_replies_sent_count": sum(
            1
            for event in inbound_sms_events
            if _normalize_suggested_reply_status(event.get("suggested_reply_status")) in {"sent", "edited_sent"}
        ),
        "blocked_for_review_count": sum(
            1
            for event in inbound_sms_events
            if _normalize_sms_ai_confidence(event.get("ai_confidence")) == "blocked"
            and _safe_text(event.get("ai_decision_reason")) in {"risky_content", "unsupported_question"}
        ),
        "deposits_requested_count": deposits_requested_count,
        "deposits_paid_count": deposits_paid_count,
        "appointments_waiting_on_deposit_count": appointments_waiting_on_deposit_count,
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

    try:
        from app.services.knowledge_service import get_document_stats
        doc_stats = get_document_stats(clinic_id)
    except Exception:
        doc_stats = {"documents": [], "document_count": 0, "ready_count": 0, "processing_count": 0, "failed_count": 0, "total_chunks": 0}

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
        {
            "key": "uploaded_documents",
            "label": "Uploaded documents",
            "configured": doc_stats["ready_count"] > 0,
            "detail": f"{doc_stats['ready_count']} document(s) ready, {doc_stats['total_chunks']} searchable chunks" if doc_stats["ready_count"] > 0 else "No documents uploaded yet",
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
        "documents": doc_stats["documents"],
        "document_stats": {
            "total": doc_stats["document_count"],
            "ready": doc_stats["ready_count"],
            "processing": doc_stats["processing_count"],
            "failed": doc_stats["failed_count"],
            "total_chunks": doc_stats["total_chunks"],
        },
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


def _load_frontdesk_settings(clinic_id: str) -> dict[str, Any]:
    db = get_supabase()
    try:
        clinic = _maybe_single_data(
            db.table("clinics")
            .select(
                "name, phone, email, reminder_enabled, reminder_lead_hours, "
                "follow_up_automation_enabled, follow_up_delay_minutes"
            )
            .eq("id", clinic_id)
        ) or {}
    except Exception:
        clinic = _maybe_single_data(
            db.table("clinics")
            .select("name, phone, email, reminder_enabled, reminder_lead_hours")
            .eq("id", clinic_id)
        ) or {}
    return {
        "name": clinic.get("name") or "Your clinic",
        "phone": clinic.get("phone") or "",
        "email": clinic.get("email") or "",
        "reminder_enabled": bool(clinic.get("reminder_enabled")),
        "reminder_lead_hours": _safe_int(clinic.get("reminder_lead_hours"), 24),
        "follow_up_automation_enabled": bool(clinic.get("follow_up_automation_enabled")),
        "follow_up_delay_minutes": _safe_int(clinic.get("follow_up_delay_minutes"), 45),
    }


def build_reminder_previews(clinic_id: str) -> list[dict[str, Any]]:
    settings = _load_frontdesk_settings(clinic_id)
    if not settings["reminder_enabled"]:
        return []

    now = datetime.now(timezone.utc)
    db = get_supabase()
    leads = (
        db.table("leads")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("status", "booked")
        .order("appointment_starts_at")
        .execute()
        .data
        or []
    )
    previews: list[dict[str, Any]] = []
    sms_ready, sms_blocked_reason = _sms_can_send(clinic_id)
    for lead in leads:
        payload = _operation_lead_payload(
            settings["name"],
            settings["reminder_enabled"],
            settings["reminder_lead_hours"],
            lead,
        )
        if not payload["reminder_ready"] or not payload["appointment_starts_at"] or not payload["reminder_scheduled_for"]:
            continue
        if payload["reminder_status"] == "sent":
            continue
        blocked_reason = ""
        if not sms_ready:
            blocked_reason = sms_blocked_reason
        elif not _safe_text(payload["patient_phone"]):
            blocked_reason = "A patient phone number is required before an SMS reminder can be sent."
        previews.append(
            {
                "lead_id": lead["id"],
                "patient_name": payload["patient_name"],
                "patient_phone": payload["patient_phone"],
                "appointment_starts_at": payload["appointment_starts_at"],
                "reminder_scheduled_for": payload["reminder_scheduled_for"],
                "channel": _normalize_channel(lead.get("source"), "web_chat"),
                "preview": payload["reminder_preview"] or "",
                "is_due": payload["reminder_scheduled_for"] <= now,
                "can_send": payload["reminder_scheduled_for"] <= now and not blocked_reason and payload["reminder_status"] != "sent",
                "blocked_reason": blocked_reason,
            }
        )
    return previews


def _communication_event_payload(
    *,
    clinic_id: str,
    thread_key: str,
    channel: str,
    direction: str,
    event_type: str,
    status: str,
    customer_name: str,
    customer_phone: str,
    customer_email: str,
    summary: str,
    content: str,
    customer_key: Optional[str] = None,
    lead_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    waitlist_entry_id: Optional[str] = None,
    follow_up_task_id: Optional[str] = None,
    provider: str = "",
    external_id: str = "",
    provider_message_id: str = "",
    failure_reason: str = "",
    skipped_reason: str = "",
    payload: Optional[dict[str, Any]] = None,
    occurred_at: Optional[datetime] = None,
    sent_at: Optional[datetime] = None,
    delivered_at: Optional[datetime] = None,
) -> dict[str, Any]:
    timestamp = occurred_at or _current_timestamp()
    resolved_customer_key = customer_key or _customer_key_from_fields(
        customer_name,
        customer_phone,
        customer_email,
        f"{channel}:{timestamp.isoformat()}",
    )
    return {
        "clinic_id": clinic_id,
        "thread_key": thread_key,
        "channel": channel,
        "direction": direction,
        "event_type": event_type,
        "status": status,
        "customer_key": resolved_customer_key,
        "customer_name": _safe_text(customer_name) or "Unknown customer",
        "customer_phone": _safe_text(customer_phone),
        "customer_email": _safe_text(customer_email),
        "summary": _safe_text(summary),
        "content": _safe_text(content),
        "lead_id": lead_id,
        "conversation_id": conversation_id,
        "waitlist_entry_id": waitlist_entry_id,
        "follow_up_task_id": follow_up_task_id,
        "provider": provider,
        "external_id": external_id,
        "provider_message_id": provider_message_id,
        "failure_reason": failure_reason,
        "skipped_reason": skipped_reason,
        "payload": payload or {},
        "occurred_at": timestamp,
        "sent_at": sent_at,
        "delivered_at": delivered_at,
    }


def _find_inbound_sms_clinic(to_phone: str) -> str:
    normalized_to = _normalize_phone(to_phone)
    if not normalized_to:
        raise ValueError("Twilio inbound SMS did not include a valid destination number.")

    db = get_supabase()
    try:
        rows = (
            db.table("channel_connections")
            .select("clinic_id, channel, contact_value, connection_status")
            .in_("channel", ["sms", "missed_call"])
            .execute()
            .data
            or []
        )
    except Exception as exc:
        raise RuntimeError("Channel readiness is not available until the latest database migration is applied.") from exc

    exact_matches = [
        row
        for row in rows
        if _normalize_phone(row.get("contact_value") or "") == normalized_to
    ]
    exact_clinics = {row["clinic_id"] for row in exact_matches}
    if len(exact_clinics) == 1:
        return next(iter(exact_clinics))
    if len(exact_clinics) > 1:
        raise ValueError("Inbound SMS matched more than one clinic phone number.")

    connected_sms = {
        row["clinic_id"]
        for row in rows
        if row.get("channel") == "sms" and row.get("connection_status") == "connected"
    }
    if len(connected_sms) == 1:
        return next(iter(connected_sms))
    clinics = (
        db.table("clinics")
        .select("id")
        .limit(2)
        .execute()
        .data
        or []
    )
    if len(clinics) == 1:
        return clinics[0]["id"]
    raise ValueError("Inbound SMS could not be matched to a clinic. Set the SMS channel contact value to the Twilio number.")


def _upsert_inbound_reply_state(
    clinic_id: str,
    thread_key: str,
    *,
    latest_summary: str,
    latest_at: datetime,
) -> None:
    for task in _load_follow_up_tasks(clinic_id, include_completed=False):
        if _safe_text(task.get("status")) == "completed":
            continue
        if _safe_text(task.get("source_key")) != f"thread:{thread_key}":
            continue
        update_follow_up_task(
            clinic_id,
            task["id"],
            {
                "status": "open",
                "note": latest_summary,
                "due_at": latest_at,
            },
        )


async def _run_sms_auto_reply(
    clinic_id: str,
    *,
    conversation: dict[str, Any],
    inbound_event: dict[str, Any],
    user_message: str,
) -> Optional[dict[str, Any]]:
    clinic = _load_clinic_record(clinic_id)
    reason_code, blocked_reason = _sms_auto_reply_block_reason(clinic, conversation, user_message)
    if blocked_reason:
        persist_user_message(get_supabase(), conversation["id"], user_message)
        _update_communication_event_record(
            clinic_id,
            inbound_event["id"],
            {
                "payload": _update_sms_review_state(
                    inbound_event,
                    confidence="blocked",
                    reason_code=reason_code,
                    auto_reply_status="blocked",
                    auto_reply_reason=blocked_reason,
                    suggested_reply_text="",
                    suggested_reply_status="",
                    suggested_reply_sent_event_id="",
                    pending_next_state="",
                    pending_booking_data={},
                ),
            },
        )
        return None

    try:
        result = await process_conversation_turn(
            get_supabase(),
            clinic,
            conversation,
            conversation["session_id"],
            user_message,
            source="sms",
            persist_state=False,
            persist_assistant=False,
        )
    except Exception as exc:
        logger.warning("SMS auto-reply generation failed for clinic %s thread %s: %s", clinic_id, conversation.get("id"), exc)
        _update_communication_event_record(
            clinic_id,
            inbound_event["id"],
            {
                "payload": _update_sms_review_state(
                    inbound_event,
                    confidence="blocked",
                    reason_code="ai_generation_failed",
                    auto_reply_status="failed",
                    auto_reply_reason=_sms_decision_message("ai_generation_failed"),
                    suggested_reply_text="",
                    suggested_reply_status="",
                    suggested_reply_sent_event_id="",
                    pending_next_state="",
                    pending_booking_data={},
                ),
            },
        )
        return None
    reply_text = _safe_text(result.get("reply"))
    if not reply_text:
        _update_communication_event_record(
            clinic_id,
            inbound_event["id"],
            {
                "payload": _update_sms_review_state(
                    inbound_event,
                    confidence="blocked",
                    reason_code="assistant_empty",
                    auto_reply_status="blocked",
                    auto_reply_reason=_sms_decision_message("assistant_empty"),
                    suggested_reply_text="",
                    suggested_reply_status="",
                    suggested_reply_sent_event_id="",
                    pending_next_state="",
                    pending_booking_data={},
                ),
            },
        )
        return None

    confidence, confidence_reason = _assess_sms_reply_confidence(
        clinic,
        conversation,
        user_message,
        reply_text,
        result,
    )
    next_state = _safe_text(result.get("intent"))
    booking_data = result.get("booking_data") or {}

    if confidence != "high":
        _update_communication_event_record(
            clinic_id,
            inbound_event["id"],
            {
                "payload": _update_sms_review_state(
                    inbound_event,
                    confidence=confidence,
                    reason_code=confidence_reason,
                    auto_reply_status="needs_review",
                    auto_reply_reason=_sms_decision_message(confidence_reason),
                    suggested_reply_text=reply_text,
                    suggested_reply_status="pending",
                    suggested_reply_sent_event_id="",
                    pending_next_state=next_state,
                    pending_booking_data=booking_data,
                ),
            },
        )
        return None

    try:
        outbound_event = send_outbound_sms(
            clinic_id,
            customer_name=_safe_text(inbound_event.get("customer_name")),
            customer_phone=_safe_text(inbound_event.get("customer_phone")),
            customer_email=_safe_text(inbound_event.get("customer_email")),
            body=reply_text,
            summary="AI SMS reply",
            lead_id=result.get("lead_id") or inbound_event.get("lead_id"),
            conversation_id=conversation["id"],
            follow_up_task_id=inbound_event.get("follow_up_task_id"),
            source_event_id=inbound_event["id"],
            event_type="message",
            require_automation=True,
            automation_channel="sms",
            sender_kind="assistant",
        )
    except Exception as exc:
        logger.warning("SMS auto-reply send failed for clinic %s thread %s: %s", clinic_id, conversation.get("id"), exc)
        _update_communication_event_record(
            clinic_id,
            inbound_event["id"],
            {
                "lead_id": result.get("lead_id") or inbound_event.get("lead_id"),
                "payload": _update_sms_review_state(
                    inbound_event,
                    confidence="high",
                    reason_code="safe_to_send",
                    auto_reply_status="failed",
                    auto_reply_reason="The assistant reply could not be sent.",
                    suggested_reply_text=reply_text,
                    suggested_reply_status="pending",
                    suggested_reply_sent_event_id="",
                    pending_next_state=next_state,
                    pending_booking_data=booking_data,
                ),
            },
        )
        return None
    status = _safe_text(outbound_event.get("status")) or "failed"
    reason = _safe_text(outbound_event.get("failure_reason")) or _safe_text(outbound_event.get("skipped_reason"))
    if status in {"sent", "delivered"}:
        _apply_sms_conversation_progress(conversation["id"], next_state, booking_data)
    _update_communication_event_record(
        clinic_id,
        inbound_event["id"],
        {
            "lead_id": result.get("lead_id") or inbound_event.get("lead_id"),
            "payload": _update_sms_review_state(
                inbound_event,
                confidence="high",
                reason_code="safe_to_send",
                auto_reply_status=status if status in {"sent", "delivered"} else "failed",
                auto_reply_reason=reason or _sms_decision_message("safe_to_send"),
                suggested_reply_text="" if status in {"sent", "delivered"} else reply_text,
                suggested_reply_status="" if status in {"sent", "delivered"} else "pending",
                suggested_reply_sent_event_id=_safe_text(outbound_event.get("id")) if status in {"sent", "delivered"} else "",
                pending_next_state="" if status in {"sent", "delivered"} else next_state,
                pending_booking_data={} if status in {"sent", "delivered"} else booking_data,
            ),
        },
    )
    return outbound_event


async def process_inbound_twilio_sms(
    webhook_url: str,
    params: dict[str, str],
    signature: str = "",
) -> dict[str, Any]:
    settings = get_settings()
    config = get_sms_configuration()
    payload = parse_twilio_inbound_payload(params)
    if not payload["from_phone"]:
        raise ValueError("Twilio inbound SMS did not include a valid sender phone number.")
    if not payload["message_sid"]:
        raise ValueError("Twilio inbound SMS did not include a message SID.")

    signature_verified = False
    if config["configured"] and signature:
        signature_verified = validate_twilio_signature(webhook_url, params, signature)
        if settings.is_production and not signature_verified:
            raise PermissionError("Twilio signature verification failed.")
    elif settings.is_production and config["configured"]:
        raise PermissionError("Twilio signature is required in production.")

    clinic_id = _find_inbound_sms_clinic(payload["to_phone"])
    context = _resolve_sms_thread_context(
        clinic_id,
        customer_name="",
        customer_phone=payload["from_phone"],
        customer_email="",
    )
    if not context["source_event"]:
        context["source_event"] = _find_latest_sms_thread_event(clinic_id, payload["from_phone"])
    conversation = _ensure_sms_thread_conversation(
        clinic_id,
        thread_key=context["thread_key"],
        lead_id=context["lead_id"],
        conversation_id=context["conversation_id"],
    )
    context["conversation_id"] = conversation["id"]
    summary = _truncate(payload["body"], 120) or "Inbound SMS received"
    event = _create_communication_event_record(
        clinic_id,
        _communication_event_payload(
            clinic_id=clinic_id,
            thread_key=context["thread_key"],
            channel="sms",
            direction="inbound",
            event_type="message",
            status="new",
            customer_key=context["customer_key"],
            customer_name=context["customer_name"],
            customer_phone=context["customer_phone"],
            customer_email=context["customer_email"],
            summary=summary,
            content=payload["body"],
            lead_id=context["lead_id"],
            conversation_id=context["conversation_id"],
            provider="twilio",
            external_id=payload["message_sid"],
            provider_message_id=payload["message_sid"],
            payload={
                "account_sid": payload["account_sid"],
                "messaging_service_sid": payload["messaging_service_sid"],
                "to_phone": payload["to_phone"],
                "signature_verified": signature_verified,
                "from_city": payload["from_city"],
                "from_state": payload["from_state"],
                "from_country": payload["from_country"],
                "sender_kind": "patient",
            },
            occurred_at=_current_timestamp(),
        ),
    )
    _upsert_inbound_reply_state(
        clinic_id,
        event["thread_key"],
        latest_summary=summary,
        latest_at=_event_timestamp(event),
    )
    await _run_sms_auto_reply(
        clinic_id,
        conversation=conversation,
        inbound_event=event,
        user_message=payload["body"],
    )
    return event


def send_outbound_sms(
    clinic_id: str,
    *,
    customer_name: str,
    customer_phone: str,
    customer_email: str = "",
    body: str,
    summary: str,
    lead_id: Optional[str] = None,
    conversation_id: Optional[str] = None,
    follow_up_task_id: Optional[str] = None,
    source_event_id: Optional[str] = None,
    event_type: str = "message",
    require_automation: bool = False,
    automation_channel: str = "sms",
    sender_kind: str = "staff",
    persist_thread_message: bool = True,
    enqueue_retry_on_failure: bool = True,
) -> dict[str, Any]:
    if event_type not in COMMUNICATION_EVENT_TYPES:
        raise ValueError("Invalid communication event type.")

    context = _resolve_sms_thread_context(
        clinic_id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_email=customer_email,
        lead_id=lead_id,
        conversation_id=conversation_id,
        source_event_id=source_event_id,
    )
    payload = {
        "source_event_id": _safe_text(source_event_id),
        "message_kind": event_type,
        "sender_kind": sender_kind if sender_kind in MESSAGE_SENDER_KINDS else "staff",
    }
    conversation = _ensure_sms_thread_conversation(
        clinic_id,
        thread_key=context["thread_key"],
        lead_id=context["lead_id"],
        conversation_id=context["conversation_id"],
    )
    context["conversation_id"] = conversation["id"]
    can_send, blocked_reason = _sms_can_send(
        clinic_id,
        require_automation=require_automation,
        channel=automation_channel,
    )
    base_event = _communication_event_payload(
        clinic_id=clinic_id,
        thread_key=context["thread_key"],
        channel="sms",
        direction="outbound",
        event_type=event_type,
        status="queued",
        customer_key=context["customer_key"],
        customer_name=context["customer_name"],
        customer_phone=context["customer_phone"],
        customer_email=context["customer_email"],
        summary=summary,
        content=body,
        lead_id=context["lead_id"],
        conversation_id=context["conversation_id"],
        follow_up_task_id=follow_up_task_id,
        provider="twilio",
        payload=payload,
    )

    if not can_send:
        base_event["status"] = "skipped"
        base_event["skipped_reason"] = blocked_reason
        return _create_communication_event_record(clinic_id, base_event)

    queued_event = _create_communication_event_record(clinic_id, base_event)
    result = send_sms_message(context["customer_phone"], body)
    occurred_at = _current_timestamp()
    updated = _update_communication_event_record(
        clinic_id,
        queued_event["id"],
        {
            "status": result["status"],
            "provider": result["provider"],
            "provider_message_id": result["provider_message_id"],
            "failure_reason": result["failure_reason"],
            "skipped_reason": result["skipped_reason"],
            "sent_at": (
                _parse_datetime(result["sent_at"]) or occurred_at
                if result["sent_at"]
                else None
            ),
            "delivered_at": _parse_datetime(result["delivered_at"]) if result["delivered_at"] else None,
            "external_id": result["provider_message_id"],
            "occurred_at": occurred_at,
        },
    )
    if not updated:
        raise RuntimeError("Communication event could not be updated after sending.")
    logger.info(
        "sms_send_result clinic_id=%s event_id=%s status=%s lead_id=%s conversation_id=%s",
        clinic_id,
        updated.get("id"),
        updated.get("status"),
        context.get("lead_id") or "",
        context.get("conversation_id") or "",
    )
    if enqueue_retry_on_failure and _safe_text(updated.get("status")) == "failed":
        try:
            from app.services.background_jobs import enqueue_background_job

            enqueue_background_job(
                clinic_id,
                "retry_communication_event",
                {"event_id": updated["id"]},
                available_at=datetime.now(timezone.utc) + timedelta(minutes=10),
                max_attempts=3,
            )
        except Exception as exc:
            logger.error(
                "retry_job_enqueue_failed clinic_id=%s event_id=%s error=%s",
                clinic_id,
                updated.get("id"),
                exc,
            )
    source_event = None
    source_event_id = _safe_text(source_event_id)
    if source_event_id:
        source_event = _maybe_single_data(
            get_supabase()
            .table("communication_events")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("id", source_event_id)
        )
        if source_event:
            source_event = _normalize_communication_event_row(source_event)
            if (
                _normalize_channel(source_event.get("channel"), "") == "sms"
                and _safe_text(source_event.get("direction")) == "inbound"
                and _normalize_suggested_reply_status(source_event.get("suggested_reply_status")) == "pending"
            ):
                success = _safe_text(updated.get("status")) in {"sent", "delivered"}
                _update_communication_event_record(
                    clinic_id,
                    source_event_id,
                    {
                        "payload": _update_sms_review_state(
                            source_event,
                            confidence=source_event.get("ai_confidence") or "medium",
                            reason_code=source_event.get("ai_decision_reason") or "low_confidence",
                            auto_reply_status=_safe_text(updated.get("status")) or "failed",
                            auto_reply_reason=_safe_text(updated.get("failure_reason"))
                            or _safe_text(updated.get("skipped_reason"))
                            or ("Reply sent by staff." if sender_kind == "staff" else "Reply sent."),
                            suggested_reply_status=("edited_sent" if sender_kind == "staff" else "sent") if success else "pending",
                            suggested_reply_sent_event_id=_safe_text(updated.get("id")) if success else "",
                            pending_next_state="" if success else _payload_field(source_event, "pending_next_state"),
                            pending_booking_data={} if success else _to_json_dict(_to_json_dict(source_event.get("payload")).get("pending_booking_data")),
                        ),
                    },
                )
                if success and source_event.get("conversation_id"):
                    _apply_sms_conversation_progress(
                        source_event["conversation_id"],
                        _payload_field(source_event, "pending_next_state"),
                        _to_json_dict(_to_json_dict(source_event.get("payload")).get("pending_booking_data")),
                    )
    if (
        persist_thread_message
        and _safe_text(updated.get("status")) in {"sent", "delivered"}
        and context["conversation_id"]
    ):
        if payload["sender_kind"] == "assistant":
            persist_assistant_message(get_supabase(), context["conversation_id"], body)
        elif payload["sender_kind"] == "staff":
            get_supabase().table("conversation_messages").insert(
                {
                    "conversation_id": context["conversation_id"],
                    "role": "system",
                    "content": f"Staff SMS reply: {body}",
                }
            ).execute()
    return updated


def send_suggested_reply(
    clinic_id: str,
    event_id: str,
    *,
    body: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    inbound_event = _maybe_single_data(
        get_supabase()
        .table("communication_events")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("id", event_id)
    )
    if not inbound_event:
        return None
    inbound_event = _normalize_communication_event_row(inbound_event)
    if _normalize_channel(inbound_event.get("channel"), "") != "sms" or _safe_text(inbound_event.get("direction")) != "inbound":
        raise ValueError("Suggested replies are only available for inbound SMS messages.")

    suggested_status = _normalize_suggested_reply_status(inbound_event.get("suggested_reply_status"))
    if suggested_status != "pending":
        raise ValueError("There is no pending suggested reply for this message.")

    suggested_text = _safe_text(inbound_event.get("suggested_reply_text"))
    outbound_body = _safe_text(body) or suggested_text
    if not outbound_body:
        raise ValueError("Suggested reply text is empty.")

    edited = outbound_body != suggested_text
    outbound_event = send_outbound_sms(
        clinic_id,
        customer_name=_safe_text(inbound_event.get("customer_name")),
        customer_phone=_safe_text(inbound_event.get("customer_phone")),
        customer_email=_safe_text(inbound_event.get("customer_email")),
        body=outbound_body,
        summary="Edited suggested SMS reply" if edited else "Approved AI SMS reply",
        lead_id=inbound_event.get("lead_id"),
        conversation_id=inbound_event.get("conversation_id"),
        follow_up_task_id=inbound_event.get("follow_up_task_id"),
        source_event_id=inbound_event["id"],
        event_type="message",
        sender_kind="staff" if edited else "assistant",
    )
    return outbound_event


def discard_suggested_reply(clinic_id: str, event_id: str) -> Optional[dict[str, Any]]:
    inbound_event = _maybe_single_data(
        get_supabase()
        .table("communication_events")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("id", event_id)
    )
    if not inbound_event:
        return None
    inbound_event = _normalize_communication_event_row(inbound_event)
    if _normalize_channel(inbound_event.get("channel"), "") != "sms" or _safe_text(inbound_event.get("direction")) != "inbound":
        raise ValueError("Suggested replies are only available for inbound SMS messages.")
    if _normalize_suggested_reply_status(inbound_event.get("suggested_reply_status")) != "pending":
        raise ValueError("There is no pending suggested reply to discard.")
    updated = _update_communication_event_record(
        clinic_id,
        inbound_event["id"],
        {
            "payload": _update_sms_review_state(
                inbound_event,
                confidence=inbound_event.get("ai_confidence") or "medium",
                reason_code=inbound_event.get("ai_decision_reason") or "low_confidence",
                auto_reply_status="blocked",
                auto_reply_reason="Suggested reply discarded by staff.",
                suggested_reply_status="discarded",
                suggested_reply_sent_event_id="",
                pending_next_state="",
                pending_booking_data={},
            ),
        },
    )
    return updated


def _mark_reminder_delivery(lead_id: str, status: str, detail: str) -> None:
    db = get_supabase()
    payload: dict[str, Any] = {
        "reminder_note": detail[:250],
    }
    if status in {"sent", "delivered"}:
        payload["reminder_status"] = "sent"
    else:
        payload["reminder_status"] = "scheduled"
    db.table("leads").update(payload).eq("id", lead_id).execute()


def send_reminder_for_lead(clinic_id: str, lead_id: str) -> Optional[dict[str, Any]]:
    preview = next((item for item in build_reminder_previews(clinic_id) if item["lead_id"] == lead_id), None)
    if not preview:
        return None
    event = send_outbound_sms(
        clinic_id,
        customer_name=preview["patient_name"],
        customer_phone=preview["patient_phone"],
        body=preview["preview"],
        summary="Appointment reminder",
        lead_id=lead_id,
        event_type="reminder",
        sender_kind="system",
    )
    reason = _safe_text(event.get("failure_reason")) or _safe_text(event.get("skipped_reason")) or "SMS reminder sent."
    _mark_reminder_delivery(lead_id, _safe_text(event.get("status")) or "sent", reason)
    return event


def retry_communication_event(clinic_id: str, event_id: str) -> Optional[dict[str, Any]]:
    event = _maybe_single_data(
        get_supabase()
        .table("communication_events")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("id", event_id)
    )
    if not event:
        return None
    event = _normalize_communication_event_row(event)
    if _safe_text(event.get("direction")) != "outbound":
        raise ValueError("Only outbound communication events can be retried.")
    if _normalize_channel(event.get("channel"), "") != "sms":
        raise ValueError("Only failed outbound SMS events can be retried.")
    if _safe_text(event.get("status")) != "failed":
        raise ValueError("Only failed outbound SMS events can be retried.")

    payload = _to_json_dict(event.get("payload"))
    retried_event = send_outbound_sms(
        clinic_id,
        customer_name=_safe_text(event.get("customer_name")),
        customer_phone=_safe_text(event.get("customer_phone")),
        customer_email=_safe_text(event.get("customer_email")),
        body=_safe_text(event.get("content")),
        summary=_safe_text(event.get("summary")) or "Retried SMS send",
        lead_id=event.get("lead_id"),
        conversation_id=event.get("conversation_id"),
        follow_up_task_id=event.get("follow_up_task_id"),
        source_event_id=_safe_text(payload.get("source_event_id")) or event["id"],
        event_type=_safe_text(event.get("event_type")) or "message",
        sender_kind=_safe_text(payload.get("sender_kind")) or "system",
        persist_thread_message=_safe_text(event.get("event_type")) != "deposit_request",
        enqueue_retry_on_failure=False,
    )
    _update_communication_event_record(
        clinic_id,
        event["id"],
        {
            "payload": {
                **payload,
                "retry_attempted_at": _current_timestamp().isoformat(),
                "retry_event_id": _safe_text(retried_event.get("id")),
                "retry_status": _safe_text(retried_event.get("status")) or "failed",
            }
        },
    )
    return retried_event


def send_due_reminders(clinic_id: str) -> dict[str, Any]:
    due_items = [item for item in build_reminder_previews(clinic_id) if item["is_due"]]
    events: list[dict[str, Any]] = []
    for item in due_items:
        event = send_reminder_for_lead(clinic_id, item["lead_id"])
        if event:
            events.append(event)
    return {
        "processed_count": len(due_items),
        "sent_count": sum(1 for event in events if _safe_text(event.get("status")) in {"sent", "delivered"}),
        "failed_count": sum(1 for event in events if _safe_text(event.get("status")) == "failed"),
        "skipped_count": sum(1 for event in events if _safe_text(event.get("status")) == "skipped"),
        "events": events,
    }


def _create_internal_deposit_event(
    clinic_id: str,
    *,
    lead: dict[str, Any],
    customer_key: str,
    customer_name: str,
    customer_phone: str,
    customer_email: str,
    conversation_id: Optional[str],
    checkout_url: str,
    amount_cents: int,
) -> dict[str, Any]:
    return _create_communication_event_record(
        clinic_id,
        _communication_event_payload(
            clinic_id=clinic_id,
            thread_key=f"lead:{lead['id']}:deposit",
            channel="manual",
            direction="internal",
            event_type="deposit_request",
            status="completed",
            customer_key=customer_key,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_email=customer_email,
            summary="Deposit link created for manual sharing",
            content=checkout_url,
            lead_id=lead["id"],
            conversation_id=conversation_id,
            payload={
                "amount_cents": amount_cents,
                "sender_kind": "system",
            },
            occurred_at=_current_timestamp(),
        ),
    )


def request_appointment_deposit(
    clinic_id: str,
    lead_id: str,
    *,
    amount_cents: int,
    send_sms: bool = True,
) -> Optional[dict[str, Any]]:
    try:
        db = get_supabase()
        lead = _maybe_single_data(
            db.table("leads")
            .select(
                "id, clinic_id, patient_name, patient_phone, patient_email, reason_for_visit, preferred_datetime_text, "
                "status, appointment_status, appointment_starts_at, appointment_ends_at, reminder_status, reminder_scheduled_for, "
                "reminder_note, deposit_required, deposit_amount_cents, deposit_status, deposit_checkout_session_id, "
                "deposit_payment_intent_id, deposit_requested_at, deposit_paid_at, source, notes, created_at, updated_at"
            )
            .eq("clinic_id", clinic_id)
            .eq("id", lead_id)
        )
        if not lead:
            return None
        if _safe_text(lead.get("status")) != "booked" or _safe_text(lead.get("appointment_status")) != "confirmed":
            raise ValueError("Only confirmed booked appointments can request a deposit.")
        if amount_cents <= 0:
            raise ValueError("Add a deposit amount greater than zero.")
        if _normalize_deposit_status(lead.get("deposit_status")) == "paid":
            raise ValueError("This appointment deposit has already been paid.")

        clinic = _maybe_single_data(
            db.table("clinics")
            .select("id, name, phone, email")
            .eq("id", clinic_id)
        ) or {}
        ready, blocked_reason = stripe_ready_for_payments()
        if not ready:
            raise RuntimeError(blocked_reason)

        success_url, cancel_url = _deposit_checkout_urls(lead_id)
        checkout = create_deposit_checkout_session(
            clinic,
            lead,
            amount_cents,
            success_url,
            cancel_url,
        )

        requested_at = _current_timestamp().isoformat()
        update_payload = {
            "deposit_required": True,
            "deposit_amount_cents": amount_cents,
            "deposit_status": "requested",
            "deposit_checkout_session_id": checkout["checkout_session_id"],
            "deposit_payment_intent_id": checkout["payment_intent_id"],
            "deposit_requested_at": requested_at,
            "deposit_paid_at": None,
        }
        result = (
            db.table("leads")
            .update(update_payload)
            .eq("clinic_id", clinic_id)
            .eq("id", lead_id)
            .execute()
        )
        updated_lead = result.data[0] if result.data else None
        if not updated_lead:
            return None

        latest_conversation = _load_latest_conversations_by_lead(clinic_id).get(lead_id) or {}
        customer_name = _safe_text(lead.get("patient_name")) or "Unknown patient"
        customer_phone = _safe_text(lead.get("patient_phone"))
        customer_email = _safe_text(lead.get("patient_email"))
        customer_key = _customer_key(_normalize_identity(lead))
        communication_event: Optional[dict[str, Any]] = None
        sms_delivery_status = ""
        response_blocked_reason = ""

        if send_sms and customer_phone:
            communication_event = send_outbound_sms(
                clinic_id,
                customer_name=customer_name,
                customer_phone=customer_phone,
                customer_email=customer_email,
                body=_deposit_request_sms_body(
                    _safe_text(clinic.get("name")) or "Clinic AI",
                    customer_name,
                    checkout["checkout_url"],
                    amount_cents,
                ),
                summary="Appointment deposit request",
                lead_id=lead_id,
                conversation_id=latest_conversation.get("id"),
                event_type="deposit_request",
                sender_kind="system",
                persist_thread_message=False,
            )
            sms_delivery_status = _safe_text(communication_event.get("status"))
            response_blocked_reason = (
                _safe_text(communication_event.get("failure_reason"))
                or _safe_text(communication_event.get("skipped_reason"))
            )
        elif send_sms:
            communication_event = _create_communication_event_record(
                clinic_id,
                _communication_event_payload(
                    clinic_id=clinic_id,
                    thread_key=f"lead:{lead_id}:deposit",
                    channel="sms",
                    direction="outbound",
                    event_type="deposit_request",
                    status="skipped",
                    customer_key=customer_key,
                    customer_name=customer_name,
                    customer_phone=customer_phone,
                    customer_email=customer_email,
                    summary="Appointment deposit request",
                    content=checkout["checkout_url"],
                    lead_id=lead_id,
                    conversation_id=latest_conversation.get("id"),
                    skipped_reason="A patient phone number is required before the deposit link can be sent by SMS.",
                    payload={"amount_cents": amount_cents, "sender_kind": "system"},
                    occurred_at=_current_timestamp(),
                ),
            )
            sms_delivery_status = "skipped"
            response_blocked_reason = "A patient phone number is required before the deposit link can be sent by SMS."
        else:
            communication_event = _create_internal_deposit_event(
                clinic_id,
                lead=updated_lead,
                customer_key=customer_key,
                customer_name=customer_name,
                customer_phone=customer_phone,
                customer_email=customer_email,
                conversation_id=latest_conversation.get("id"),
                checkout_url=checkout["checkout_url"],
                amount_cents=amount_cents,
            )
            sms_delivery_status = "manual_only"

        return {
            "lead": updated_lead,
            "checkout_url": checkout["checkout_url"],
            "communication_event": communication_event,
            "sms_delivery_status": sms_delivery_status,
            "blocked_reason": response_blocked_reason,
        }
    except (ValueError, RuntimeError):
        raise
    except Exception as exc:
        raise RuntimeError("Deposit requests are not available until the latest database migration is applied.") from exc


def mark_appointment_deposit_not_required(
    clinic_id: str,
    lead_id: str,
) -> Optional[dict[str, Any]]:
    try:
        result = (
            get_supabase()
            .table("leads")
            .update(
                {
                    "deposit_required": False,
                    "deposit_amount_cents": None,
                    "deposit_status": "not_required",
                    "deposit_checkout_session_id": "",
                    "deposit_payment_intent_id": "",
                    "deposit_requested_at": None,
                    "deposit_paid_at": None,
                }
            )
            .eq("clinic_id", clinic_id)
            .eq("id", lead_id)
            .execute()
        )
    except Exception as exc:
        raise RuntimeError("Deposit requests are not available until the latest database migration is applied.") from exc
    return result.data[0] if result.data else None


def send_missed_call_text_back(
    clinic_id: str,
    event_id: str,
    *,
    require_automation: bool = False,
) -> Optional[dict[str, Any]]:
    event = _maybe_single_data(
        get_supabase()
        .table("communication_events")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("id", event_id)
    )
    if not event:
        return None
    if _normalize_channel(event.get("channel"), "") != "missed_call":
        raise ValueError("Only missed-call recovery items can send a text-back.")

    clinic = _load_frontdesk_settings(clinic_id)
    outbound = send_outbound_sms(
        clinic_id,
        customer_name=_safe_text(event.get("customer_name")) or "Unknown customer",
        customer_phone=_safe_text(event.get("customer_phone")),
        customer_email=_safe_text(event.get("customer_email")),
        body=_missed_call_text_back_preview(clinic["name"]),
        summary="Missed-call text-back",
        lead_id=event.get("lead_id"),
        conversation_id=event.get("conversation_id"),
        follow_up_task_id=event.get("follow_up_task_id"),
        source_event_id=event_id,
        event_type="text_back",
        require_automation=require_automation,
        automation_channel="missed_call",
        sender_kind="assistant",
    )
    update_status = _safe_text(outbound.get("status")) or "failed"
    if update_status in {"sent", "delivered"}:
        update_status = "attempted"
    _update_communication_event_record(
        clinic_id,
        event_id,
        {
            "status": update_status,
        },
    )
    return outbound


def run_auto_follow_up_tasks(clinic_id: str, force: bool = False) -> dict[str, Any]:
    settings = _load_frontdesk_settings(clinic_id)
    if not force and not settings["follow_up_automation_enabled"]:
        return {"created_count": 0, "tasks": []}

    delay_minutes = settings["follow_up_delay_minutes"]
    now = datetime.now(timezone.utc)
    created_tasks: list[dict[str, Any]] = []

    for opportunity in build_opportunities(clinic_id):
        if opportunity.get("follow_up_task_id"):
            continue
        occurred_at = _parse_datetime(opportunity.get("occurred_at")) or now
        if occurred_at > now - timedelta(minutes=delay_minutes):
            continue
        task = create_follow_up_task(
            clinic_id=clinic_id,
            source_key=opportunity["id"],
            task_type=opportunity["type"],
            priority=opportunity["priority"],
            title=opportunity["title"],
            detail=opportunity["detail"],
            customer_key=opportunity.get("customer_key"),
            customer_name=opportunity.get("customer_name") or "Unknown patient",
            lead_id=opportunity.get("lead_id"),
            conversation_id=opportunity.get("conversation_id"),
            auto_generated=True,
            due_at=occurred_at + timedelta(minutes=delay_minutes),
            status="open",
        )
        created_tasks.append(task)

    return {
        "created_count": len(created_tasks),
        "tasks": created_tasks,
    }


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
    auto_generated: bool = False,
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
        "auto_generated": auto_generated,
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
            if existing.get("status") == "completed" and auto_generated:
                payload["status"] = "completed"
            update_payload = {k: v for k, v in payload.items() if k != "clinic_id"}
            try:
                result = (
                    db.table("follow_up_tasks")
                    .update(update_payload)
                    .eq("clinic_id", clinic_id)
                    .eq("id", existing["id"])
                    .execute()
                )
            except Exception as exc:
                if "auto_generated" not in str(exc):
                    raise
                update_payload.pop("auto_generated", None)
                result = (
                    db.table("follow_up_tasks")
                    .update(update_payload)
                    .eq("clinic_id", clinic_id)
                    .eq("id", existing["id"])
                    .execute()
                )
            return result.data[0]
        try:
            result = db.table("follow_up_tasks").insert(payload).execute()
        except Exception as exc:
            if "auto_generated" not in str(exc):
                raise
            payload.pop("auto_generated", None)
            result = db.table("follow_up_tasks").insert(payload).execute()
    except Exception as exc:
        raise RuntimeError("Follow-up tasks are not available until the latest database migration is applied.") from exc
    task = result.data[0]
    task.setdefault("auto_generated", auto_generated)
    return task


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
        "deposit_status": _normalize_deposit_status(lead.get("deposit_status")),
        "deposit_requested_at": _parse_datetime(lead.get("deposit_requested_at")),
        "deposit_paid_at": _parse_datetime(lead.get("deposit_paid_at")),
        "updated_at": _parse_datetime(lead.get("updated_at")),
    }


def _complete_lead_follow_up_tasks(
    clinic_id: str,
    lead_id: str,
    *,
    note: str = "",
) -> None:
    for task in _load_follow_up_tasks(clinic_id, include_completed=False):
        if _safe_text(task.get("status")) == "completed":
            continue
        if _safe_text(task.get("lead_id")) != lead_id:
            continue
        update_follow_up_task(
            clinic_id,
            task["id"],
            {
                "status": "completed",
                "note": _merge_note_text(_safe_text(task.get("note")), note),
            },
        )


def _appointment_reminder_blocked_reason(
    clinic_id: str,
    settings: dict[str, Any],
    payload: dict[str, Any],
) -> str:
    if not settings["reminder_enabled"]:
        return "Reminder delivery is turned off for this clinic."
    if payload["appointment_status"] != "confirmed":
        return "Confirm the appointment before reminder prep can start."
    if not payload["appointment_starts_at"]:
        return "Add an appointment date and time before reminder prep can start."
    if not _safe_text(payload["patient_phone"]):
        return "A patient phone number is required before an SMS reminder can be sent."
    sms_ready, sms_blocked_reason = _sms_can_send(clinic_id)
    if not sms_ready:
        return sms_blocked_reason
    return ""


def _appointment_needs_attention(payload: dict[str, Any], blocked_reason: str) -> bool:
    appointment_status = _safe_text(payload.get("appointment_status"))
    lead_status = _safe_text(payload.get("lead_status"))
    deposit_status = _normalize_deposit_status(payload.get("deposit_status"))
    appointment_starts_at = payload.get("appointment_starts_at")
    now = datetime.now(timezone.utc)
    if appointment_status in {"cancel_requested", "reschedule_requested", "no_show"}:
        return True
    if payload.get("follow_up_open"):
        return True
    if payload.get("deposit_required") and deposit_status not in {"paid", "waived", "not_required"}:
        return True
    if payload.get("reminder_ready") and _safe_text(payload.get("reminder_status")) != "sent":
        return True
    if blocked_reason:
        return True
    if appointment_status == "confirmed" and appointment_starts_at and appointment_starts_at < now and lead_status == "booked":
        return True
    return False


def _appointment_matches_view(payload: dict[str, Any], view: str) -> bool:
    if view == "all":
        return True
    now = datetime.now(timezone.utc)
    appointment_status = _safe_text(payload.get("appointment_status"))
    appointment_starts_at = payload.get("appointment_starts_at")
    if view == "upcoming":
        return (
            appointment_status == "confirmed"
            and appointment_starts_at is not None
            and appointment_starts_at >= now
        )
    if view == "attention":
        return bool(payload.get("needs_attention"))
    if view == "past":
        return appointment_status == "completed" or (
            appointment_status == "confirmed"
            and appointment_starts_at is not None
            and appointment_starts_at < now
        )
    if view == "cancelled":
        return appointment_status in {"cancel_requested", "reschedule_requested", "cancelled", "no_show"}
    return True


def _load_latest_communication_events_by_lead(
    clinic_id: str,
    *,
    event_type: str,
) -> dict[str, dict[str, Any]]:
    if event_type not in COMMUNICATION_EVENT_TYPES:
        return {}
    try:
        rows = (
            get_supabase()
            .table("communication_events")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("event_type", event_type)
            .order("occurred_at", desc=True)
            .limit(400)
            .execute()
            .data
            or []
        )
    except Exception:
        return {}

    by_lead: dict[str, dict[str, Any]] = {}
    for row in rows:
        lead_id = _safe_text(row.get("lead_id"))
        if not lead_id or lead_id in by_lead:
            continue
        by_lead[lead_id] = _normalize_communication_event_row(row)
    return by_lead


def _deposit_delivery_reason(event: Optional[dict[str, Any]]) -> str:
    if not event:
        return ""
    return (
        _safe_text(event.get("failure_reason"))
        or _safe_text(event.get("skipped_reason"))
        or _safe_text(event.get("summary"))
    )


def _deposit_checkout_urls(lead_id: str) -> tuple[str, str]:
    settings = get_settings()
    base_url = settings.frontend_app_url.rstrip("/")
    success_url = f"{base_url}/dashboard/appointments?deposit=success&lead_id={lead_id}"
    cancel_url = f"{base_url}/dashboard/appointments?deposit=cancelled&lead_id={lead_id}"
    return success_url, cancel_url


def _deposit_request_sms_body(
    clinic_name: str,
    patient_name: str,
    checkout_url: str,
    amount_cents: int,
) -> str:
    amount = f"${amount_cents / 100:.2f}"
    greeting_name = _safe_text(patient_name).split(" ")[0]
    greeting = f"Hi {greeting_name}," if greeting_name else "Hi,"
    return (
        f"{greeting} {clinic_name} requested a {amount} booking deposit to confirm your appointment. "
        f"Pay here: {checkout_url} Reply if you need help."
    )


def build_appointments(clinic_id: str, view: str = "all") -> list[dict[str, Any]]:
    normalized_view = view if view in APPOINTMENT_VIEWS else "all"
    db = get_supabase()
    settings = _load_frontdesk_settings(clinic_id)
    leads = (
        db.table("leads")
        .select("*")
        .eq("clinic_id", clinic_id)
        .order("appointment_starts_at")
        .execute()
        .data
        or []
    )
    latest_conversations = _load_latest_conversations_by_lead(clinic_id)
    latest_deposit_events = _load_latest_communication_events_by_lead(
        clinic_id,
        event_type="deposit_request",
    )
    follow_up_tasks = _load_follow_up_tasks(clinic_id, include_completed=False)
    open_follow_up_by_lead: dict[str, dict[str, Any]] = {}
    for task in follow_up_tasks:
        lead_id = _safe_text(task.get("lead_id"))
        if not lead_id:
            continue
        if _safe_text(task.get("status")) == "completed":
            continue
        current = open_follow_up_by_lead.get(lead_id)
        if current is None or _event_timestamp(task) > _event_timestamp(current):
            open_follow_up_by_lead[lead_id] = task

    appointments: list[dict[str, Any]] = []
    for lead in leads:
        appointment_status = _safe_text(lead.get("appointment_status")) or "request_open"
        if _safe_text(lead.get("status")) != "booked" and appointment_status == "request_open":
            continue
        payload = _operation_lead_payload(
            settings["name"],
            settings["reminder_enabled"],
            settings["reminder_lead_hours"],
            lead,
        )
        reminder_blocked_reason = _appointment_reminder_blocked_reason(
            clinic_id,
            settings,
            payload,
        ) if payload["reminder_status"] != "sent" else ""
        follow_up = open_follow_up_by_lead.get(lead["id"])
        latest_conversation = latest_conversations.get(lead["id"]) or {}
        latest_deposit_event = latest_deposit_events.get(lead["id"]) or {}
        source = _normalize_channel(
            latest_conversation.get("channel") or lead.get("source"),
            _normalize_channel(lead.get("source"), "web_chat"),
        )
        customer_key = _customer_key(_normalize_identity(lead))
        record = {
            "lead_id": lead["id"],
            "customer_key": customer_key,
            "thread_id": _thread_key("conversation", latest_conversation["id"]) if latest_conversation.get("id") else None,
            "patient_name": payload["patient_name"],
            "patient_phone": payload["patient_phone"],
            "patient_email": payload["patient_email"],
            "reason_for_visit": payload["reason_for_visit"],
            "preferred_datetime_text": payload["preferred_datetime_text"],
            "source": source,
            "lead_status": payload["lead_status"],
            "appointment_status": payload["appointment_status"],
            "appointment_starts_at": payload["appointment_starts_at"],
            "appointment_ends_at": payload["appointment_ends_at"],
            "reminder_status": payload["reminder_status"],
            "reminder_scheduled_for": payload["reminder_scheduled_for"],
            "reminder_ready": bool(payload["reminder_ready"]) and not reminder_blocked_reason,
            "reminder_blocked_reason": reminder_blocked_reason,
            "deposit_required": payload["deposit_required"],
            "deposit_amount_cents": payload["deposit_amount_cents"],
            "deposit_status": payload["deposit_status"],
            "deposit_requested_at": payload["deposit_requested_at"],
            "deposit_paid_at": payload["deposit_paid_at"],
            "deposit_request_delivery_status": (
                _safe_text(latest_deposit_event.get("status"))
                if _normalize_channel(latest_deposit_event.get("channel"), "manual") == "sms"
                else ""
            ),
            "deposit_request_delivery_reason": _deposit_delivery_reason(latest_deposit_event),
            "follow_up_open": follow_up is not None,
            "follow_up_task_id": (follow_up or {}).get("id"),
            "notes": _safe_text(lead.get("notes")),
            "updated_at": payload["updated_at"],
        }
        record["needs_attention"] = _appointment_needs_attention(record, reminder_blocked_reason)
        if _appointment_matches_view(record, normalized_view):
            appointments.append(record)

    appointments.sort(
        key=lambda item: item["updated_at"] or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    appointments.sort(
        key=lambda item: (
            0 if item["appointment_starts_at"] else 1,
            item["appointment_starts_at"] or datetime.max.replace(tzinfo=timezone.utc),
        )
    )
    return appointments


def build_communication_queue(clinic_id: str) -> list[dict[str, Any]]:
    events = _load_communication_events(clinic_id, limit=200, include_all_statuses=True)
    sms_conversations_by_id, sms_conversations_by_session = _load_sms_conversation_maps(clinic_id)
    latest_outbound_by_source = _latest_related_outbound_events(events)
    latest_inbound_by_thread = _latest_thread_event_by_direction(events, "inbound")
    queue = [
        {
            **event,
            "summary": _safe_text(event.get("summary")),
            "content": _safe_text(event.get("content")),
            "latest_outbound_status": _safe_text((latest_outbound_by_source.get(event["id"]) or {}).get("status")) or None,
            "latest_outbound_summary": _safe_text((latest_outbound_by_source.get(event["id"]) or {}).get("summary")),
            "latest_outbound_reason": _safe_text((latest_outbound_by_source.get(event["id"]) or {}).get("failure_reason"))
            or _safe_text((latest_outbound_by_source.get(event["id"]) or {}).get("skipped_reason")),
            "latest_outbound_at": _parse_datetime((latest_outbound_by_source.get(event["id"]) or {}).get("sent_at"))
            or _parse_datetime((latest_outbound_by_source.get(event["id"]) or {}).get("created_at")),
            "latest_inbound_status": (
                _safe_text((latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("status"))
                if (latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("id") != event["id"]
                else None
            ) or None,
            "latest_inbound_summary": (
                _safe_text((latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("summary"))
                or _safe_text((latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("content"))
            ) if (latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("id") != event["id"] else "",
            "latest_inbound_at": (
                _parse_datetime((latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("occurred_at"))
                or _parse_datetime((latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("created_at"))
            ) if (latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("id") != event["id"] else None,
            "ai_confidence": _normalize_sms_ai_confidence(
                (latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("ai_confidence")
            ),
            "ai_decision_reason": _safe_text(
                (latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("ai_decision_reason")
            ),
            "suggested_reply_text": _safe_text(
                (latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("suggested_reply_text")
            ),
            "suggested_reply_status": _normalize_suggested_reply_status(
                (latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("suggested_reply_status")
            ),
            "suggested_reply_sent_event_id": _safe_text(
                (latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("suggested_reply_sent_event_id")
            ),
            "manual_takeover": bool(
                (
                    sms_conversations_by_id.get(_safe_text(event.get("conversation_id")))
                    or sms_conversations_by_session.get(_safe_text(event.get("thread_key")))
                    or {}
                ).get("manual_takeover")
            ),
            "ai_auto_reply_enabled": _sms_thread_auto_reply_state(
                clinic_id,
                sms_conversations_by_id.get(_safe_text(event.get("conversation_id")))
                or sms_conversations_by_session.get(_safe_text(event.get("thread_key"))),
            )[0],
            "ai_auto_reply_ready": _sms_thread_auto_reply_state(
                clinic_id,
                sms_conversations_by_id.get(_safe_text(event.get("conversation_id")))
                or sms_conversations_by_session.get(_safe_text(event.get("thread_key"))),
            )[1],
            "operator_review_required": bool(
                (latest_inbound_by_thread.get(_safe_text(event.get("thread_key"))) or {}).get("operator_review_required")
            ),
        }
        for event in events
        if event.get("channel") in {"missed_call", "callback_request"}
        and _safe_text(event.get("status")) not in {"completed", "dismissed"}
    ]
    queue.sort(
        key=lambda row: _parse_datetime(row.get("occurred_at")) or _parse_datetime(row.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return queue


def build_sms_review_queue(clinic_id: str) -> list[dict[str, Any]]:
    events = _load_communication_events(clinic_id, limit=400, include_all_statuses=True)
    sms_conversations_by_id, sms_conversations_by_session = _load_sms_conversation_maps(clinic_id)
    latest_by_thread: dict[str, dict[str, Any]] = {}
    for event in events:
        if _normalize_channel(event.get("channel"), "") != "sms":
            continue
        if _safe_text(event.get("direction")) != "inbound":
            continue
        if not event.get("operator_review_required"):
            continue
        thread_key = _safe_text(event.get("thread_key"))
        current = latest_by_thread.get(thread_key)
        if current is None or _event_timestamp(event) > _event_timestamp(current):
            latest_by_thread[thread_key] = event

    queue: list[dict[str, Any]] = []
    for event in latest_by_thread.values():
        conversation_row = (
            sms_conversations_by_id.get(_safe_text(event.get("conversation_id")))
            or sms_conversations_by_session.get(_safe_text(event.get("thread_key")))
        )
        ai_auto_reply_enabled, ai_auto_reply_ready = _sms_thread_auto_reply_state(clinic_id, conversation_row)
        queue.append(
            {
                **event,
                "manual_takeover": bool((conversation_row or {}).get("manual_takeover")),
                "ai_auto_reply_enabled": ai_auto_reply_enabled,
                "ai_auto_reply_ready": ai_auto_reply_ready,
            }
        )

    queue.sort(
        key=lambda row: _parse_datetime(row.get("occurred_at")) or _parse_datetime(row.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return queue


def _empty_outbound_activity() -> dict[str, Any]:
    return {
        "outbound_sms_total": 0,
        "reminders_sent": 0,
        "missed_call_texts_sent": 0,
        "ai_replies_sent": 0,
        "ai_reply_failures": 0,
        "failed_sends": 0,
        "skipped_sends": 0,
        "human_review_required": 0,
        "suggested_replies_sent": 0,
        "blocked_for_review": 0,
        "manual_takeover_threads": 0,
    }


def _build_outbound_activity(clinic_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    events = [
        event
        for event in _load_communication_events(clinic_id, limit=200, include_all_statuses=True)
        if _safe_text(event.get("direction")) == "outbound" and _normalize_channel(event.get("channel"), "") == "sms"
    ]
    inbound_sms_events = [
        event
        for event in _load_communication_events(clinic_id, limit=400, include_all_statuses=True)
        if _safe_text(event.get("direction")) == "inbound" and _normalize_channel(event.get("channel"), "") == "sms"
    ]
    events.sort(
        key=lambda row: _parse_datetime(row.get("sent_at")) or _parse_datetime(row.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    try:
        manual_takeover_threads = sum(
            1
            for conversation in (
                get_supabase()
                .table("conversations")
                .select("id")
                .eq("clinic_id", clinic_id)
                .eq("channel", "sms")
                .eq("manual_takeover", True)
                .execute()
                .data
                or []
            )
        )
    except Exception:
        manual_takeover_threads = 0

    summary = {
        "outbound_sms_total": len(events),
        "reminders_sent": sum(
            1
            for event in events
            if _safe_text(event.get("event_type")) == "reminder"
            and _safe_text(event.get("status")) in {"sent", "delivered"}
        ),
        "missed_call_texts_sent": sum(
            1
            for event in events
            if _safe_text(event.get("event_type")) == "text_back"
            and _safe_text(event.get("status")) in {"sent", "delivered"}
        ),
        "ai_replies_sent": sum(
            1
            for event in events
            if _payload_field(event, "sender_kind") == "assistant"
            and _safe_text(event.get("event_type")) == "message"
            and _safe_text(event.get("status")) in {"sent", "delivered"}
        ),
        "ai_reply_failures": sum(
            1
            for event in events
            if _payload_field(event, "sender_kind") == "assistant"
            and _safe_text(event.get("event_type")) == "message"
            and _safe_text(event.get("status")) in {"failed", "skipped"}
        ),
        "failed_sends": sum(1 for event in events if _safe_text(event.get("status")) == "failed"),
        "skipped_sends": sum(1 for event in events if _safe_text(event.get("status")) == "skipped"),
        "human_review_required": sum(1 for event in inbound_sms_events if event.get("operator_review_required")),
        "suggested_replies_sent": sum(
            1
            for event in inbound_sms_events
            if _normalize_suggested_reply_status(event.get("suggested_reply_status")) in {"sent", "edited_sent"}
        ),
        "blocked_for_review": sum(
            1
            for event in inbound_sms_events
            if _normalize_sms_ai_confidence(event.get("ai_confidence")) == "blocked"
            and _safe_text(event.get("ai_decision_reason")) in {"risky_content", "unsupported_question"}
        ),
        "manual_takeover_threads": manual_takeover_threads,
    }
    return summary, events[:12]


def build_operations_overview(clinic_id: str) -> dict[str, Any]:
    db = get_supabase()
    clinic = _load_frontdesk_settings(clinic_id)
    reminder_enabled = clinic["reminder_enabled"]
    reminder_lead_hours = clinic["reminder_lead_hours"]

    try:
        leads: list[dict[str, Any]] = (
            db.table("leads")
            .select("*")
            .eq("clinic_id", clinic_id)
            .order("updated_at", desc=True)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.warning("operations_overview: failed to load leads clinic_id=%s error=%s", clinic_id, exc)
        leads = []

    try:
        waitlist_entries: list[dict[str, Any]] = (
            db.table("waitlist_entries")
            .select("*")
            .eq("clinic_id", clinic_id)
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
    except Exception as exc:
        logger.warning("operations_overview: waitlist_entries unavailable clinic_id=%s error=%s", clinic_id, exc)
        waitlist_entries = []

    reminder_candidates: list[dict[str, Any]] = []
    action_required_requests: list[dict[str, Any]] = []
    for lead in leads:
        payload = _operation_lead_payload(clinic["name"], reminder_enabled, reminder_lead_hours, lead)
        appointment_status = payload["appointment_status"]
        if appointment_status in {"cancel_requested", "reschedule_requested", "no_show"}:
            action_required_requests.append(payload)
        elif lead.get("status") == "booked":
            reminder_candidates.append(payload)

    deposit_summary = {
        "required_count": sum(1 for lead in leads if lead.get("deposit_required")),
        "requested_count": sum(1 for lead in leads if _normalize_deposit_status(lead.get("deposit_status")) == "requested"),
        "paid_count": sum(1 for lead in leads if _normalize_deposit_status(lead.get("deposit_status")) == "paid"),
        "waiting_count": sum(
            1
            for lead in leads
            if bool(lead.get("deposit_required"))
            and _safe_text(lead.get("appointment_status")) == "confirmed"
            and _normalize_deposit_status(lead.get("deposit_status")) not in {"paid", "waived", "not_required"}
        ),
        "configured_count": sum(
            1
            for lead in leads
            if lead.get("deposit_required") and lead.get("deposit_amount_cents")
        ),
        "note": "Deposit requests use real Stripe checkout links. Payment stays pending until Stripe confirms the appointment deposit.",
    }

    try:
        reminder_preview = build_reminder_previews(clinic_id)
    except Exception as exc:
        logger.warning("operations_overview: reminder_previews failed clinic_id=%s error=%s", clinic_id, exc)
        reminder_preview = []
    due_reminders = [item for item in reminder_preview if item.get("is_due")]

    try:
        outbound_activity, recent_outbound_messages = _build_outbound_activity(clinic_id)
    except Exception as exc:
        logger.warning("operations_overview: outbound_activity failed clinic_id=%s error=%s", clinic_id, exc)
        outbound_activity, recent_outbound_messages = _empty_outbound_activity(), []

    try:
        channel_readiness = build_channel_readiness(clinic_id)
    except Exception as exc:
        logger.warning("operations_overview: channel_readiness failed clinic_id=%s error=%s", clinic_id, exc)
        channel_readiness = []

    try:
        system_readiness = build_system_readiness(clinic_id)
    except Exception as exc:
        logger.warning("operations_overview: system_readiness failed clinic_id=%s error=%s", clinic_id, exc)
        system_readiness = {
            "overall_status": "attention",
            "configured_count": 0,
            "partial_count": 0,
            "missing_count": 0,
            "blocked_count": 0,
            "items": [],
        }

    try:
        communication_queue = build_communication_queue(clinic_id)
    except Exception as exc:
        logger.warning("operations_overview: communication_queue failed clinic_id=%s error=%s", clinic_id, exc)
        communication_queue = []

    try:
        review_queue = build_sms_review_queue(clinic_id)
    except Exception as exc:
        logger.warning("operations_overview: review_queue failed clinic_id=%s error=%s", clinic_id, exc)
        review_queue = []

    return {
        "reminder_enabled": reminder_enabled,
        "reminder_lead_hours": reminder_lead_hours,
        "follow_up_automation_enabled": clinic["follow_up_automation_enabled"],
        "follow_up_delay_minutes": clinic["follow_up_delay_minutes"],
        "reminder_candidates": reminder_candidates,
        "action_required_requests": action_required_requests,
        "waitlist_entries": waitlist_entries,
        "deposit_summary": deposit_summary,
        "channel_readiness": channel_readiness,
        "system_readiness": system_readiness,
        "communication_queue": communication_queue,
        "review_queue": review_queue,
        "due_reminders": due_reminders,
        "recent_outbound_messages": recent_outbound_messages,
        "outbound_activity": outbound_activity,
    }


def update_channel_connection(
    clinic_id: str,
    channel: str,
    updates: dict[str, Any],
) -> Optional[dict[str, Any]]:
    normalized_channel = _normalize_channel(channel, "")
    if not normalized_channel:
        raise ValueError("Invalid channel.")

    db = get_supabase()
    clinic = _maybe_single_data(
        db.table("clinics")
        .select("phone, email, name")
        .eq("id", clinic_id)
    ) or {}
    try:
        existing = _maybe_single_data(
            db.table("channel_connections")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("channel", normalized_channel)
        )
    except Exception as exc:
        raise RuntimeError("Channel readiness is not available until the latest database migration is applied.") from exc

    payload = {
        "clinic_id": clinic_id,
        "channel": normalized_channel,
        "provider": _safe_text(updates.get("provider")) or _safe_text((existing or {}).get("provider")) or CHANNEL_DEFAULTS[normalized_channel]["provider"],
        "display_name": _safe_text(updates.get("display_name")) or _safe_text((existing or {}).get("display_name")) or CHANNEL_DEFAULTS[normalized_channel]["display_name"],
        "contact_value": _safe_text(updates.get("contact_value")) or _safe_text((existing or {}).get("contact_value")),
        "automation_enabled": bool(updates.get("automation_enabled")) if "automation_enabled" in updates else bool((existing or {}).get("automation_enabled")),
        "notes": _safe_text(updates.get("notes")) or _safe_text((existing or {}).get("notes")),
    }
    if not payload["contact_value"] and normalized_channel in {"sms", "missed_call", "callback_request"}:
        payload["contact_value"] = _safe_text(clinic.get("phone"))
    if not payload["contact_value"] and normalized_channel in {"sms", "missed_call"}:
        payload["contact_value"] = _safe_text(get_sms_sender_identity())
    if normalized_channel in {"web_chat", "manual"}:
        payload["connection_status"] = "connected"
        payload["automation_enabled"] = True
    elif normalized_channel in {"sms", "missed_call"} and get_sms_configuration()["configured"]:
        payload["connection_status"] = "connected"
        payload["provider"] = "Twilio"
    elif payload["provider"] != CHANNEL_DEFAULTS[normalized_channel]["provider"] or payload["contact_value"] or payload["notes"]:
        payload["connection_status"] = "ready_for_setup"
    else:
        payload["connection_status"] = "not_connected"

    try:
        if existing:
            db.table("channel_connections").update({k: v for k, v in payload.items() if k != "clinic_id" and k != "channel"}).eq("clinic_id", clinic_id).eq("id", existing["id"]).execute()
        else:
            db.table("channel_connections").insert(payload).execute()
    except Exception as exc:
        raise RuntimeError("Channel readiness is not available until the latest database migration is applied.") from exc

    refreshed = build_channel_readiness(clinic_id)
    return next((item for item in refreshed if item["channel"] == normalized_channel), None)


def create_communication_event(clinic_id: str, data: dict[str, Any]) -> dict[str, Any]:
    channel = _normalize_channel(data.get("channel"), "")
    if channel not in {"missed_call", "callback_request"}:
        raise ValueError("Only missed-call and callback request events can be created here.")

    event_type = "missed_call" if channel == "missed_call" else "callback_request"
    customer_name = _safe_text(data.get("customer_name"))
    customer_phone = _safe_text(data.get("customer_phone"))
    customer_email = _safe_text(data.get("customer_email"))
    if not (customer_phone or customer_email or customer_name):
        raise ValueError("Add at least a name, phone number, or email address.")
    context = _resolve_sms_thread_context(
        clinic_id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_email=customer_email,
        lead_id=data.get("lead_id"),
        conversation_id=data.get("conversation_id"),
    )

    event = _create_communication_event_record(
        clinic_id,
        _communication_event_payload(
            clinic_id=clinic_id,
            thread_key=context["thread_key"],
            channel=channel,
            direction="inbound",
            event_type=event_type,
            status="new",
            customer_key=context["customer_key"],
            customer_name=context["customer_name"],
            customer_phone=context["customer_phone"],
            customer_email=context["customer_email"],
            summary=_safe_text(data.get("summary")) or ("Missed call logged for recovery." if channel == "missed_call" else "Callback request logged for follow-up."),
            content=_safe_text(data.get("content")),
            lead_id=context["lead_id"],
            conversation_id=context["conversation_id"],
            occurred_at=_current_timestamp(),
        ),
    )
    db = get_supabase()
    if channel == "missed_call":
        task = create_follow_up_task(
            clinic_id=clinic_id,
            source_key=f"communication:{event['id']}",
            task_type="follow_up_needed",
            priority="high",
            title="Missed call recovery",
            detail=_safe_text(event.get("summary")) or "Missed call logged for recovery.",
            customer_key=event.get("customer_key"),
            customer_name=event.get("customer_name") or "Unknown customer",
            lead_id=event.get("lead_id"),
            conversation_id=event.get("conversation_id"),
            auto_generated=True,
            due_at=_parse_datetime(event.get("occurred_at")) or _current_timestamp(),
            status="open",
        )
        event = _update_communication_event_record(
            clinic_id,
            event["id"],
            {"follow_up_task_id": task["id"]},
        ) or event
        readiness = _channel_readiness_map(clinic_id)
        missed_call_ready = readiness.get("missed_call") or {}
        if missed_call_ready.get("automation_enabled"):
            send_missed_call_text_back(clinic_id, event["id"], require_automation=True)
            refreshed = _maybe_single_data(
                db.table("communication_events")
                .select("*")
                .eq("clinic_id", clinic_id)
                .eq("id", event["id"])
            )
            if refreshed:
                event = _normalize_communication_event_row(refreshed)
    return event


def _resolve_thread_entities(clinic_id: str, thread_id: str) -> Optional[dict[str, Any]]:
    detail = get_conversation_detail(clinic_id, thread_id)
    if not detail:
        return None
    conversation = detail["conversation"]
    communication_event = detail.get("communication_event")
    related_events = detail.get("related_events") or []
    thread_conversation_id = (
        _safe_text(conversation.get("thread_conversation_id"))
        or _safe_text((communication_event or {}).get("conversation_id"))
        or (_safe_text(conversation.get("id")) if detail["thread_type"] == "conversation" else "")
    )
    return {
        "detail": detail,
        "conversation": conversation,
        "lead": detail.get("lead"),
        "communication_event": communication_event,
        "related_events": related_events,
        "thread_conversation_id": thread_conversation_id,
    }


def _link_thread_to_lead(
    clinic_id: str,
    thread_id: str,
    lead: dict[str, Any],
) -> Optional[dict[str, Any]]:
    db = get_supabase()
    resolved = _resolve_thread_entities(clinic_id, thread_id)
    if not resolved:
        return None
    conversation = resolved["conversation"]
    related_events = resolved["related_events"]
    thread_conversation_id = resolved["thread_conversation_id"]
    customer_key = _customer_key(_normalize_identity(lead))
    customer_name = lead.get("patient_name") or conversation.get("customer_name") or "Unknown patient"

    if thread_id.startswith("event:"):
        thread_key = thread_id.split("event:", 1)[1]
        primary_event = resolved["communication_event"] or _primary_event_for_thread(related_events)
        sms_conversation = _ensure_sms_thread_conversation(
            clinic_id,
            thread_key=thread_key,
            lead_id=lead["id"],
            conversation_id=thread_conversation_id or _safe_text(primary_event.get("conversation_id")) or None,
        )
        event_ids = [event["id"] for event in related_events]
        if event_ids:
            db.table("communication_events").update(
                {
                    "lead_id": lead["id"],
                    "conversation_id": sms_conversation["id"],
                    "customer_key": customer_key,
                    "customer_name": customer_name,
                }
            ).eq("clinic_id", clinic_id).in_("id", event_ids).execute()
            source_keys = [f"communication:{event_id}" for event_id in event_ids]
            db.table("follow_up_tasks").update(
                {
                    "lead_id": lead["id"],
                    "conversation_id": sms_conversation["id"],
                    "customer_key": customer_key,
                    "customer_name": customer_name,
                }
            ).eq("clinic_id", clinic_id).in_("source_key", source_keys).execute()
        return lead

    db.table("conversations").update({"lead_id": lead["id"]}).eq("clinic_id", clinic_id).eq("id", thread_id).execute()
    db.table("follow_up_tasks").update(
        {
            "lead_id": lead["id"],
            "customer_key": customer_key,
            "customer_name": customer_name,
        }
    ).eq("clinic_id", clinic_id).eq("conversation_id", thread_id).execute()
    return lead


def convert_thread_to_lead(
    clinic_id: str,
    thread_id: str,
    data: Optional[dict[str, Any]] = None,
) -> Optional[dict[str, Any]]:
    db = get_supabase()
    payload = data or {}
    if thread_id.startswith("event:"):
        thread_key = thread_id.split("event:", 1)[1]
        thread_events = [
            event
            for event in _load_communication_events(clinic_id, limit=400, include_all_statuses=True)
            if _safe_text(event.get("thread_key")) == thread_key
        ]
        if not thread_events:
            return None
        event = _primary_event_for_thread(thread_events)
        if event.get("lead_id"):
            return _maybe_single_data(
                db.table("leads")
                .select("*")
                .eq("clinic_id", clinic_id)
                .eq("id", event["lead_id"])
            )

        patient_name = _safe_text(payload.get("patient_name")) or _safe_text(event.get("customer_name"))
        patient_phone = _safe_text(payload.get("patient_phone")) or _safe_text(event.get("customer_phone"))
        patient_email = _safe_text(payload.get("patient_email")) or _safe_text(event.get("customer_email"))
        if not (patient_name or patient_phone or patient_email):
            raise ValueError("Add a name, phone number, or email before converting this thread into a request.")
        existing_lead = _find_matching_lead_by_identity(
            clinic_id,
            phone=patient_phone,
            email=patient_email,
        )
        if existing_lead:
            return _link_thread_to_lead(clinic_id, thread_id, existing_lead)

        from app.services.lead_service import create_lead

        lead = create_lead(
            clinic_id,
            {
                "patient_name": patient_name or "Manual front desk lead",
                "patient_phone": patient_phone,
                "patient_email": patient_email,
                "reason_for_visit": _safe_text(payload.get("reason_for_visit")) or _safe_text(event.get("summary")) or "Callback request",
                "preferred_datetime_text": _safe_text(payload.get("preferred_datetime_text")),
                "source": _normalize_channel(event.get("channel"), "manual"),
                "notes": _safe_text(payload.get("notes")) or _safe_text(event.get("content")),
            },
        )
        return _link_thread_to_lead(clinic_id, thread_id, lead)

    conversation = _maybe_single_data(
        db.table("conversations")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("id", thread_id)
    )
    if not conversation:
        return None
    if conversation.get("lead_id"):
        return _maybe_single_data(
            db.table("leads")
            .select("*")
            .eq("clinic_id", clinic_id)
            .eq("id", conversation["lead_id"])
        )

    patient_name = _safe_text(payload.get("patient_name"))
    patient_phone = _safe_text(payload.get("patient_phone"))
    patient_email = _safe_text(payload.get("patient_email"))
    if not (patient_name or patient_phone or patient_email):
        raise ValueError("Add a name, phone number, or email before converting this thread into a request.")
    existing_lead = _find_matching_lead_by_identity(
        clinic_id,
        phone=patient_phone,
        email=patient_email,
    )
    if existing_lead:
        return _link_thread_to_lead(clinic_id, thread_id, existing_lead)

    messages = (
        db.table("conversation_messages")
        .select("*")
        .eq("conversation_id", thread_id)
        .order("created_at")
        .execute()
        .data
        or []
    )
    from app.services.lead_service import create_lead

    lead = create_lead(
        clinic_id,
        {
            "patient_name": patient_name or "Website chat visitor",
            "patient_phone": patient_phone,
            "patient_email": patient_email,
            "reason_for_visit": _safe_text(payload.get("reason_for_visit")) or _derive_conversation_reason(conversation, messages),
            "preferred_datetime_text": _safe_text(payload.get("preferred_datetime_text")),
            "source": _channel_for_conversation(conversation, None),
            "notes": _safe_text(payload.get("notes")) or _safe_text(conversation.get("summary")),
        },
    )
    return _link_thread_to_lead(clinic_id, thread_id, lead)


def update_thread_control(
    clinic_id: str,
    thread_id: str,
    *,
    manual_takeover: bool,
) -> Optional[dict[str, Any]]:
    db = get_supabase()
    try:
        conversation = None
        if thread_id.startswith("event:"):
            thread_key = thread_id.split("event:", 1)[1]
            thread_events = [
                event
                for event in _load_communication_events(clinic_id, limit=400, include_all_statuses=True)
                if _safe_text(event.get("thread_key")) == thread_key
            ]
            if not thread_events:
                return None
            primary_event = _primary_event_for_thread(thread_events)
            conversation = _ensure_sms_thread_conversation(
                clinic_id,
                thread_key=thread_key,
                lead_id=_safe_text(primary_event.get("lead_id")) or None,
                conversation_id=_safe_text(primary_event.get("conversation_id")) or None,
            )
            event_ids = [event["id"] for event in thread_events if not _safe_text(event.get("conversation_id"))]
            if event_ids:
                db.table("communication_events").update({"conversation_id": conversation["id"]}).eq("clinic_id", clinic_id).in_("id", event_ids).execute()
        else:
            conversation = _maybe_load_conversation(clinic_id, thread_id)
        if not conversation:
            return None

        result = (
            db.table("conversations")
            .update({"manual_takeover": manual_takeover})
            .eq("clinic_id", clinic_id)
            .eq("id", conversation["id"])
            .execute()
        )
        if not result.data:
            return None
        updated = result.data[0]
    except Exception as exc:
        raise RuntimeError("SMS thread controls are not available until the latest database migration is applied.") from exc

    sms_ready = _channel_readiness_map(clinic_id).get("sms", {})
    return {
        "conversation_id": updated["id"],
        "manual_takeover": bool(updated.get("manual_takeover")),
        "ai_auto_reply_enabled": bool(
            sms_ready.get("connection_status") == "connected"
            and sms_ready.get("automation_enabled")
            and not updated.get("manual_takeover")
        ),
        "ai_auto_reply_ready": bool(
            sms_ready.get("connection_status") == "connected"
            and sms_ready.get("automation_enabled")
        ),
    }


def _complete_thread_follow_up_tasks(
    clinic_id: str,
    *,
    thread_id: str,
    lead_id: Optional[str],
    conversation_id: Optional[str],
    related_events: list[dict[str, Any]],
    note: str = "",
) -> None:
    source_keys = {f"communication:{event['id']}" for event in related_events}
    if conversation_id:
        source_keys.add(f"thread:{conversation_id}")
    for task in _load_follow_up_tasks(clinic_id, include_completed=False):
        if _safe_text(task.get("status")) == "completed":
            continue
        matches_thread = False
        if conversation_id and _safe_text(task.get("conversation_id")) == conversation_id:
            matches_thread = True
        if source_keys and _safe_text(task.get("source_key")) in source_keys:
            matches_thread = True
        if lead_id and _safe_text(task.get("lead_id")) == lead_id and not conversation_id and not source_keys:
            matches_thread = True
        if not matches_thread:
            continue
        update_follow_up_task(
            clinic_id,
            task["id"],
            {
                "status": "completed",
                "note": _merge_note_text(_safe_text(task.get("note")), note),
            },
        )


def update_thread_workflow(
    clinic_id: str,
    thread_id: str,
    updates: dict[str, Any],
) -> Optional[dict[str, Any]]:
    resolved = _resolve_thread_entities(clinic_id, thread_id)
    if not resolved:
        return None
    lead = resolved["lead"]
    if not lead:
        raise ValueError("Convert this thread to a request before updating booking or status.")

    status_value = _safe_text(updates.get("status")).lower()
    if status_value not in {"contacted", "booked", "closed"}:
        raise ValueError("Invalid thread status update.")

    appointment_starts_at = _parse_datetime(updates.get("appointment_starts_at"))
    appointment_ends_at = _parse_datetime(updates.get("appointment_ends_at"))
    booking_note = _safe_text(updates.get("note"))
    reason_for_visit = _safe_text(updates.get("reason_for_visit"))
    preferred_datetime_text = _safe_text(updates.get("preferred_datetime_text"))

    payload: dict[str, Any] = {
        "status": status_value,
    }
    if reason_for_visit:
        payload["reason_for_visit"] = reason_for_visit
    if preferred_datetime_text:
        payload["preferred_datetime_text"] = preferred_datetime_text
    if booking_note:
        payload["notes"] = _merge_note_text(_safe_text(lead.get("notes")), booking_note)

    if status_value == "booked":
        if appointment_starts_at is None:
            raise ValueError("Add an appointment date and time before marking this request as booked.")
        payload["appointment_status"] = "confirmed"
        payload["appointment_starts_at"] = appointment_starts_at
        payload["appointment_ends_at"] = appointment_ends_at
        if not preferred_datetime_text:
            payload["preferred_datetime_text"] = _format_appointment_summary(appointment_starts_at)
    elif status_value == "closed":
        if _safe_text(lead.get("appointment_status")) not in {"confirmed", "completed"}:
            payload["appointment_status"] = "cancelled"
            payload["reminder_status"] = "not_ready"
            payload["reminder_scheduled_for"] = None

    updated = update_lead_operations(clinic_id, lead["id"], payload)
    if not updated:
        return None

    primary_event = resolved.get("communication_event")
    if primary_event and _normalize_channel(primary_event.get("channel"), "") in {"missed_call", "callback_request"}:
        _update_communication_event_record(
            clinic_id,
            primary_event["id"],
            {"status": "completed"},
        )

    follow_up_note = {
        "contacted": "Thread marked as contacted from inbox.",
        "booked": "Thread booked from inbox.",
        "closed": "Thread closed from inbox.",
    }[status_value]
    _complete_thread_follow_up_tasks(
        clinic_id,
        thread_id=thread_id,
        lead_id=updated["id"],
        conversation_id=resolved.get("thread_conversation_id"),
        related_events=resolved.get("related_events") or [],
        note=_merge_note_text(follow_up_note, booking_note),
    )
    return updated


def update_appointment(
    clinic_id: str,
    lead_id: str,
    updates: dict[str, Any],
) -> Optional[dict[str, Any]]:
    db = get_supabase()
    current = _maybe_single_data(
        db.table("leads")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("id", lead_id)
    )
    if not current:
        return None

    allowed_fields = {
        "status",
        "appointment_status",
        "appointment_starts_at",
        "appointment_ends_at",
        "reason_for_visit",
        "preferred_datetime_text",
        "note",
    }
    provided = {key: value for key, value in updates.items() if key in allowed_fields}
    if not provided:
        raise ValueError("No appointment changes were provided.")

    filtered: dict[str, Any] = {}
    if "status" in provided:
        status_value = _safe_text(provided.get("status")).lower()
        if status_value not in {"new", "contacted", "booked", "closed"}:
            raise ValueError("Invalid lead status.")
        filtered["status"] = status_value

    if "appointment_status" in provided:
        appointment_status = _safe_text(provided.get("appointment_status")).lower()
        if appointment_status not in APPOINTMENT_STATUSES:
            raise ValueError("Invalid appointment status.")
        filtered["appointment_status"] = appointment_status

    if "appointment_starts_at" in provided:
        filtered["appointment_starts_at"] = _serialize_datetime(provided.get("appointment_starts_at"))
    if "appointment_ends_at" in provided:
        filtered["appointment_ends_at"] = _serialize_datetime(provided.get("appointment_ends_at"))
    if "reason_for_visit" in provided:
        filtered["reason_for_visit"] = _safe_text(provided.get("reason_for_visit"))
    if "preferred_datetime_text" in provided:
        filtered["preferred_datetime_text"] = _safe_text(provided.get("preferred_datetime_text"))
    if "note" in provided and _safe_text(provided.get("note")):
        filtered["notes"] = _merge_note_text(_safe_text(current.get("notes")), _safe_text(provided.get("note")))

    clinic = _maybe_single_data(
        db.table("clinics")
        .select("reminder_enabled, reminder_lead_hours")
        .eq("id", clinic_id)
    ) or {}
    reminder_enabled = bool(clinic.get("reminder_enabled"))
    reminder_lead_hours = int(clinic.get("reminder_lead_hours") or 24)

    appointment_status = filtered.get("appointment_status", current.get("appointment_status") or "request_open")
    appointment_starts_at = (
        _parse_datetime(filtered["appointment_starts_at"])
        if "appointment_starts_at" in filtered
        else _parse_datetime(current.get("appointment_starts_at"))
    )

    if appointment_status == "confirmed" and appointment_starts_at is None:
        raise ValueError("Add an appointment date and time before confirming this booking.")

    if appointment_status == "confirmed":
        filtered.setdefault("status", "booked")
        if reminder_enabled and appointment_starts_at is not None:
            filtered["reminder_status"] = "ready"
            filtered["reminder_scheduled_for"] = (
                appointment_starts_at - timedelta(hours=reminder_lead_hours)
            ).isoformat()
        else:
            filtered.setdefault("reminder_status", current.get("reminder_status") or "not_ready")
        if appointment_starts_at is not None and not _safe_text(filtered.get("preferred_datetime_text")):
            filtered["preferred_datetime_text"] = _format_appointment_summary(appointment_starts_at)
    elif appointment_status in {"cancel_requested", "reschedule_requested", "cancelled", "no_show"}:
        filtered.setdefault("status", "closed" if appointment_status in {"cancelled", "no_show"} else "contacted")
        filtered["reminder_status"] = "not_ready"
        filtered["reminder_scheduled_for"] = None
    elif appointment_status == "completed":
        filtered.setdefault("status", "closed")
        filtered["reminder_status"] = "sent" if _safe_text(current.get("reminder_status")) == "sent" else "not_ready"
        filtered["reminder_scheduled_for"] = None
    elif appointment_status == "request_open":
        filtered.setdefault("status", "contacted")
        filtered["reminder_status"] = "not_ready"
        filtered["reminder_scheduled_for"] = None
        if "appointment_starts_at" not in filtered:
            filtered["appointment_starts_at"] = None
        if "appointment_ends_at" not in filtered:
            filtered["appointment_ends_at"] = None

    result = (
        db.table("leads")
        .update(filtered)
        .eq("clinic_id", clinic_id)
        .eq("id", lead_id)
        .execute()
    )
    updated = result.data[0] if result.data else None
    if not updated:
        return None

    if _safe_text(updated.get("status")) in {"booked", "closed"} or _safe_text(updated.get("appointment_status")) in {"cancelled", "completed", "no_show"}:
        _complete_lead_follow_up_tasks(
            clinic_id,
            lead_id,
            note=f"Appointment updated to {_safe_text(updated.get('appointment_status')) or _safe_text(updated.get('status'))}.",
        )
    return updated


def create_thread_note(
    clinic_id: str,
    thread_id: str,
    note: str,
) -> Optional[dict[str, Any]]:
    resolved = _resolve_thread_entities(clinic_id, thread_id)
    if not resolved:
        return None
    note_text = _safe_text(note)
    if not note_text:
        raise ValueError("Add a short internal note before saving.")

    conversation = resolved["conversation"]
    lead = resolved.get("lead") or {}
    communication_event = resolved.get("communication_event") or {}
    thread_type = resolved["detail"]["thread_type"]
    thread_key = (
        thread_id.split("event:", 1)[1]
        if thread_type == "event"
        else _safe_text(conversation.get("session_id")) or f"conversation:{conversation['id']}"
    )

    return _create_communication_event_record(
        clinic_id,
        _communication_event_payload(
            clinic_id=clinic_id,
            thread_key=thread_key,
            channel="manual",
            direction="internal",
            event_type="note",
            status="completed",
            customer_key=conversation.get("customer_key"),
            customer_name=conversation.get("customer_name") or lead.get("patient_name") or communication_event.get("customer_name") or "Unknown customer",
            customer_phone=conversation.get("customer_phone") or lead.get("patient_phone") or communication_event.get("customer_phone") or "",
            customer_email=conversation.get("customer_email") or lead.get("patient_email") or communication_event.get("customer_email") or "",
            summary="Internal note",
            content=note_text,
            lead_id=(lead or {}).get("id") or communication_event.get("lead_id"),
            conversation_id=resolved.get("thread_conversation_id") or communication_event.get("conversation_id"),
            payload={"sender_kind": "staff"},
            occurred_at=_current_timestamp(),
        ),
    )


def update_communication_event(
    clinic_id: str,
    event_id: str,
    updates: dict[str, Any],
) -> Optional[dict[str, Any]]:
    filtered = {
        key: _safe_text(value) if isinstance(value, str) else value
        for key, value in updates.items()
        if value is not None
    }
    if "status" in filtered and filtered["status"] not in COMMUNICATION_EVENT_STATUSES:
        raise ValueError("Invalid communication status.")
    if not filtered:
        return None

    return _update_communication_event_record(clinic_id, event_id, filtered)


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
    if "deposit_status" in filtered:
        filtered["deposit_status"] = _normalize_deposit_status(filtered["deposit_status"])
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
            filtered["deposit_checkout_session_id"] = ""
            filtered["deposit_payment_intent_id"] = ""
            filtered["deposit_requested_at"] = None
            filtered["deposit_paid_at"] = None
            filtered["deposit_status"] = "not_required"
        elif filtered.get("deposit_required") is True and "deposit_status" not in filtered:
            filtered["deposit_status"] = _normalize_deposit_status(current.get("deposit_status")) or "required"

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
