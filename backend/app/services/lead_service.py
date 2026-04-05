from typing import Optional

from app.dependencies import get_supabase
from app.utils.logger import get_logger
import threading

logger = get_logger(__name__)


def create_lead(clinic_id: str, data: dict) -> dict:
    db = get_supabase()
    payload = {
        "clinic_id": clinic_id,
        "patient_name": data.get("patient_name", ""),
        "patient_phone": data.get("patient_phone", ""),
        "patient_email": data.get("patient_email", ""),
        "reason_for_visit": data.get("reason_for_visit", ""),
        "preferred_datetime_text": data.get("preferred_datetime_text", ""),
        "source": data.get("source", "web_chat"),
        "notes": data.get("notes", ""),
        "slot_row_index": data.get("slot_row_index"),
        "slot_source": data.get("slot_source", "manual"),
        "status": "new",
    }

    try:
        result = db.table("leads").insert(payload).execute()
    except Exception as e:
        # Some deployments may not have slot columns yet; retry safely without them.
        if "slot_row_index" in str(e) or "slot_source" in str(e):
            payload.pop("slot_row_index", None)
            payload.pop("slot_source", None)
            result = db.table("leads").insert(payload).execute()
        else:
            raise

    logger.info(f"Lead created for clinic {clinic_id}: {result.data[0]['id']}")

    # Increment monthly lead counter atomically
    try:
        db.rpc("increment_monthly_leads", {"clinic_id_input": clinic_id}).execute()
    except Exception as e:
        logger.warning(f"RPC increment_monthly_leads unavailable for clinic {clinic_id}, using fallback: {e}")
        # Fallback: non-atomic increment if RPC doesn't exist yet
        try:
            clinic_row = db.table("clinics").select("monthly_leads_used").eq("id", clinic_id).single().execute()
            current_count = (clinic_row.data or {}).get("monthly_leads_used", 0) or 0
            db.table("clinics").update({"monthly_leads_used": current_count + 1}).eq("id", clinic_id).execute()
        except Exception as e2:
            logger.error(f"Failed to increment monthly lead counter for clinic {clinic_id}: {e2}")

    # Notifications & Syncs
    try:
        clinic = db.table("clinics").select("*").eq("id", clinic_id).single().execute()
        
        if clinic.data:
            from app.services.spreadsheet_sync import append_lead_for_clinic

            append_lead_for_clinic(clinic.data, result.data[0])
            
        # Email Notifications (Async Fire-and-Forget)
        if clinic.data and clinic.data.get("notifications_enabled"):
            from app.services.email_service import send_new_lead_email
            threading.Thread(
                target=send_new_lead_email, 
                args=(clinic.data, result.data[0]),
                daemon=True
            ).start()
            
    except Exception as e:
        logger.error(f"Failed to initiate background syncs/notifications: {e}")
        
    return result.data[0]


def get_leads(clinic_id: str, status_filter: Optional[str] = None) -> list[dict]:
    db = get_supabase()
    query = db.table("leads").select("*").eq("clinic_id", clinic_id).order("created_at", desc=True)
    if status_filter:
        query = query.eq("status", status_filter)
    result = query.execute()
    return result.data


def get_lead(clinic_id: str, lead_id: str) -> dict | None:
    db = get_supabase()
    result = (
        db.table("leads")
        .select("*")
        .eq("clinic_id", clinic_id)
        .eq("id", lead_id)
        .maybe_single()
        .execute()
    )
    return result.data


def update_lead(clinic_id: str, lead_id: str, updates: dict) -> dict | None:
    db = get_supabase()
    filtered = {k: v for k, v in updates.items() if v is not None}
    if not filtered:
        return get_lead(clinic_id, lead_id)
    result = (
        db.table("leads")
        .update(filtered)
        .eq("clinic_id", clinic_id)
        .eq("id", lead_id)
        .execute()
    )
    logger.info(f"Lead {lead_id} updated: {list(filtered.keys())}")

    # Google Sheets Status Writeback
    if "status" in filtered:
        try:
            from app.services.spreadsheet_sync import update_lead_status_for_clinic

            clinic = db.table("clinics").select("*").eq("id", clinic_id).single().execute()
            if clinic.data:
                update_lead_status_for_clinic(clinic.data, lead_id, filtered["status"])
        except Exception as e:
            logger.error(f"Failed to initiate Google Sheets status sync: {e}")

    return result.data[0] if result.data else None
