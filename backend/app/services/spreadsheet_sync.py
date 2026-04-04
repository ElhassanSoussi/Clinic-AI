import asyncio
import threading

from app.services.excel_workbooks import (
    append_lead_to_workbook,
    get_available_slots_from_workbook,
    reserve_slot_in_workbook,
    update_lead_status_in_workbook,
)
from app.services.google_sheets import (
    append_lead_to_sheet,
    get_available_slots,
    reserve_slot_in_sheet,
    update_lead_status_in_sheet,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _run_async(awaitable):
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(awaitable)

    result: dict[str, object] = {}
    error: dict[str, Exception] = {}

    def runner() -> None:
        try:
            result["value"] = asyncio.run(awaitable)
        except Exception as exc:
            error["value"] = exc

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()
    thread.join()

    if "value" in error:
        raise error["value"]
    return result.get("value")


def _provider(clinic: dict) -> str:
    provider = str(clinic.get("spreadsheet_provider") or "").strip().lower()
    if provider in {"google", "excel"}:
        return provider
    if clinic.get("google_sheet_id"):
        return "google"
    if clinic.get("excel_workbook_id"):
        return "excel"
    return ""


def append_lead_for_clinic(clinic: dict, lead: dict) -> None:
    provider = _provider(clinic)
    try:
        if provider == "excel":
            _run_async(append_lead_to_workbook(clinic, lead))
            return
        if provider == "google" and clinic.get("google_sheet_id"):
            append_lead_to_sheet(clinic["google_sheet_id"], clinic.get("google_sheet_tab"), lead)
    except Exception as exc:
        logger.error(f"Spreadsheet lead sync failed: {exc}")


def update_lead_status_for_clinic(clinic: dict, lead_id: str, new_status: str) -> None:
    provider = _provider(clinic)
    try:
        if provider == "excel":
            _run_async(update_lead_status_in_workbook(clinic, lead_id, new_status))
            return
        if provider == "google" and clinic.get("google_sheet_id"):
            update_lead_status_in_sheet(clinic["google_sheet_id"], clinic.get("google_sheet_tab"), lead_id, new_status)
    except Exception as exc:
        logger.error(f"Spreadsheet status sync failed: {exc}")


def get_available_slots_for_clinic(clinic: dict) -> list[dict]:
    provider = _provider(clinic)
    try:
        if provider == "excel":
            return _run_async(get_available_slots_from_workbook(clinic)) or []
        if provider == "google" and clinic.get("google_sheet_id"):
            return get_available_slots(clinic["google_sheet_id"], clinic.get("availability_sheet_tab") or "Availability")
    except Exception as exc:
        logger.error(f"Spreadsheet availability lookup failed: {exc}")
    return []


def reserve_slot_for_clinic(clinic: dict, row_index: int, patient_name: str, lead_id: str) -> bool:
    provider = _provider(clinic)
    try:
        if provider == "excel":
            return bool(_run_async(reserve_slot_in_workbook(clinic, row_index, patient_name, lead_id)))
        if provider == "google" and clinic.get("google_sheet_id"):
            return reserve_slot_in_sheet(
                clinic["google_sheet_id"],
                clinic.get("availability_sheet_tab") or "Availability",
                row_index,
                patient_name,
                lead_id,
            )
    except Exception as exc:
        logger.error(f"Spreadsheet slot reservation failed: {exc}")
    return False
