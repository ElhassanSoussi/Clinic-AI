from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from app.dependencies import get_supabase
from app.utils.logger import get_logger

logger = get_logger(__name__)

BACKGROUND_JOB_TYPES = {
    "lead_notification_email",
    "spreadsheet_append_lead",
    "spreadsheet_update_lead_status",
    "spreadsheet_reserve_slot",
    "retry_communication_event",
}
BACKGROUND_JOB_STATUSES = {"queued", "running", "completed", "failed"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize_datetime(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc).isoformat()
    return value.astimezone(timezone.utc).isoformat()


def _normalize_job(job: dict[str, Any]) -> dict[str, Any]:
    payload = job.get("payload")
    if not isinstance(payload, dict):
        payload = {}
    job["payload"] = payload
    job["attempts"] = int(job.get("attempts") or 0)
    job["max_attempts"] = int(job.get("max_attempts") or 3)
    job["status"] = str(job.get("status") or "queued")
    return job


def enqueue_background_job(
    clinic_id: str,
    job_type: str,
    payload: dict[str, Any],
    *,
    available_at: Optional[datetime] = None,
    max_attempts: int = 3,
) -> dict[str, Any]:
    if job_type not in BACKGROUND_JOB_TYPES:
        raise ValueError("Invalid background job type.")

    result = (
        get_supabase()
        .table("background_jobs")
        .insert(
            {
                "clinic_id": clinic_id,
                "job_type": job_type,
                "status": "queued",
                "payload": payload,
                "attempts": 0,
                "max_attempts": max(1, max_attempts),
                "available_at": _serialize_datetime(available_at or _now()),
            }
        )
        .execute()
    )
    job = _normalize_job(result.data[0])
    logger.info(
        "background_job_enqueued job_id=%s clinic_id=%s job_type=%s",
        job["id"],
        clinic_id,
        job_type,
    )
    return job


def _load_due_jobs(limit: int = 25) -> list[dict[str, Any]]:
    result = (
        get_supabase()
        .table("background_jobs")
        .select("*")
        .in_("status", ["queued", "failed"])
        .lte("available_at", _serialize_datetime(_now()))
        .order("available_at")
        .limit(limit)
        .execute()
    )
    return [_normalize_job(row) for row in (result.data or [])]


def _update_job(job_id: str, updates: dict[str, Any]) -> Optional[dict[str, Any]]:
    result = (
        get_supabase()
        .table("background_jobs")
        .update(updates)
        .eq("id", job_id)
        .execute()
    )
    if not result.data:
        return None
    return _normalize_job(result.data[0])


def _claim_job(job: dict[str, Any]) -> Optional[dict[str, Any]]:
    if job["attempts"] >= job["max_attempts"]:
        return None
    return _update_job(
        job["id"],
        {
            "status": "running",
            "locked_at": _serialize_datetime(_now()),
            "attempts": job["attempts"] + 1,
        },
    )


def _load_clinic(clinic_id: str) -> Optional[dict[str, Any]]:
    result = (
        get_supabase()
        .table("clinics")
        .select("*")
        .eq("id", clinic_id)
        .maybe_single()
        .execute()
    )
    return result.data


def _load_lead(clinic_id: str, lead_id: str) -> Optional[dict[str, Any]]:
    result = (
        get_supabase()
        .table("leads")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("id", lead_id)
        .maybe_single()
        .execute()
    )
    return result.data


def _execute_job(job: dict[str, Any]) -> None:
    clinic_id = str(job.get("clinic_id") or "")
    job_type = str(job.get("job_type") or "")
    payload = job.get("payload") or {}

    clinic = _load_clinic(clinic_id)
    if not clinic:
        raise RuntimeError("Clinic not found for background job.")

    if job_type == "lead_notification_email":
        from app.services.email_service import send_new_lead_email

        lead = _load_lead(clinic_id, str(payload.get("lead_id") or ""))
        if not lead:
            raise RuntimeError("Lead not found for email notification.")
        send_new_lead_email(clinic, lead, raise_on_error=True)
        return

    if job_type == "spreadsheet_append_lead":
        from app.services.spreadsheet_sync import append_lead_for_clinic

        lead = _load_lead(clinic_id, str(payload.get("lead_id") or ""))
        if not lead:
            raise RuntimeError("Lead not found for spreadsheet sync.")
        append_lead_for_clinic(clinic, lead, raise_on_error=True)
        return

    if job_type == "spreadsheet_update_lead_status":
        from app.services.spreadsheet_sync import update_lead_status_for_clinic

        lead_id = str(payload.get("lead_id") or "")
        new_status = str(payload.get("status") or "")
        if not lead_id or not new_status:
            raise RuntimeError("Spreadsheet status sync payload is incomplete.")
        update_lead_status_for_clinic(clinic, lead_id, new_status, raise_on_error=True)
        return

    if job_type == "spreadsheet_reserve_slot":
        from app.services.spreadsheet_sync import reserve_slot_for_clinic

        lead = _load_lead(clinic_id, str(payload.get("lead_id") or ""))
        if not lead:
            raise RuntimeError("Lead not found for slot reservation.")
        row_index = lead.get("slot_row_index")
        if row_index is None:
            return
        reserved = reserve_slot_for_clinic(
            clinic,
            int(row_index),
            str(lead.get("patient_name") or ""),
            str(lead.get("id") or ""),
            raise_on_error=True,
        )
        if not reserved:
            raise RuntimeError("Spreadsheet slot reservation was not confirmed.")
        return

    if job_type == "retry_communication_event":
        from app.services.frontdesk_service import retry_communication_event

        event_id = str(payload.get("event_id") or "")
        if not event_id:
            raise RuntimeError("Retry communication payload is missing event_id.")
        retried = retry_communication_event(clinic_id, event_id)
        if not retried:
            raise RuntimeError("Communication event retry target was not found.")
        return

    raise RuntimeError("Unsupported background job type.")


def _schedule_next_attempt(job: dict[str, Any], error: Exception) -> None:
    attempts = job["attempts"]
    max_attempts = job["max_attempts"]
    updates: dict[str, Any] = {
        "status": "failed",
        "last_error": str(error)[:500],
        "locked_at": None,
    }
    if attempts >= max_attempts:
        updates["available_at"] = None
    else:
        backoff_minutes = max(2, attempts * 5)
        updates["available_at"] = _serialize_datetime(_now() + timedelta(minutes=backoff_minutes))
    _update_job(job["id"], updates)


def _mark_completed(job: dict[str, Any]) -> None:
    _update_job(
        job["id"],
        {
            "status": "completed",
            "locked_at": None,
            "completed_at": _serialize_datetime(_now()),
            "last_error": "",
        },
    )


def run_retryable_background_jobs(limit: int = 25) -> dict[str, int]:
    jobs = _load_due_jobs(limit)
    processed = 0
    completed = 0
    failed = 0

    for job in jobs:
        claimed = _claim_job(job)
        if not claimed:
            continue
        processed += 1
        logger.info(
            "background_job_start job_id=%s clinic_id=%s job_type=%s attempt=%s",
            claimed["id"],
            claimed["clinic_id"],
            claimed["job_type"],
            claimed["attempts"],
        )
        try:
            _execute_job(claimed)
        except Exception as exc:
            failed += 1
            logger.error(
                "background_job_failed job_id=%s clinic_id=%s job_type=%s error=%s",
                claimed["id"],
                claimed["clinic_id"],
                claimed["job_type"],
                exc,
            )
            _schedule_next_attempt(claimed, exc)
            continue
        _mark_completed(claimed)
        completed += 1
        logger.info(
            "background_job_completed job_id=%s clinic_id=%s job_type=%s",
            claimed["id"],
            claimed["clinic_id"],
            claimed["job_type"],
        )

    return {
        "processed": processed,
        "completed": completed,
        "failed": failed,
    }


def cleanup_background_jobs(retention_days: int = 7) -> int:
    cutoff = _serialize_datetime(_now() - timedelta(days=retention_days))
    result = (
        get_supabase()
        .table("background_jobs")
        .delete()
        .eq("status", "completed")
        .lt("completed_at", cutoff)
        .execute()
    )
    deleted = len(result.data or [])
    logger.info("background_job_cleanup deleted=%s retention_days=%s", deleted, retention_days)
    return deleted
