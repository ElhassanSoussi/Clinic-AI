"""
Centralized plan configuration.
All plan limits, features, and pricing are defined here — no magic strings elsewhere.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass(frozen=True)
class PlanConfig:
    id: str
    name: str
    description: str
    monthly_lead_limit: int  # -1 means unlimited
    monthly_price_cents: int  # 0 for free
    stripe_price_id: str  # mapped from env or config
    features: list[str] = field(default_factory=list)
    is_default: bool = False


# ── Plan definitions ────────────────────────────────────────────────
PLANS: dict[str, PlanConfig] = {
    "trial": PlanConfig(
        id="trial",
        name="Free Trial",
        description="14-day trial with limited leads",
        monthly_lead_limit=25,
        monthly_price_cents=0,
        stripe_price_id="",
        features=[
            "AI receptionist chat",
            "Dashboard & lead management",
            "25 leads per month",
        ],
        is_default=True,
    ),
    "professional": PlanConfig(
        id="professional",
        name="Professional",
        description="For real clinic operations",
        monthly_lead_limit=200,
        monthly_price_cents=4900,  # $49/mo
        stripe_price_id="",  # Set via STRIPE_PRICE_PROFESSIONAL env var
        features=[
            "AI receptionist chat",
            "Dashboard & lead management",
            "200 leads per month",
            "Google Sheets sync",
            "Email notifications",
            "Availability-guided scheduling",
        ],
    ),
    "premium": PlanConfig(
        id="premium",
        name="Premium",
        description="High-volume clinics & advanced workflows",
        monthly_lead_limit=-1,  # unlimited
        monthly_price_cents=9900,  # $99/mo
        stripe_price_id="",  # Set via STRIPE_PRICE_PREMIUM env var
        features=[
            "Everything in Professional",
            "Unlimited leads",
            "Priority support",
            "Future advanced features",
        ],
    ),
}


DEFAULT_PLAN = "trial"
TRIAL_DURATION_DAYS = 14

# Features gated by plan
PLAN_FEATURE_GATES: dict[str, list[str]] = {
    "google_sheets": ["professional", "premium"],
    "email_notifications": ["professional", "premium"],
    "availability_scheduling": ["professional", "premium"],
}


def get_plan(plan_id: str) -> Optional[PlanConfig]:
    return PLANS.get(plan_id)


def get_lead_limit(plan_id: str) -> int:
    plan = PLANS.get(plan_id)
    if not plan:
        return PLANS[DEFAULT_PLAN].monthly_lead_limit
    return plan.monthly_lead_limit


def has_feature(plan_id: str, feature: str) -> bool:
    """Check if a plan has access to a specific gated feature."""
    allowed_plans = PLAN_FEATURE_GATES.get(feature)
    if allowed_plans is None:
        return True  # Feature not gated
    return plan_id in allowed_plans


def is_at_lead_limit(plan_id: str, monthly_leads_used: int) -> bool:
    """Check if the clinic has reached its lead limit."""
    limit = get_lead_limit(plan_id)
    if limit == -1:
        return False  # Unlimited
    return monthly_leads_used >= limit


def plan_list_for_api() -> list[dict]:
    """Return plan info suitable for the frontend pricing display."""
    result = []
    for plan in PLANS.values():
        result.append({
            "id": plan.id,
            "name": plan.name,
            "description": plan.description,
            "monthly_lead_limit": plan.monthly_lead_limit,
            "monthly_price_cents": plan.monthly_price_cents,
            "features": plan.features,
        })
    return result
