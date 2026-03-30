import json
import sys
import time
import urllib.request

from app.dependencies import get_supabase
from app.services.google_sheets import get_gspread_client, extract_spreadsheet_id

BASE = "http://127.0.0.1:7001/api/chat"
SLUG = "demo-clinic"


AVAIL_HEADERS = ["Date", "Time", "Status", "Patient Name", "Lead ID"]


def ensure_temp_availability_tabs(sheet_id: str, suffix: str) -> tuple[str, str]:
    """Create deterministic temp tabs for testing slot and no-slot scenarios."""
    client = get_gspread_client()
    if not client:
        raise RuntimeError("Google Sheets client unavailable")

    spreadsheet = client.open_by_key(extract_spreadsheet_id(sheet_id))
    tab_with_slots = f"AvailabilityTemp_{suffix}"
    tab_no_slots = f"AvailabilityEmpty_{suffix}"

    ws1 = spreadsheet.add_worksheet(title=tab_with_slots, rows=30, cols=8)
    ws1.append_row(AVAIL_HEADERS)
    ws1.append_row(["Tomorrow", "10:00 AM", "available", "", ""])
    ws1.append_row(["Tomorrow", "12:00 PM", "available", "", ""])
    ws1.append_row(["Tomorrow", "2:00 PM", "available", "", ""])

    ws2 = spreadsheet.add_worksheet(title=tab_no_slots, rows=30, cols=8)
    ws2.append_row(AVAIL_HEADERS)
    ws2.append_row(["Tomorrow", "9:00 AM", "reserved", "John", "x-1"])
    ws2.append_row(["Tomorrow", "11:00 AM", "booked", "Jane", "x-2"])

    return tab_with_slots, tab_no_slots


def cleanup_temp_tabs(sheet_id: str, tab_names: list[str]) -> None:
    client = get_gspread_client()
    if not client:
        return

    spreadsheet = client.open_by_key(extract_spreadsheet_id(sheet_id))
    for name in tab_names:
        try:
            ws = spreadsheet.worksheet(name)
            spreadsheet.del_worksheet(ws)
        except Exception:
            pass


def send(session_id: str, message: str) -> dict:
    payload = json.dumps({"clinic_slug": SLUG, "session_id": session_id, "message": message}).encode("utf-8")
    req = urllib.request.Request(BASE, data=payload, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def summarize(tag: str, msg: str, out: dict) -> None:
    print(f"{tag} | {msg}")
    print(f"intent={out['intent']} lead_created={out['lead_created']} lead_id={out['lead_id']}")
    print(f"reply={out['reply'][:220]}")


def run_flow(flow: str) -> None:
    db = get_supabase()
    clinic = db.table("clinics").select("id,google_sheet_id,availability_enabled,availability_sheet_tab").eq("slug", SLUG).single().execute().data
    clinic_id = clinic["id"]
    sheet_id = clinic.get("google_sheet_id")
    orig_enabled = clinic.get("availability_enabled")
    orig_tab = clinic.get("availability_sheet_tab")

    suffix = str(int(time.time()))
    sid = f"{flow}_{suffix}"
    temp_tabs: list[str] = []

    if sheet_id:
        try:
            slots_tab, empty_tab = ensure_temp_availability_tabs(sheet_id, suffix)
            temp_tabs.extend([slots_tab, empty_tab])
        except Exception as e:
            print(f"warning: failed to create temp availability tabs: {e}")
            slots_tab, empty_tab = orig_tab, "NoSuchTab"
    else:
        slots_tab, empty_tab = orig_tab, "NoSuchTab"

    try:
        if flow == "A":
            db.table("clinics").update({"availability_enabled": True, "availability_sheet_tab": slots_tab}).eq("id", clinic_id).execute()
            steps = [
                "hello",
                "I want to book an appointment",
                "tooth cleaning",
                "I will take the first one",
                "Jane Slot",
                "555-222-1111",
                "jane.slot@example.com",
                "yes",
            ]
        elif flow == "B":
            db.table("clinics").update({"availability_enabled": False}).eq("id", clinic_id).execute()
            steps = ["hello", "book appointment", "checkup"]
        elif flow == "C":
            db.table("clinics").update({"availability_enabled": True, "availability_sheet_tab": empty_tab}).eq("id", clinic_id).execute()
            steps = ["hello", "book appointment", "consultation"]
        elif flow == "D":
            db.table("clinics").update({"availability_enabled": True, "availability_sheet_tab": slots_tab}).eq("id", clinic_id).execute()
            steps = [
                "hello",
                "book appointment",
                "cleaning",
                "I choose first slot",
                "Alex Slot",
                "555-888-1000",
                "alex@slot.com",
                "The phone number is wrong",
                "555-888-9999",
                "yes",
            ]
        else:
            raise ValueError("flow must be A/B/C/D")

        print(f"=== Flow {flow} ===")
        for idx, msg in enumerate(steps, 1):
            out = send(sid, msg)
            summarize(f"step {idx}", msg, out)

    finally:
        db.table("clinics").update({"availability_enabled": orig_enabled, "availability_sheet_tab": orig_tab}).eq("id", clinic_id).execute()
        if sheet_id and temp_tabs:
            cleanup_temp_tabs(sheet_id, temp_tabs)
        print("restored=true")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: python _availability_flow_runner.py [A|B|C|D]")
        sys.exit(1)
    run_flow(sys.argv[1].upper())
