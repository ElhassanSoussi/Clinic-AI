from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.services import frontdesk_service


def test_send_due_reminders_processes_only_due_items(monkeypatch):
    monkeypatch.setattr(
        frontdesk_service,
        "build_reminder_previews",
        lambda clinic_id: [
            {"lead_id": "lead-due", "is_due": True},
            {"lead_id": "lead-later", "is_due": False},
            {"lead_id": "lead-due-2", "is_due": True},
        ],
    )
    monkeypatch.setattr(
        frontdesk_service,
        "send_reminder_for_lead",
        lambda clinic_id, lead_id: {"id": f"event-{lead_id}", "status": "sent"},
    )

    result = frontdesk_service.send_due_reminders("clinic-1")

    assert result["processed_count"] == 2
    assert result["sent_count"] == 2
    assert result["failed_count"] == 0
    assert len(result["events"]) == 2


def test_run_auto_follow_up_tasks_creates_tasks_after_delay(monkeypatch):
    now = datetime.now(timezone.utc)
    monkeypatch.setattr(
        frontdesk_service,
        "_load_frontdesk_settings",
        lambda clinic_id: {
            "follow_up_automation_enabled": True,
            "follow_up_delay_minutes": 45,
        },
    )
    monkeypatch.setattr(
        frontdesk_service,
        "build_opportunities",
        lambda clinic_id: [
            {
                "id": "opp-old",
                "type": "follow_up_needed",
                "priority": "high",
                "title": "Reach back out",
                "detail": "Patient has not replied.",
                "customer_key": "cust-1",
                "customer_name": "Taylor Smith",
                "lead_id": "lead-1",
                "conversation_id": "conv-1",
                "occurred_at": (now - timedelta(minutes=60)).isoformat(),
                "follow_up_task_id": None,
            },
            {
                "id": "opp-fresh",
                "type": "follow_up_needed",
                "priority": "medium",
                "title": "Fresh request",
                "detail": "Too new for auto follow-up.",
                "customer_key": "cust-2",
                "customer_name": "Jordan Lee",
                "lead_id": "lead-2",
                "conversation_id": "conv-2",
                "occurred_at": (now - timedelta(minutes=10)).isoformat(),
                "follow_up_task_id": None,
            },
        ],
    )
    monkeypatch.setattr(
        frontdesk_service,
        "create_follow_up_task",
        lambda **kwargs: {"id": f"task-{kwargs['source_key']}", **kwargs},
    )

    result = frontdesk_service.run_auto_follow_up_tasks("clinic-1")

    assert result["created_count"] == 1
    assert result["tasks"][0]["source_key"] == "opp-old"
