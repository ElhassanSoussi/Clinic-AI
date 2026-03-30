"""
Billing router — checkout, portal, webhooks, plan info.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.dependencies import get_current_user, get_supabase
from app.config import get_settings
from app.services.billing_service import (
    create_checkout_session,
    create_portal_session,
    handle_checkout_completed,
    handle_subscription_updated,
    handle_subscription_deleted,
    handle_invoice_paid,
    handle_invoice_payment_failed,
)
from app.services.pricing import plan_list_for_api, PLANS
from app.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/billing", tags=["billing"])


# ── Public: pricing info ──────────────────────────────────────────
@router.get("/plans")
async def list_plans():
    """Return available plans and their features (public)."""
    return plan_list_for_api()


# ── Authenticated: billing state ──────────────────────────────────
class BillingStatusResponse(BaseModel):
    plan: str
    plan_name: str
    subscription_status: str
    monthly_lead_limit: int
    monthly_leads_used: int
    trial_ends_at: Optional[str] = None
    has_stripe_subscription: bool


@router.get("/status", response_model=BillingStatusResponse)
async def billing_status(current_user: Annotated[dict, Depends(get_current_user)]):
    """Return the current billing status for the authenticated clinic."""
    clinic = current_user.get("clinics", {})
    plan_id = clinic.get("plan", "trial")
    plan_config = PLANS.get(plan_id)
    return BillingStatusResponse(
        plan=plan_id,
        plan_name=plan_config.name if plan_config else plan_id,
        subscription_status=clinic.get("subscription_status", "trialing"),
        monthly_lead_limit=clinic.get("monthly_lead_limit", 25),
        monthly_leads_used=clinic.get("monthly_leads_used", 0),
        trial_ends_at=clinic.get("trial_ends_at"),
        has_stripe_subscription=bool(clinic.get("stripe_subscription_id")),
    )


# ── Authenticated: create checkout ────────────────────────────────
class CheckoutRequest(BaseModel):
    plan_id: str
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str


@router.post("/checkout", response_model=CheckoutResponse, responses={400: {"description": "Invalid plan or billing error"}, 404: {"description": "Clinic not found"}, 500: {"description": "Stripe checkout failure"}})
async def create_checkout(
    req: CheckoutRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Create a Stripe Checkout session to upgrade plan."""
    clinic = current_user.get("clinics")
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found.")

    if req.plan_id not in ("professional", "premium"):
        raise HTTPException(status_code=400, detail="Invalid plan. Choose 'professional' or 'premium'.")

    try:
        url = create_checkout_session(clinic, req.plan_id, req.success_url, req.cancel_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session.")

    return CheckoutResponse(checkout_url=url)


# ── Authenticated: customer portal ────────────────────────────────
class PortalRequest(BaseModel):
    return_url: str


class PortalResponse(BaseModel):
    portal_url: str


@router.post("/portal", response_model=PortalResponse, responses={404: {"description": "Clinic not found"}, 500: {"description": "Stripe portal failure"}})
async def create_portal(
    req: PortalRequest,
    current_user: Annotated[dict, Depends(get_current_user)],
):
    """Create a Stripe Customer Portal session."""
    clinic = current_user.get("clinics")
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found.")

    try:
        url = create_portal_session(clinic, req.return_url)
    except Exception as e:
        logger.error(f"Stripe portal error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create portal session.")

    return PortalResponse(portal_url=url)


# ── Webhook (no auth — verified by Stripe signature) ─────────────
@router.post("/webhook", responses={400: {"description": "Invalid signature or webhook error"}, 500: {"description": "Webhook secret not configured or handler failure"}})
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events. Verified via signature."""
    import stripe

    settings = get_settings()
    stripe.api_key = settings.stripe_secret_key
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not settings.stripe_webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        raise HTTPException(status_code=500, detail="Webhook secret not configured.")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.stripe_webhook_secret
        )
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid signature.")
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        raise HTTPException(status_code=400, detail="Webhook error.")

    event_type = event["type"]
    data = event["data"]["object"]

    logger.info(f"Stripe webhook received: {event_type}")

    handlers = {
        "checkout.session.completed": handle_checkout_completed,
        "customer.subscription.created": handle_subscription_updated,
        "customer.subscription.updated": handle_subscription_updated,
        "customer.subscription.deleted": handle_subscription_deleted,
        "invoice.paid": handle_invoice_paid,
        "invoice.payment_failed": handle_invoice_payment_failed,
    }

    handler = handlers.get(event_type)
    if handler:
        try:
            handler(data)
        except Exception as e:
            logger.error(f"Webhook handler error for {event_type}: {e}")
            raise HTTPException(status_code=500, detail="Webhook handler failed.")
    else:
        logger.debug(f"Unhandled webhook event type: {event_type}")

    return {"received": True}
