from __future__ import annotations

from app.dependencies import get_current_user
from app.routers import leads


def test_create_lead_route_preserves_contract(client, monkeypatch):
    client.app.dependency_overrides[get_current_user] = lambda: {
        "id": "user-1",
        "clinic_id": "clinic-1",
        "email": "owner@example.com",
    }
    monkeypatch.setattr(
        leads,
        "create_lead",
        lambda clinic_id, data: {
            "id": "lead-1",
            "clinic_id": clinic_id,
            "patient_name": data["patient_name"],
            "patient_phone": data["patient_phone"],
            "patient_email": data["patient_email"],
            "reason_for_visit": data["reason_for_visit"],
            "preferred_datetime_text": data["preferred_datetime_text"],
            "slot_row_index": None,
            "slot_source": "manual",
            "status": "new",
            "appointment_status": "request_open",
            "appointment_starts_at": None,
            "appointment_ends_at": None,
            "reminder_status": "not_ready",
            "reminder_scheduled_for": None,
            "reminder_note": "",
            "deposit_required": False,
            "deposit_amount_cents": None,
            "deposit_status": "not_required",
            "deposit_checkout_session_id": "",
            "deposit_payment_intent_id": "",
            "deposit_requested_at": None,
            "deposit_paid_at": None,
            "source": data["source"],
            "notes": data["notes"],
            "created_at": "2026-04-05T12:00:00+00:00",
            "updated_at": "2026-04-05T12:00:00+00:00",
        },
    )

    response = client.post(
        "/api/leads",
        headers={"Authorization": "Bearer token"},
        json={
            "patient_name": "Taylor Smith",
            "patient_phone": "+19175551234",
            "patient_email": "taylor@example.com",
            "reason_for_visit": "Cleaning",
            "preferred_datetime_text": "Tuesday at 10:00 AM",
            "source": "web_chat",
            "notes": "Requested through widget",
        },
    )

    client.app.dependency_overrides.clear()

    assert response.status_code == 201
    payload = response.json()
    assert payload["id"] == "lead-1"
    assert payload["status"] == "new"
    assert payload["reason_for_visit"] == "Cleaning"
