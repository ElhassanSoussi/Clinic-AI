from pydantic import BaseModel
from typing import Any, Optional
from datetime import datetime


class ClinicResponse(BaseModel):
    id: str
    name: str
    slug: str
    phone: str
    email: str
    address: str
    greeting_message: str
    fallback_message: str
    business_hours: Any
    services: Any
    faq: Any
    google_sheet_id: Optional[str] = ""
    google_sheet_tab: Optional[str] = "Sheet1"
    notifications_enabled: Optional[bool] = False
    notification_email: Optional[str] = ""
    availability_enabled: Optional[bool] = False
    availability_sheet_tab: Optional[str] = "Availability"
    reminder_enabled: Optional[bool] = False
    reminder_lead_hours: Optional[int] = 24
    follow_up_automation_enabled: Optional[bool] = False
    follow_up_delay_minutes: Optional[int] = 45
    onboarding_completed: Optional[bool] = False
    onboarding_step: Optional[int] = 0
    assistant_name: Optional[str] = ""
    primary_color: Optional[str] = "#0d9488"
    logo_url: Optional[str] = ""
    is_live: Optional[bool] = False
    plan: Optional[str] = "trial"
    subscription_status: Optional[str] = "trialing"
    stripe_customer_id: Optional[str] = ""
    stripe_subscription_id: Optional[str] = ""
    trial_ends_at: Optional[datetime] = None
    monthly_lead_limit: Optional[int] = 25
    monthly_leads_used: Optional[int] = 0
    leads_reset_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ClinicUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    greeting_message: Optional[str] = None
    fallback_message: Optional[str] = None
    business_hours: Optional[Any] = None
    services: Optional[Any] = None
    faq: Optional[Any] = None
    google_sheet_id: Optional[str] = None
    google_sheet_tab: Optional[str] = None
    notifications_enabled: Optional[bool] = None
    notification_email: Optional[str] = None
    availability_enabled: Optional[bool] = None
    availability_sheet_tab: Optional[str] = None
    reminder_enabled: Optional[bool] = None
    reminder_lead_hours: Optional[int] = None
    follow_up_automation_enabled: Optional[bool] = None
    follow_up_delay_minutes: Optional[int] = None
    onboarding_completed: Optional[bool] = None
    onboarding_step: Optional[int] = None
    assistant_name: Optional[str] = None
    primary_color: Optional[str] = None
    logo_url: Optional[str] = None
