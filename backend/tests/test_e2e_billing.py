"""
Full E2E Monetization Loop Test
================================
Simulates the complete business cycle:
1. Clinic starts on trial
2. Billing status shows trial correctly
3. AI chat works while under limit
4. Clinic hits lead limit
5. AI chat is blocked with upgrade prompt
6. Billing status shows at-limit state
7. Webhook simulates successful upgrade → professional
8. Billing status now shows professional/active
9. AI chat is unblocked
10. Lead counter works on new plan
11. Webhook simulates subscription deletion → downgrade
12. Billing status shows downgraded state
"""
import os
import json
import requests
from supabase import create_client

BASE = "http://localhost:7001/api"
SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibXRwaG50a3R3bGZ0cGxzdmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODkwNTMsImV4cCI6MjA5MDA2NTA1M30.vLkivgeWajqQhOhr1_MnOK2nIWisQUdXT0cYksBUHFM"

CLINIC_ID = "133e3e0f-af5f-42d5-a2c1-dc8b3c8ccb3d"
SLUG = "billing-test-5dd81c"
EMAIL = "billing-test@clinic.ai"
PASSWORD = "BillingTest2026!"

db = create_client(SUPABASE_URL, SERVICE_KEY)

# Get auth token
anon = create_client(SUPABASE_URL, ANON_KEY)
auth = anon.auth.sign_in_with_password({"email": EMAIL, "password": PASSWORD})
TOKEN = auth.session.access_token
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

passed = 0
failed = 0


def check(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  PASS: {name}")
    else:
        failed += 1
        print(f"  FAIL: {name} — {detail}")


def reset_clinic():
    db.table("clinics").update({
        "plan": "trial",
        "subscription_status": "trialing",
        "monthly_lead_limit": 25,
        "monthly_leads_used": 0,
        "stripe_customer_id": "",
        "stripe_subscription_id": "",
    }).eq("id", CLINIC_ID).execute()


def read_clinic():
    return db.table("clinics").select("*").eq("id", CLINIC_ID).single().execute().data


# ─── SETUP ───────────────────────────────────────────────────────────
print("=" * 60)
print("FULL E2E MONETIZATION LOOP TEST")
print("=" * 60)
reset_clinic()

# ─── STEP 1: Clinic on Free Trial ────────────────────────────────────
print("\n── STEP 1: Clinic starts on Free Trial")
c = read_clinic()
check("plan is trial", c["plan"] == "trial", c["plan"])
check("status is trialing", c["subscription_status"] == "trialing", c["subscription_status"])
check("lead limit 25", c["monthly_lead_limit"] == 25, c["monthly_lead_limit"])
check("leads used 0", c["monthly_leads_used"] == 0, c["monthly_leads_used"])

# ─── STEP 2: Billing API shows trial ─────────────────────────────────
print("\n── STEP 2: Billing status API returns trial state")
r = requests.get(f"{BASE}/billing/status", headers=HEADERS)
check("status 200", r.status_code == 200, r.status_code)
bs = r.json()
check("plan=trial", bs["plan"] == "trial", bs["plan"])
check("plan_name=Free Trial", bs["plan_name"] == "Free Trial", bs["plan_name"])
check("status=trialing", bs["subscription_status"] == "trialing", bs["subscription_status"])
check("limit=25", bs["monthly_lead_limit"] == 25, bs["monthly_lead_limit"])
check("used=0", bs["monthly_leads_used"] == 0, bs["monthly_leads_used"])
check("no stripe sub", bs["has_stripe_subscription"] == False, bs["has_stripe_subscription"])

# ─── STEP 3: Plans API returns plan list ──────────────────────────────
print("\n── STEP 3: Plans API returns 3 plans")
r = requests.get(f"{BASE}/billing/plans")
plans = r.json()
check("3 plans returned", len(plans) == 3, len(plans))
check("trial plan exists", any(p["id"] == "trial" for p in plans))
check("professional $49", any(p["id"] == "professional" and p["monthly_price_cents"] == 4900 for p in plans))
check("premium $99", any(p["id"] == "premium" and p["monthly_price_cents"] == 9900 for p in plans))

# ─── STEP 4: Chat works under limit ──────────────────────────────────
print("\n── STEP 4: AI chat works while under lead limit")
chat = requests.post(f"{BASE}/chat", json={
    "clinic_slug": SLUG, "session_id": "e2e-test-1", "message": "Hi"
})
check("chat status 200", chat.status_code == 200, chat.status_code)
cr = chat.json()
check("intent is not limit_reached", cr["intent"] != "limit_reached", cr["intent"])
check("intent is not error", cr["intent"] != "error", cr["intent"])
check("got a real reply", len(cr["reply"]) > 10, cr["reply"][:50])

# ─── STEP 5: Hit lead limit ──────────────────────────────────────────
print("\n── STEP 5: Clinic hits lead limit (25 leads used)")
db.table("clinics").update({"monthly_leads_used": 25}).eq("id", CLINIC_ID).execute()

# ─── STEP 6: Chat blocked at limit ───────────────────────────────────
print("\n── STEP 6: AI chat blocked with upgrade prompt")
chat = requests.post(f"{BASE}/chat", json={
    "clinic_slug": SLUG, "session_id": "e2e-test-2", "message": "I need an appointment"
})
cr = chat.json()
check("intent is limit_reached", cr["intent"] == "limit_reached", cr["intent"])
check("lead not created", cr["lead_created"] == False)
check("mentions limit", "limit" in cr["reply"].lower(), cr["reply"][:80])

# ─── STEP 7: Billing API shows at-limit ──────────────────────────────
print("\n── STEP 7: Billing status shows at-limit state")
bs = requests.get(f"{BASE}/billing/status", headers=HEADERS).json()
check("leads_used=25", bs["monthly_leads_used"] == 25, bs["monthly_leads_used"])
check("limit=25 (at cap)", bs["monthly_lead_limit"] == 25, bs["monthly_lead_limit"])

# ─── STEP 8: Simulate upgrade via webhook ─────────────────────────────
print("\n── STEP 8: Webhook: checkout.session.completed → Professional")
from app.services.billing_service import handle_checkout_completed
handle_checkout_completed({
    "id": "cs_test_e2e",
    "metadata": {"clinic_id": CLINIC_ID, "plan_id": "professional"},
    "subscription": "sub_e2e_test",
    "customer": "cus_e2e_test",
})
c = read_clinic()
check("plan=professional", c["plan"] == "professional", c["plan"])
check("status=active", c["subscription_status"] == "active", c["subscription_status"])
check("limit=200", c["monthly_lead_limit"] == 200, c["monthly_lead_limit"])
check("stripe_sub saved", c["stripe_subscription_id"] == "sub_e2e_test")
check("stripe_cus saved", c["stripe_customer_id"] == "cus_e2e_test")

# ─── STEP 9: Billing API shows upgraded plan ──────────────────────────
print("\n── STEP 9: Billing status shows Professional/active")
bs = requests.get(f"{BASE}/billing/status", headers=HEADERS).json()
check("plan=professional", bs["plan"] == "professional", bs["plan"])
check("plan_name=Professional", bs["plan_name"] == "Professional", bs["plan_name"])
check("status=active", bs["subscription_status"] == "active", bs["subscription_status"])
check("limit=200", bs["monthly_lead_limit"] == 200, bs["monthly_lead_limit"])
check("has_stripe_subscription", bs["has_stripe_subscription"] == True)

# ─── STEP 10: Chat unblocked after upgrade ────────────────────────────
print("\n── STEP 10: AI chat works again after upgrade (under 200 limit)")
chat = requests.post(f"{BASE}/chat", json={
    "clinic_slug": SLUG, "session_id": "e2e-test-3", "message": "Hello, I need to book"
})
cr = chat.json()
check("not blocked", cr["intent"] != "limit_reached", cr["intent"])
check("not error", cr["intent"] != "error", cr["intent"])
check("got real reply", len(cr["reply"]) > 10, cr["reply"][:60])

# ─── STEP 11: Invoice paid resets counter ──────────────────────────────
print("\n── STEP 11: invoice.paid resets monthly lead counter")
from app.services.billing_service import handle_invoice_paid
db.table("clinics").update({"monthly_leads_used": 150}).eq("id", CLINIC_ID).execute()
handle_invoice_paid({"customer": "cus_e2e_test"})
c = read_clinic()
check("leads_used reset to 0", c["monthly_leads_used"] == 0, c["monthly_leads_used"])

# ─── STEP 12: Subscription deleted → downgrade ────────────────────────
print("\n── STEP 12: Subscription deleted → downgrade to trial")
from app.services.billing_service import handle_subscription_deleted
handle_subscription_deleted({
    "id": "sub_e2e_test",
    "metadata": {"clinic_id": CLINIC_ID},
})
c = read_clinic()
check("plan=trial", c["plan"] == "trial", c["plan"])
check("status=inactive", c["subscription_status"] == "inactive", c["subscription_status"])
check("limit=25", c["monthly_lead_limit"] == 25, c["monthly_lead_limit"])
check("sub_id cleared", c["stripe_subscription_id"] == "")

# ─── STEP 13: Chat blocked when inactive ──────────────────────────────
print("\n── STEP 13: Chat blocked when subscription is inactive")
chat = requests.post(f"{BASE}/chat", json={
    "clinic_slug": SLUG, "session_id": "e2e-test-4", "message": "Hello"
})
cr = chat.json()
check("intent=error (inactive)", cr["intent"] == "error", cr["intent"])
check("mentions inactive", "inactive" in cr["reply"].lower(), cr["reply"][:80])

# ─── STEP 14: Re-enable trialing ──────────────────────────────────────
print("\n── STEP 14: Reset to trialing — chat works again")
db.table("clinics").update({
    "subscription_status": "trialing", "monthly_leads_used": 0
}).eq("id", CLINIC_ID).execute()
chat = requests.post(f"{BASE}/chat", json={
    "clinic_slug": SLUG, "session_id": "e2e-test-5", "message": "Hi there"
})
cr = chat.json()
check("chat works on trialing", cr["intent"] != "error" and cr["intent"] != "limit_reached", cr["intent"])

# ─── RESULTS ──────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"E2E TEST RESULTS: {passed} passed, {failed} failed")
print("=" * 60)

# Cleanup
reset_clinic()

if failed > 0:
    exit(1)
