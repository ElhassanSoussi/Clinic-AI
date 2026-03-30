"""
Billing service — Stripe checkout, customer portal, and subscription management.
"""

import stripe
from datetime import datetime, timezone

from app.config import get_settings
from app.dependencies import get_supabase
from app.services.pricing import PLANS, DEFAULT_PLAN, get_plan
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _get_stripe():
    """Initialize Stripe with the secret key."""
    settings = get_settings()
    stripe.api_key = settings.stripe_secret_key
    return stripe


def _get_price_id(plan_id: str) -> str:
    """Resolve the Stripe price ID for a given plan."""
    settings = get_settings()
    if plan_id == "professional":
        return settings.stripe_price_professional
    elif plan_id == "premium":
        return settings.stripe_price_premium
    return ""


def ensure_stripe_customer(clinic: dict) -> str:
    """Create or retrieve a Stripe customer for the clinic."""
    s = _get_stripe()
    existing_id = clinic.get("stripe_customer_id", "")
    if existing_id:
        try:
            s.Customer.retrieve(existing_id)
            return existing_id
        except Exception:
            pass  # Customer deleted or invalid, create new one

    customer = s.Customer.create(
        name=clinic.get("name", ""),
        email=clinic.get("email", ""),
        metadata={"clinic_id": clinic["id"]},
    )
    db = get_supabase()
    db.table("clinics").update({"stripe_customer_id": customer.id}).eq("id", clinic["id"]).execute()
    logger.info(f"Created Stripe customer {customer.id} for clinic {clinic['id']}")
    return customer.id


def create_checkout_session(clinic: dict, plan_id: str, success_url: str, cancel_url: str) -> str:
    """Create a Stripe Checkout session for upgrading to a paid plan."""
    s = _get_stripe()
    price_id = _get_price_id(plan_id)
    if not price_id:
        raise ValueError(f"No Stripe price configured for plan: {plan_id}")

    customer_id = ensure_stripe_customer(clinic)

    session = s.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"clinic_id": clinic["id"], "plan_id": plan_id},
        subscription_data={"metadata": {"clinic_id": clinic["id"], "plan_id": plan_id}},
    )
    logger.info(f"Checkout session created for clinic {clinic['id']} → plan {plan_id}")
    return session.url


def create_portal_session(clinic: dict, return_url: str) -> str:
    """Create a Stripe Customer Portal session for managing billing."""
    s = _get_stripe()
    customer_id = ensure_stripe_customer(clinic)

    session = s.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    logger.info(f"Portal session created for clinic {clinic['id']}")
    return session.url


def handle_checkout_completed(session: dict):
    """Handle checkout.session.completed — link subscription to clinic."""
    db = get_supabase()
    clinic_id = session.get("metadata", {}).get("clinic_id")
    plan_id = session.get("metadata", {}).get("plan_id", "professional")
    subscription_id = session.get("subscription")
    customer_id = session.get("customer")

    if not clinic_id:
        logger.warning("checkout.session.completed missing clinic_id in metadata")
        return

    plan = get_plan(plan_id)
    updates = {
        "plan": plan_id,
        "subscription_status": "active",
        "stripe_customer_id": customer_id or "",
        "stripe_subscription_id": subscription_id or "",
        "monthly_lead_limit": plan.monthly_lead_limit if plan else 200,
    }
    db.table("clinics").update(updates).eq("id", clinic_id).execute()
    logger.info(f"Checkout completed: clinic {clinic_id} → plan {plan_id}")


def handle_subscription_updated(subscription: dict):
    """Handle customer.subscription.updated — sync status changes."""
    db = get_supabase()
    clinic_id = subscription.get("metadata", {}).get("clinic_id")
    if not clinic_id:
        # Try to find by subscription ID
        sub_id = subscription.get("id", "")
        result = db.table("clinics").select("id").eq("stripe_subscription_id", sub_id).execute()
        if result.data:
            clinic_id = result.data[0]["id"]
        else:
            logger.warning(f"subscription.updated: cannot find clinic for sub {sub_id}")
            return

    status_map = {
        "active": "active",
        "trialing": "trialing",
        "canceled": "canceled",
        "past_due": "past_due",
        "unpaid": "past_due",
        "incomplete": "inactive",
        "incomplete_expired": "inactive",
    }
    stripe_status = subscription.get("status", "")
    mapped_status = status_map.get(stripe_status, "inactive")

    updates = {"subscription_status": mapped_status}

    # If canceled, keep their plan until period end
    if stripe_status == "canceled" and subscription.get("cancel_at_period_end"):
        updates["subscription_status"] = "canceled"
    elif stripe_status == "active":
        updates["subscription_status"] = "active"

    db.table("clinics").update(updates).eq("id", clinic_id).execute()
    logger.info(f"Subscription updated: clinic {clinic_id} → status {mapped_status}")


def handle_subscription_deleted(subscription: dict):
    """Handle customer.subscription.deleted — downgrade to trial/inactive."""
    db = get_supabase()
    clinic_id = subscription.get("metadata", {}).get("clinic_id")
    if not clinic_id:
        sub_id = subscription.get("id", "")
        result = db.table("clinics").select("id").eq("stripe_subscription_id", sub_id).execute()
        if result.data:
            clinic_id = result.data[0]["id"]
        else:
            logger.warning(f"subscription.deleted: cannot find clinic for sub {sub_id}")
            return

    trial_plan = PLANS.get(DEFAULT_PLAN)
    updates = {
        "plan": DEFAULT_PLAN,
        "subscription_status": "inactive",
        "stripe_subscription_id": "",
        "monthly_lead_limit": trial_plan.monthly_lead_limit if trial_plan else 25,
    }
    db.table("clinics").update(updates).eq("id", clinic_id).execute()
    logger.info(f"Subscription deleted: clinic {clinic_id} → downgraded to {DEFAULT_PLAN}")


def handle_invoice_paid(invoice: dict):
    """Handle invoice.paid — reset monthly lead count on successful payment."""
    db = get_supabase()
    customer_id = invoice.get("customer", "")
    if not customer_id:
        return

    result = db.table("clinics").select("id").eq("stripe_customer_id", customer_id).execute()
    if not result.data:
        return

    clinic_id = result.data[0]["id"]
    now = datetime.now(timezone.utc).isoformat()
    db.table("clinics").update({
        "monthly_leads_used": 0,
        "leads_reset_at": now,
    }).eq("id", clinic_id).execute()
    logger.info(f"Invoice paid: reset lead count for clinic {clinic_id}")


def handle_invoice_payment_failed(invoice: dict):
    """Handle invoice.payment_failed — mark subscription as past_due."""
    db = get_supabase()
    customer_id = invoice.get("customer", "")
    if not customer_id:
        return

    result = db.table("clinics").select("id").eq("stripe_customer_id", customer_id).execute()
    if not result.data:
        return

    clinic_id = result.data[0]["id"]
    db.table("clinics").update({"subscription_status": "past_due"}).eq("id", clinic_id).execute()
    logger.info(f"Invoice payment failed: clinic {clinic_id} → past_due")
