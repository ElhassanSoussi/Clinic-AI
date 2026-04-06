from __future__ import annotations

from types import SimpleNamespace

from app.routers import auth


class FakeAuthClient:
    def __init__(self, *, sign_up_error: Exception | None = None, sign_in_response: object | None = None) -> None:
        self._sign_up_error = sign_up_error
        self._sign_in_response = sign_in_response
        self.auth = self

    def sign_up(self, _: dict) -> object:
        if self._sign_up_error:
            raise self._sign_up_error
        return SimpleNamespace(user=None, session=None)

    def sign_in_with_password(self, _: dict) -> object:
        return self._sign_in_response


def test_register_returns_human_rate_limit_message(client, monkeypatch):
    fake_db = FakeAuthClient(sign_up_error=Exception("rate limit exceeded"))
    monkeypatch.setattr(auth, "get_supabase", lambda: fake_db)

    response = client.post(
        "/api/auth/register",
        json={
            "email": "owner@example.com",
            "password": "supersecret123",
            "full_name": "Owner User",
            "clinic_name": "Clinic One",
        },
    )

    assert response.status_code == 429
    assert response.json()["detail"] == "Too many sign-up attempts right now. Please wait a minute and try again."


def test_login_returns_authenticated_profile(client, monkeypatch):
    sign_in_response = SimpleNamespace(
        user=SimpleNamespace(id="user-1"),
        session=SimpleNamespace(access_token="token-123"),
    )
    fake_db = FakeAuthClient(sign_in_response=sign_in_response)

    monkeypatch.setattr(auth, "get_supabase", lambda: fake_db)
    monkeypatch.setattr(
        auth,
        "get_user_profile",
        lambda *_: SimpleNamespace(
            data={
                "id": "user-1",
                "email": "owner@example.com",
                "full_name": "Owner User",
                "clinic_id": "clinic-1",
                "clinics": {"slug": "clinic-one"},
            }
        ),
    )

    response = client.post(
        "/api/auth/login",
        json={"email": "owner@example.com", "password": "supersecret123"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["access_token"] == "token-123"
    assert payload["clinic_slug"] == "clinic-one"
    assert payload["requires_email_confirmation"] is False
