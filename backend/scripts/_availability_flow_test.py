import json
import time
import urllib.request

from app.dependencies import get_supabase

BASE = "http://127.0.0.1:7001/api/chat"
SLUG = "demo-clinic"


def send(session_id: str, message: str) -> dict:
    payload = json.dumps(
        {
            "clinic_slug": SLUG,
            "session_id": session_id,
            "message": message,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        BASE,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def log(flow: str, step: str, msg: str, res: dict) -> None:
    print(f"[{flow}] {step}")
    print(f"  USER: {msg}")
    print(f"  AI  : {res['reply'][:260]}")
    print(
        f"  intent={res['intent']} lead_created={res['lead_created']} lead_id={res['lead_id']}"
    )


def run() -> None:
    db = get_supabase()
    clinic = (
        db.table("clinics")
        .select("id,availability_enabled,availability_sheet_tab")
        .eq("slug", SLUG)
        .single()
        .execute()
        .data
    )
    clinic_id = clinic["id"]
    orig_enabled = clinic.get("availability_enabled")
    orig_tab = clinic.get("availability_sheet_tab")

    suffix = str(int(time.time()))

    try:
        print("\n=== Flow A: availability-enabled booking ===")
        s_a = f"flowA_avail_{suffix}"
        for i, m in enumerate(["hello", "I want to book an appointment", "tooth cleaning"], 1):
            out = send(s_a, m)
            log("A", f"step {i}", m, out)

        for i, m in enumerate(
            [
                "I will take the first one",
                "Jane Slot",
                "555-222-1111",
                "jane.slot@example.com",
                "yes",
            ],
            4,
        ):
            out = send(s_a, m)
            log("A", f"step {i}", m, out)

        print("\n=== Flow B: no availability configured ===")
        db.table("clinics").update({"availability_enabled": False}).eq("id", clinic_id).execute()
        s_b = f"flowB_noavail_{suffix}"
        for i, m in enumerate(["hello", "book appointment", "checkup"], 1):
            out = send(s_b, m)
            log("B", f"step {i}", m, out)

        print("\n=== Flow C: no slots available fallback ===")
        db.table("clinics").update(
            {"availability_enabled": True, "availability_sheet_tab": "NoSuchTab"}
        ).eq("id", clinic_id).execute()
        s_c = f"flowC_noslots_{suffix}"
        for i, m in enumerate(["hello", "book appointment", "consultation"], 1):
            out = send(s_c, m)
            log("C", f"step {i}", m, out)

        print("\n=== Flow D: correction after slot-based confirmation ===")
        db.table("clinics").update(
            {"availability_enabled": True, "availability_sheet_tab": orig_tab}
        ).eq("id", clinic_id).execute()
        s_d = f"flowD_corr_{suffix}"
        for i, m in enumerate(
            [
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
            ],
            1,
        ):
            out = send(s_d, m)
            log("D", f"step {i}", m, out)

    finally:
        db.table("clinics").update(
            {"availability_enabled": orig_enabled, "availability_sheet_tab": orig_tab}
        ).eq("id", clinic_id).execute()
        print("\nRestored clinic availability config.")


if __name__ == "__main__":
    run()
