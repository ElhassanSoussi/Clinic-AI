from __future__ import annotations

from types import SimpleNamespace

from app.services.chat_service import BookingData, ChatContext, save_confirmed_lead


class FakeConversationTable:
    def __init__(self) -> None:
        self.updated_payload = None
        self.updated_id = None

    def update(self, payload):
        self.updated_payload = payload
        return self

    def eq(self, field, value):
        if field == "id":
            self.updated_id = value
        return self

    def execute(self):
        return SimpleNamespace(data=[{"id": self.updated_id, **(self.updated_payload or {})}])


class FakeDb:
    def __init__(self) -> None:
        self.conversations = FakeConversationTable()

    def table(self, name: str):
        assert name == "conversations"
        return self.conversations


def test_save_confirmed_lead_creates_lead_and_links_conversation(monkeypatch):
    fake_db = FakeDb()
    monkeypatch.setattr("app.services.chat_service.create_lead", lambda clinic_id, data: {"id": "lead-42"})

    context = ChatContext(
        db=fake_db,
        clinic={"name": "Bright Smile Dental"},
        clinic_id="clinic-1",
        conversation_id="conversation-1",
        session_id="session-1",
        user_message="Yes, that works",
        booking_data=BookingData(
            reason="Cleaning",
            datetime="Tuesday at 10:00 AM",
            name="Taylor Smith",
            phone="+19175551234",
            email="taylor@example.com",
            slot_row_index=12,
            slot_source="availability",
        ),
        available_slots=[],
        slot_options=[],
        source="web_chat",
    )

    transition = save_confirmed_lead(context)

    assert transition.lead_created is True
    assert transition.lead_id == "lead-42"
    assert transition.next_state == "booking_complete"
    assert fake_db.conversations.updated_payload == {"lead_id": "lead-42"}
    assert fake_db.conversations.updated_id == "conversation-1"
