"""Seed (or update) the demo clinic with realistic leads, conversations, and activity."""
import json
from datetime import datetime, timedelta, timezone

from app.dependencies import get_supabase

db = get_supabase()

STANDARD_WEEKDAY_HOURS = "8:00 AM - 6:00 PM"

# ── Clinic ─────────────────────────────────────────────────────

DEMO_CLINIC = {
    "name": "Bright Smile Dental",
    "slug": "demo",
    "phone": "(555) 234-5678",
    "email": "hello@brightsmile.demo",
    "address": "742 Evergreen Terrace, Suite 200, Springfield, IL 62704",
    "greeting_message": "Hi there! Welcome to Bright Smile Dental. I can help you book an appointment, answer questions about our services, or check our hours. How can I help you today?",
    "fallback_message": "I'd be happy to take down your details so our team can get back to you. Could I get your name to start?",
    "business_hours": json.dumps({
        "monday": STANDARD_WEEKDAY_HOURS,
        "tuesday": STANDARD_WEEKDAY_HOURS,
        "wednesday": STANDARD_WEEKDAY_HOURS,
        "thursday": "8:00 AM - 7:00 PM",
        "friday": "8:00 AM - 5:00 PM",
        "saturday": "9:00 AM - 2:00 PM",
        "sunday": "Closed",
    }),
    "services": json.dumps([
        "Teeth Cleaning",
        "Teeth Whitening",
        "Emergency Dental Care",
        "Dental Exam & X-Rays",
        "Fillings & Restorations",
        "Root Canal Therapy",
    ]),
    "faq": json.dumps([
        {
            "question": "Do you accept insurance?",
            "answer": "Yes! We accept most major dental insurance plans including Delta Dental, Cigna, Aetna, and MetLife. Contact us to verify your specific plan.",
        },
        {
            "question": "How much does a teeth cleaning cost?",
            "answer": "A standard cleaning starts at $99 without insurance. With insurance, your copay is typically $0-25. We also offer a membership plan for uninsured patients.",
        },
        {
            "question": "Where are you located?",
            "answer": "We're at 742 Evergreen Terrace, Suite 200, Springfield, IL 62704. Free parking is available in the lot behind the building.",
        },
        {
            "question": "Do you handle dental emergencies?",
            "answer": "Yes, we reserve same-day slots for emergencies like severe tooth pain, chipped teeth, or lost fillings. Call us or book through the chat and we'll get you in as soon as possible.",
        },
    ]),
    "plan": "professional",
    "subscription_status": "active",
    "monthly_lead_limit": 200,
    "monthly_leads_used": 10,
    "onboarding_completed": True,
    "onboarding_step": 7,
    "assistant_name": "Bright Smile Assistant",
    "primary_color": "#0d9488",
    "notifications_enabled": True,
    "notification_email": "hello@brightsmile.demo",
    "reminder_enabled": True,
    "reminder_lead_hours": 24,
    "follow_up_automation_enabled": True,
    "follow_up_delay_minutes": 45,
}

# Upsert clinic
result = db.table("clinics").select("id").eq("slug", "demo").execute()

if result.data:
    clinic_id = result.data[0]["id"]
    db.table("clinics").update(DEMO_CLINIC).eq("id", clinic_id).execute()
    print(f"Updated demo clinic: {clinic_id}")
else:
    insert = db.table("clinics").insert(DEMO_CLINIC).execute()
    clinic_id = insert.data[0]["id"]
    print(f"Created demo clinic: {clinic_id}")


# ── Leads ──────────────────────────────────────────────────────

now = datetime.now(timezone.utc)

def ago(**kwargs):
    """Return ISO timestamp for (now - timedelta)."""
    return (now - timedelta(**kwargs)).isoformat()


def ahead(**kwargs):
    return (now + timedelta(**kwargs)).isoformat()

# Clear old demo leads so reruns stay clean
db.table("leads").delete().eq("clinic_id", clinic_id).execute()

DEMO_LEADS = [
    {
        "patient_name": "Maria Santos",
        "patient_phone": "(555) 111-2233",
        "patient_email": "maria.santos@email.com",
        "reason_for_visit": "Teeth cleaning — it's been about 6 months",
        "preferred_datetime_text": "Tuesday morning",
        "status": "booked",
        "appointment_status": "confirmed",
        "appointment_starts_at": ahead(days=2, hours=14),
        "reminder_status": "ready",
        "reminder_scheduled_for": ahead(days=1, hours=14),
        "deposit_required": True,
        "deposit_amount_cents": 2500,
        "deposit_status": "requested",
        "source": "web_chat",
        "notes": "Confirmed for Tue 10 AM. Has Delta Dental insurance.",
        "created_at": ago(days=6, hours=3),
        "updated_at": ago(days=5, hours=1),
    },
    {
        "patient_name": "James O'Brien",
        "patient_phone": "(555) 222-3344",
        "patient_email": "jobrien@email.com",
        "reason_for_visit": "Chipped front tooth — happened yesterday",
        "preferred_datetime_text": "As soon as possible",
        "status": "booked",
        "appointment_status": "reschedule_requested",
        "appointment_starts_at": ahead(days=1, hours=11),
        "reminder_status": "not_ready",
        "source": "web_chat",
        "notes": "Emergency slot — seen same day.",
        "created_at": ago(days=4, hours=8),
        "updated_at": ago(days=4, hours=5),
    },
    {
        "patient_name": "Priya Patel",
        "patient_phone": "(555) 333-4455",
        "patient_email": "priya.p@email.com",
        "reason_for_visit": "Teeth whitening consultation",
        "preferred_datetime_text": "Thursday after 3 PM",
        "status": "contacted",
        "source": "web_chat",
        "notes": "Left voicemail — waiting to confirm.",
        "created_at": ago(days=3, hours=10),
        "updated_at": ago(days=2, hours=6),
    },
    {
        "patient_name": "David Kim",
        "patient_phone": "(555) 444-5566",
        "patient_email": "dkim@email.com",
        "reason_for_visit": "Regular dental exam and X-rays",
        "preferred_datetime_text": "Wednesday morning",
        "status": "contacted",
        "source": "web_chat",
        "notes": "Sent appointment options by email.",
        "created_at": ago(days=3, hours=4),
        "updated_at": ago(days=2, hours=2),
    },
    {
        "patient_name": "Sarah Mitchell",
        "patient_phone": "(555) 555-6677",
        "patient_email": "sarah.m@email.com",
        "reason_for_visit": "Sensitivity in lower right molar",
        "preferred_datetime_text": "Friday afternoon",
        "status": "new",
        "source": "web_chat",
        "notes": "",
        "created_at": ago(days=2, hours=7),
        "updated_at": ago(days=2, hours=7),
    },
    {
        "patient_name": "Michael Torres",
        "patient_phone": "(555) 666-7788",
        "patient_email": "mtorres@email.com",
        "reason_for_visit": "Filling fell out — need replacement",
        "preferred_datetime_text": "Any day this week",
        "status": "new",
        "source": "web_chat",
        "notes": "",
        "created_at": ago(days=1, hours=14),
        "updated_at": ago(days=1, hours=14),
    },
    {
        "patient_name": "Emily Chen",
        "patient_phone": "(555) 777-8899",
        "patient_email": "emily.chen@email.com",
        "reason_for_visit": "Teeth cleaning for my two kids (ages 8 and 11)",
        "preferred_datetime_text": "Saturday morning",
        "status": "new",
        "source": "web_chat",
        "notes": "",
        "created_at": ago(days=1, hours=5),
        "updated_at": ago(days=1, hours=5),
    },
    {
        "patient_name": "Robert Johnson",
        "patient_phone": "(555) 888-9900",
        "patient_email": "rjohnson@email.com",
        "reason_for_visit": "Second opinion on a root canal recommendation",
        "preferred_datetime_text": "Monday or Tuesday",
        "status": "new",
        "source": "web_chat",
        "notes": "",
        "created_at": ago(hours=18),
        "updated_at": ago(hours=18),
    },
    {
        "patient_name": "Lisa Nguyen",
        "patient_phone": "(555) 999-0011",
        "patient_email": "lisa.n@email.com",
        "reason_for_visit": "Dental exam — new patient",
        "preferred_datetime_text": "Next week, flexible",
        "status": "contacted",
        "source": "web_chat",
        "notes": "Confirmed for next Wednesday 2 PM.",
        "created_at": ago(hours=10),
        "updated_at": ago(hours=4),
    },
    {
        "patient_name": "Daniel Ruiz",
        "patient_phone": "(555) 100-2233",
        "patient_email": "druiz@email.com",
        "reason_for_visit": "Teeth whitening — want to know my options",
        "preferred_datetime_text": "Thursday evening",
        "status": "new",
        "source": "web_chat",
        "notes": "",
        "created_at": ago(hours=3),
        "updated_at": ago(hours=3),
    },
]

lead_ids = []
for lead_data in DEMO_LEADS:
    lead_data["clinic_id"] = clinic_id
    inserted = db.table("leads").insert(lead_data).execute()
    lead_ids.append(inserted.data[0]["id"])

print(f"Seeded {len(lead_ids)} demo leads")


# ── Conversations ──────────────────────────────────────────────

# Clear old demo conversations
db.table("conversations").delete().eq("clinic_id", clinic_id).execute()

# Create a few conversations linked to some leads
DEMO_CONVERSATIONS = [
    {
        "session_id": "session_demo_001",
        "lead_id": lead_ids[0],  # Maria Santos
        "last_intent": "booking_confirm",
        "summary": "Patient booked teeth cleaning for Tuesday morning.",
        "created_at": ago(days=6, hours=3),
    },
    {
        "session_id": "session_demo_002",
        "lead_id": lead_ids[1],  # James O'Brien
        "last_intent": "booking_confirm",
        "summary": "Emergency — chipped tooth, booked same-day.",
        "created_at": ago(days=4, hours=8),
    },
    {
        "session_id": "session_demo_003",
        "lead_id": lead_ids[4],  # Sarah Mitchell
        "last_intent": "booking_confirm",
        "summary": "Patient described molar sensitivity, requested Friday.",
        "created_at": ago(days=2, hours=7),
    },
    {
        "session_id": "session_demo_004",
        "lead_id": lead_ids[6],  # Emily Chen
        "last_intent": "booking_confirm",
        "summary": "Booking for two children, Saturday morning.",
        "created_at": ago(days=1, hours=5),
    },
    {
        "session_id": "session_demo_005",
        "lead_id": lead_ids[9],  # Daniel Ruiz
        "last_intent": "booking_confirm",
        "summary": "Whitening inquiry, captured contact info.",
        "created_at": ago(hours=3),
    },
]

for conv_data in DEMO_CONVERSATIONS:
    conv_data["clinic_id"] = clinic_id
    db.table("conversations").insert(conv_data).execute()

print(f"Seeded {len(DEMO_CONVERSATIONS)} demo conversations")

try:
    db.table("channel_connections").delete().eq("clinic_id", clinic_id).execute()
    db.table("channel_connections").insert([
        {
            "clinic_id": clinic_id,
            "channel": "web_chat",
            "provider": "Built-in widget",
            "connection_status": "connected",
            "display_name": "Website chat widget",
            "contact_value": "",
            "automation_enabled": True,
            "notes": "",
        },
        {
            "clinic_id": clinic_id,
            "channel": "missed_call",
            "provider": "Phone recovery workflow",
            "connection_status": "ready_for_setup",
            "display_name": "Missed-call recovery",
            "contact_value": DEMO_CLINIC["phone"],
            "automation_enabled": False,
            "notes": "Phone line is ready to connect once a provider is chosen.",
        },
        {
            "clinic_id": clinic_id,
            "channel": "callback_request",
            "provider": "Front desk workflow",
            "connection_status": "ready_for_setup",
            "display_name": "Callback requests",
            "contact_value": DEMO_CLINIC["phone"],
            "automation_enabled": False,
            "notes": "Callbacks are logged manually today and ready for future automation.",
        },
    ]).execute()

    db.table("communication_events").delete().eq("clinic_id", clinic_id).execute()
    db.table("communication_events").insert([
        {
            "clinic_id": clinic_id,
            "channel": "missed_call",
            "direction": "inbound",
            "event_type": "missed_call",
            "status": "new",
            "customer_name": "Nina Brooks",
            "customer_phone": "(555) 410-1122",
            "customer_email": "",
            "summary": "Missed an inbound call right after lunch. Patient likely needs a text-back.",
            "content": "Call lasted 14 seconds and no voicemail was left.",
            "occurred_at": ago(hours=6),
        },
        {
            "clinic_id": clinic_id,
            "channel": "callback_request",
            "direction": "inbound",
            "event_type": "callback_request",
            "status": "queued",
            "customer_name": "Trevor Miles",
            "customer_phone": "(555) 250-1188",
            "customer_email": "trevor.miles@email.com",
            "summary": "Patient asked for a callback about whitening options.",
            "content": "Best after 4 PM today.",
            "occurred_at": ago(hours=3),
        },
    ]).execute()
    print("Seeded channel readiness and communication events")
except Exception:
    print("Skipped channel readiness seed — latest channel migration is not applied yet")

# Update monthly_leads_used to match
db.table("clinics").update({"monthly_leads_used": len(DEMO_LEADS)}).eq("id", clinic_id).execute()

print("Demo clinic ready: Bright Smile Dental (slug: demo)")
print(f"  - {len(DEMO_LEADS)} leads (4 new, 3 contacted, 2 booked + 1 new)")
print(f"  - {len(DEMO_CONVERSATIONS)} conversation records")
print("  - Plan: Professional, notifications enabled")
