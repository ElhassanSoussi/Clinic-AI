from __future__ import annotations

import base64
import hashlib
import hmac
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if not digits:
        return ""
    if phone.strip().startswith("+") and len(digits) >= 8:
        return f"+{digits}"
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return ""


def get_sms_sender_identity() -> str:
    settings = get_settings()
    if settings.twilio_from_number:
        return settings.twilio_from_number.strip()
    if settings.twilio_messaging_service_sid:
        return settings.twilio_messaging_service_sid.strip()
    return ""


def get_sms_configuration() -> dict[str, Any]:
    settings = get_settings()
    configured = bool(
        settings.twilio_account_sid
        and settings.twilio_auth_token
        and (settings.twilio_from_number or settings.twilio_messaging_service_sid)
    )
    return {
        "configured": configured,
        "provider": "Twilio" if configured else "Twilio",
        "sender": get_sms_sender_identity(),
    }


def validate_twilio_signature(url: str, params: dict[str, str], signature: str) -> bool:
    settings = get_settings()
    token = settings.twilio_auth_token.strip()
    incoming_signature = (signature or "").strip()
    if not token or not incoming_signature:
        return False

    payload = url
    for key in sorted(params):
        payload += key
        payload += params[key]

    digest = hmac.new(
        token.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha1,
    ).digest()
    expected_signature = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(expected_signature, incoming_signature)


def parse_twilio_inbound_payload(params: dict[str, str]) -> dict[str, Any]:
    message_sid = (params.get("MessageSid") or params.get("SmsSid") or "").strip()
    from_phone = _normalize_phone(params.get("From") or "")
    to_phone = _normalize_phone(params.get("To") or "")
    body = (params.get("Body") or "").strip()

    return {
        "message_sid": message_sid,
        "from_phone": from_phone,
        "to_phone": to_phone,
        "body": body,
        "account_sid": (params.get("AccountSid") or "").strip(),
        "messaging_service_sid": (params.get("MessagingServiceSid") or "").strip(),
        "from_city": (params.get("FromCity") or "").strip(),
        "from_state": (params.get("FromState") or "").strip(),
        "from_country": (params.get("FromCountry") or "").strip(),
        "to_city": (params.get("ToCity") or "").strip(),
        "to_state": (params.get("ToState") or "").strip(),
        "to_country": (params.get("ToCountry") or "").strip(),
        "num_media": (params.get("NumMedia") or "").strip(),
    }


def _twilio_auth() -> tuple[str, str]:
    settings = get_settings()
    return settings.twilio_account_sid, settings.twilio_auth_token


def _twilio_message_url(message_sid: str) -> str:
    settings = get_settings()
    return f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages/{message_sid}.json"


def _normalize_twilio_status(provider_status: str) -> str:
    normalized = (provider_status or "").lower()
    if normalized == "delivered":
        return "delivered"
    if normalized in {"failed", "undelivered"}:
        return "failed"
    if normalized == "queued":
        return "queued"
    return "sent"


def _fetch_twilio_message_result(message_sid: str) -> dict[str, Any]:
    if not message_sid:
        return {}
    account_sid, auth_token = _twilio_auth()
    try:
        response = httpx.get(
            _twilio_message_url(message_sid),
            auth=(account_sid, auth_token),
            timeout=10.0,
        )
        if not response.is_success:
            return {}
        return response.json() if response.content else {}
    except Exception as exc:
        logger.warning(f"Twilio message status lookup failed for {message_sid}: {exc}")
        return {}


def send_sms_message(to_phone: str, body: str) -> dict[str, Any]:
    settings = get_settings()
    message_body = (body or "").strip()
    if not message_body:
        return {
            "status": "skipped",
            "provider": "twilio",
            "provider_message_id": "",
            "failure_reason": "",
            "skipped_reason": "SMS body is required.",
            "sent_at": None,
            "delivered_at": None,
        }

    config = get_sms_configuration()
    if not config["configured"]:
        return {
            "status": "skipped",
            "provider": "twilio",
            "provider_message_id": "",
            "failure_reason": "",
            "skipped_reason": "Twilio is not configured on the server.",
            "sent_at": None,
            "delivered_at": None,
        }

    normalized_to = _normalize_phone(to_phone)
    if not normalized_to:
        return {
            "status": "skipped",
            "provider": "twilio",
            "provider_message_id": "",
            "failure_reason": "",
            "skipped_reason": "A valid patient phone number is required to send SMS.",
            "sent_at": None,
            "delivered_at": None,
        }

    payload = {
        "To": normalized_to,
        "Body": message_body,
    }
    if settings.twilio_from_number:
        payload["From"] = settings.twilio_from_number
    elif settings.twilio_messaging_service_sid:
        payload["MessagingServiceSid"] = settings.twilio_messaging_service_sid

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    try:
        response = httpx.post(
            url,
            data=payload,
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            timeout=20.0,
        )
        data = response.json() if response.content else {}
    except Exception as exc:
        logger.error(f"Twilio SMS request failed: {exc}")
        return {
            "status": "failed",
            "provider": "twilio",
            "provider_message_id": "",
            "failure_reason": str(exc)[:250],
            "skipped_reason": "",
            "sent_at": None,
            "delivered_at": None,
        }

    if response.is_success:
        provider_message_id = data.get("sid") or ""
        provider_status = (data.get("status") or "").lower()
        if provider_message_id and provider_status not in {"delivered", "failed", "undelivered"}:
            time.sleep(1.0)
            latest = _fetch_twilio_message_result(provider_message_id)
            if latest:
                data = latest
                provider_status = (data.get("status") or provider_status).lower()
        status = _normalize_twilio_status(provider_status)
        sent_at = datetime.now(timezone.utc).isoformat()
        delivered_at = sent_at if status == "delivered" else None
        failure_reason = ""
        if status == "failed":
            failure_reason = (
                data.get("error_message")
                or data.get("message")
                or "Twilio could not deliver the SMS."
            )
        return {
            "status": status,
            "provider": "twilio",
            "provider_message_id": provider_message_id,
            "failure_reason": failure_reason[:250],
            "skipped_reason": "",
            "sent_at": sent_at,
            "delivered_at": delivered_at,
        }

    error_message = (
        data.get("message")
        or data.get("detail")
        or response.text
        or f"Twilio request failed with status {response.status_code}."
    )
    return {
        "status": "failed",
        "provider": "twilio",
        "provider_message_id": data.get("sid") or "",
        "failure_reason": str(error_message)[:250],
        "skipped_reason": "",
        "sent_at": None,
        "delivered_at": None,
    }
