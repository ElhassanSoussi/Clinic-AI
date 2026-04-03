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


def stripe_ready_for_payments() -> tuple[bool, str]:
    settings = get_settings()
    if not settings.stripe_secret_key:
        return False, "Stripe is not configured on the server yet."
    if not settings.frontend_app_url:
        return False, "The frontend app URL is not configured for Stripe checkout."
    return True, ""


def stripe_readiness_summary() -> dict[str, str | bool | list[str]]:
    settings = get_settings()
    missing: list[str] = []
    partial: list[str] = []

    if not settings.stripe_secret_key:
        missing.append("STRIPE_SECRET_KEY")
    if not settings.stripe_webhook_secret:
        partial.append("STRIPE_WEBHOOK_SECRET")
    if not settings.stripe_price_professional:
        partial.append("STRIPE_PRICE_PROFESSIONAL")
    if not settings.stripe_price_premium:
        partial.append("STRIPE_PRICE_PREMIUM")
    if not settings.frontend_app_url:
        partial.append("FRONTEND_APP_URL")

    if missing:
        status = "missing"
        summary = "Stripe billing is not configured yet."
        detail = "Add the Stripe secret key before billing checkout or deposit requests can run."
    elif partial:
        status = "partially_configured"
        summary = "Stripe is connected, but billing setup is incomplete."
        detail = "Finish the remaining Stripe env values so checkout, webhooks, and deposit links all work predictably."
    else:
        status = "configured"
        summary = "Stripe billing is configured."
        detail = "Checkout, deposit requests, and webhook-driven payment state updates are ready to run."

    return {
        "configured": not missing and not partial,
        "status": status,
        "summary": summary,
        "detail": detail,
        "missing": missing + partial,
    }


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
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise ValueError("Billing checkout is not configured on the server yet.")
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
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise ValueError("Billing portal is not configured on the server yet.")
    s = _get_stripe()
    customer_id = ensure_stripe_customer(clinic)

    session = s.billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    logger.info(f"Portal session created for clinic {clinic['id']}")
    return session.url


def create_deposit_checkout_session(
    clinic: dict,
    lead: dict,
    amount_cents: int,
    success_url: str,
    cancel_url: str,
) -> dict:
    if amount_cents <= 0:
        raise ValueError("Deposit amount must be greater than zero.")

    ready, reason = stripe_ready_for_payments()
    if not ready:
        raise ValueError(reason)

    s = _get_stripe()
    session = s.checkout.Session.create(
        mode="payment",
        customer_email=lead.get("patient_email") or None,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "kind": "appointment_deposit",
            "clinic_id": clinic["id"],
            "lead_id": lead["id"],
            "deposit_amount_cents": str(amount_cents),
        },
        payment_intent_data={
            "metadata": {
                "kind": "appointment_deposit",
                "clinic_id": clinic["id"],
                "lead_id": lead["id"],
                "deposit_amount_cents": str(amount_cents),
            }
        },
        line_items=[
            {
                "quantity": 1,
                "price_data": {
                    "currency": "usd",
                    "unit_amount": amount_cents,
                    "product_data": {
                        "name": f"{clinic.get('name', 'Clinic')} appointment deposit",
                        "description": lead.get("reason_for_visit") or "Appointment deposit request",
                    },
                },
            }
        ],
    )
    logger.info(f"Deposit checkout session created for clinic {clinic['id']} and lead {lead['id']}")
    return {
        "checkout_session_id": session.id,
        "checkout_url": session.url,
        "payment_intent_id": session.get("payment_intent") or "",
        "payment_status": session.get("payment_status") or "",
    }


def handle_checkout_completed(session: dict):
    """Handle checkout.session.completed — link subscription to clinic."""
    metadata = session.get("metadata", {}) or {}
    if metadata.get("kind") == "appointment_deposit":
        handle_deposit_checkout_completed(session)
        return

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


def _update_lead_deposit_state(
    *,
    lead_id: str,
    clinic_id: str,
    deposit_status: str,
    checkout_session_id: str = "",
    payment_intent_id: str = "",
    deposit_paid_at: str = "",
) -> None:
    updates = {
        "deposit_required": deposit_status not in {"not_required", "waived"},
        "deposit_status": deposit_status,
    }
    if checkout_session_id:
        updates["deposit_checkout_session_id"] = checkout_session_id
    if payment_intent_id:
        updates["deposit_payment_intent_id"] = payment_intent_id
    if deposit_paid_at:
        updates["deposit_paid_at"] = deposit_paid_at
    get_supabase().table("leads").update(updates).eq("clinic_id", clinic_id).eq("id", lead_id).execute()


def handle_deposit_checkout_completed(session: dict):
    metadata = session.get("metadata", {}) or {}
    clinic_id = metadata.get("clinic_id")
    lead_id = metadata.get("lead_id")
    if not clinic_id or not lead_id:
        logger.warning("deposit checkout.session.completed missing clinic_id or lead_id")
        return

    payment_status = session.get("payment_status") or ""
    deposit_status = "paid" if payment_status == "paid" else "requested"
    _update_lead_deposit_state(
        clinic_id=clinic_id,
        lead_id=lead_id,
        deposit_status=deposit_status,
        checkout_session_id=session.get("id", "") or "",
        payment_intent_id=session.get("payment_intent", "") or "",
        deposit_paid_at=datetime.now(timezone.utc).isoformat() if deposit_status == "paid" else "",
    )
    logger.info(f"Deposit checkout completed: clinic {clinic_id} lead {lead_id} → {deposit_status}")


def handle_deposit_checkout_expired(session: dict):
    metadata = session.get("metadata", {}) or {}
    if metadata.get("kind") != "appointment_deposit":
        return
    clinic_id = metadata.get("clinic_id")
    lead_id = metadata.get("lead_id")
    if not clinic_id or not lead_id:
        logger.warning("deposit checkout.session.expired missing clinic_id or lead_id")
        return
    _update_lead_deposit_state(
        clinic_id=clinic_id,
        lead_id=lead_id,
        deposit_status="expired",
        checkout_session_id=session.get("id", "") or "",
        payment_intent_id=session.get("payment_intent", "") or "",
    )
    logger.info(f"Deposit checkout expired: clinic {clinic_id} lead {lead_id}")


def handle_payment_intent_succeeded(payment_intent: dict):
    metadata = payment_intent.get("metadata", {}) or {}
    if metadata.get("kind") != "appointment_deposit":
        return
    clinic_id = metadata.get("clinic_id")
    lead_id = metadata.get("lead_id")
    if not clinic_id or not lead_id:
        logger.warning("deposit payment_intent.succeeded missing clinic_id or lead_id")
        return
    _update_lead_deposit_state(
        clinic_id=clinic_id,
        lead_id=lead_id,
        deposit_status="paid",
        payment_intent_id=payment_intent.get("id", "") or "",
        deposit_paid_at=datetime.now(timezone.utc).isoformat(),
    )
    logger.info(f"Deposit payment succeeded: clinic {clinic_id} lead {lead_id}")


def handle_payment_intent_failed(payment_intent: dict):
    metadata = payment_intent.get("metadata", {}) or {}
    if metadata.get("kind") != "appointment_deposit":
        return
    clinic_id = metadata.get("clinic_id")
    lead_id = metadata.get("lead_id")
    if not clinic_id or not lead_id:
        logger.warning("deposit payment_intent.payment_failed missing clinic_id or lead_id")
        return
    _update_lead_deposit_state(
        clinic_id=clinic_id,
        lead_id=lead_id,
        deposit_status="failed",
        payment_intent_id=payment_intent.get("id", "") or "",
    )
    logger.info(f"Deposit payment failed: clinic {clinic_id} lead {lead_id}")


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
