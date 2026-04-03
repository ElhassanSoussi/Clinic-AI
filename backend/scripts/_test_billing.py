"""Create a billing test user + clinic and get JWT token."""
import os
import uuid
from supabase import create_client

SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_SERVICE_KEY"]
SUPABASE_URL = os.environ["SUPABASE_URL"]
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibXRwaG50a3R3bGZ0cGxzdmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODkwNTMsImV4cCI6MjA5MDA2NTA1M30.vLkivgeWajqQhOhr1_MnOK2nIWisQUdXT0cYksBUHFM"

db = create_client(SUPABASE_URL, SERVICE_KEY)

email = "billing-test@clinic.ai"
password = "BillingTest2026!"

# Clean up any existing test user
users = db.auth.admin.list_users()
for u in users:
    if u.email == email:
        # Remove profile + clinic first
        profile = db.table("users").select("clinic_id").eq("id", u.id).execute()
        if profile.data:
            cid = profile.data[0].get("clinic_id")
            db.table("users").delete().eq("id", u.id).execute()
            if cid:
                db.table("leads").delete().eq("clinic_id", cid).execute()
                db.table("clinics").delete().eq("id", cid).execute()
        db.auth.admin.delete_user(u.id)
        print(f"Cleaned up existing test user {u.id}")

# Create fresh auth user
auth_res = db.auth.admin.create_user({
    "email": email,
    "password": password,
    "email_confirm": True,
})
user_id = auth_res.user.id
print(f"Auth user: {user_id}")

# Create clinic on trial plan
slug = f"billing-test-{uuid.uuid4().hex[:6]}"
clinic_res = db.table("clinics").insert({
    "name": "Billing Test Clinic",
    "slug": slug,
    "email": email,
    "plan": "trial",
    "subscription_status": "trialing",
    "monthly_lead_limit": 25,
    "monthly_leads_used": 0,
    "onboarding_completed": True,
}).execute()
clinic_id = clinic_res.data[0]["id"]
print(f"Clinic: {clinic_id} / {slug}")

# Create user profile
db.table("users").insert({
    "id": user_id,
    "clinic_id": clinic_id,
    "full_name": "Dr. Billing Test",
    "role": "owner",
    "email": email,
}).execute()
print("User profile created")

# Sign in to get JWT
anon = create_client(SUPABASE_URL, ANON_KEY)
res = anon.auth.sign_in_with_password({"email": email, "password": password})
token = res.session.access_token
print(f"\nTOKEN={token}")
print(f"\nCLINIC_ID={clinic_id}")
print(f"SLUG={slug}")
