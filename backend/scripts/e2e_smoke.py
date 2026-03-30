"""Backend E2E smoke test — validates all routes respond correctly."""
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
passed = 0
failed = 0


def check(name, status, expected):
    global passed, failed
    ok = status == expected
    if ok:
        passed += 1
        print(f"  PASS: {name} → {status}")
    else:
        failed += 1
        print(f"  FAIL: {name} → {status} (expected {expected})")


# Public endpoints
r = client.get("/api")
check("GET /api (root)", r.status_code, 404)

r = client.get("/api/billing/plans")
check("GET /api/billing/plans", r.status_code, 200)

r = client.get("/api/clinics/nonexistent/branding")
check("GET /api/clinics/:slug/branding (404)", r.status_code, 404)

# Chat validation
r = client.post("/api/chat", json={"clinic_slug": "test", "session_id": "s1", "message": ""})
check("POST /api/chat (empty msg → 400)", r.status_code, 400)

r = client.post("/api/chat", json={"clinic_slug": "", "session_id": "s1", "message": "hi"})
check("POST /api/chat (empty slug → 400)", r.status_code, 400)

r = client.post("/api/chat", json={"clinic_slug": "test", "session_id": "", "message": "hi"})
check("POST /api/chat (empty session → 400)", r.status_code, 400)

# Auth-required endpoints must return 403 (HTTPBearer returns 403 when no auth header)
for path in ["/api/clinics/me", "/api/leads", "/api/billing/status", "/api/conversations"]:
    r = client.get(path)
    check(f"GET {path} (no auth → 403)", r.status_code, 403)

# Auth validation
r = client.post("/api/auth/register", json={})
check("POST /api/auth/register (empty → 422)", r.status_code, 422)

r = client.post("/api/auth/login", json={})
check("POST /api/auth/login (empty → 422)", r.status_code, 422)

# Write endpoints without auth
r = client.put("/api/clinics/me", json={"name": "test"})
check("PUT /api/clinics/me (no auth → 403)", r.status_code, 403)

r = client.post("/api/billing/checkout", json={"plan_id": "professional", "success_url": "x", "cancel_url": "x"})
check("POST /api/billing/checkout (no auth → 403)", r.status_code, 403)

r = client.post("/api/billing/portal", json={"return_url": "x"})
check("POST /api/billing/portal (no auth → 403)", r.status_code, 403)

# Events endpoint
r = client.post("/api/events", json={"event_type": "demo_opened"})
check("POST /api/events (valid type → 201)", r.status_code, 201)

r = client.post("/api/events", json={"event_type": "invalid_type"})
check("POST /api/events (invalid type → 400)", r.status_code, 400)

# Contact endpoint
r = client.post("/api/contact", json={"name": "Test", "email": "test@example.com"})
check("POST /api/contact (valid → 201)", r.status_code, 201)

r = client.post("/api/contact", json={"name": "", "email": "bad"})
check("POST /api/contact (invalid → 422)", r.status_code, 422)

# OAuth complete endpoint
r = client.post("/api/auth/oauth-complete", json={})
check("POST /api/auth/oauth-complete (empty → 422)", r.status_code, 422)

r = client.post("/api/auth/oauth-complete", json={"access_token": "invalid"})
check("POST /api/auth/oauth-complete (bad token → 401)", r.status_code, 401)

print(f"\n{'='*40}")
print(f"Results: {passed} passed, {failed} failed out of {passed+failed}")
if failed == 0:
    print("ALL TESTS PASSED")
else:
    print("SOME TESTS FAILED")
