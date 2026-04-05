import asyncio
import os
import secrets
import sys
from app.config import get_settings
from app.dependencies import get_supabase

async def create_bypassed_user():
    print("Connecting to Supabase...")
    supabase = get_supabase()
    
    # 1. Create a clinic record with fake data
    settings = get_settings()
    test_clinic = {
        "name": "My AI Clinic",
        "slug": f"my-ai-clinic-{hash(settings.supabase_url) % 1000}",
        "email": "hello@my-ai-clinic.com",
    }
    
    try:
        clinic_res = supabase.table("clinics").insert(test_clinic).execute()
        clinic_id = clinic_res.data[0]["id"]
        print(f"Created clinic: {test_clinic['name']} (ID: {clinic_id})")
        
        # 2. Tell Supabase Auth to forcefully create an account 
        # (Using the service role key bypasses rate limits)
        email = os.environ.get("TEST_USER_EMAIL", "admin@clinicai.com")
        password = os.environ.get("TEST_USER_PASSWORD") or secrets.token_urlsafe(16)
        print(f"Creating user account for {email}...")
        
        auth_res = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": "Dr. Admin",
                "clinic_id": clinic_id
            }
        })
        user_id = auth_res.user.id
        print(f"Auth user created: {user_id}")
        
        # 3. Create the profile row matching the auth user
        supabase.table("users").insert({
            "id": user_id,
            "clinic_id": clinic_id,
            "full_name": "Dr. Admin",
            "role": "owner",
            "email": email
        }).execute()
        
        print("\n" + "="*50)
        print("SUCCESS! I have forcefully created an account for you.")
        print("You can bypass the registration page and log in immediately:")
        print(f"  Email:    {email}")
        print(f"  Password: {password}")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"Error creating user: {e}")

if __name__ == "__main__":
    asyncio.run(create_bypassed_user())
