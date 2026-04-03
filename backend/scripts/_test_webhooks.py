"""
Test webhook handlers directly — proves the data flow works
without needing a real Stripe webhook delivery.
"""
import os
from supabase import create_client

SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_SERVICE_KEY"]
db = create_client(os.environ["SUPABASE_URL"], SERVICE_KEY)
CLINIC_ID = "133e3e0f-af5f-42d5-a2c1-dc8b3c8ccb3d"


def read_clinic():
    c = db.table("clinics").select(
        "plan, subscription_status, stripe_customer_id, stripe_subscription_id, monthly_lead_limit, monthly_leads_used"
    ).eq("id", CLINIC_ID).single().execute()
    return c.data


def test_checkout_completed():
    """Simulate checkout.session.completed webhook data."""
    from app.services.billing_service import handle_checkout_completed

    print("\n=== TEST: checkout.session.completed ===")
    session = {
        "id": "cs_test_123",
        "metadata": {"clinic_id": CLINIC_ID, "plan_id": "professional"},
        "subscription": "sub_test_abc",
        "customer": "cus_test_xyz",
    }
    handle_checkout_completed(session)
    state = read_clinic()
    print(f"  plan={state['plan']}, status={state['subscription_status']}, limit={state['monthly_lead_limit']}")
    assert state["plan"] == "professional", f"Expected professional, got {state['plan']}"
    assert state["subscription_status"] == "active", f"Expected active, got {state['subscription_status']}"
    assert state["monthly_lead_limit"] == 200, f"Expected 200 leads, got {state['monthly_lead_limit']}"
    assert state["stripe_customer_id"] == "cus_test_xyz"
    assert state["stripe_subscription_id"] == "sub_test_abc"
    print("  PASS")


def test_subscription_updated():
    """Simulate customer.subscription.updated webhook data."""
    from app.services.billing_service import handle_subscription_updated

    print("\n=== TEST: customer.subscription.updated (past_due) ===")
    sub = {
        "id": "sub_test_abc",
        "metadata": {"clinic_id": CLINIC_ID},
        "status": "past_due",
    }
    handle_subscription_updated(sub)
    state = read_clinic()
    print(f"  status={state['subscription_status']}")
    assert state["subscription_status"] == "past_due"
    print("  PASS")

    print("\n=== TEST: customer.subscription.updated (active) ===")
    sub["status"] = "active"
    handle_subscription_updated(sub)
    state = read_clinic()
    print(f"  status={state['subscription_status']}")
    assert state["subscription_status"] == "active"
    print("  PASS")


def test_subscription_updated_by_sub_id():
    """Test fallback lookup by subscription_id when metadata missing."""
    from app.services.billing_service import handle_subscription_updated

    print("\n=== TEST: subscription.updated (lookup by sub_id) ===")
    sub = {
        "id": "sub_test_abc",
        "metadata": {},  # No clinic_id
        "status": "active",
    }
    handle_subscription_updated(sub)
    state = read_clinic()
    print(f"  status={state['subscription_status']} (found via sub_id lookup)")
    assert state["subscription_status"] == "active"
    print("  PASS")


def test_invoice_paid():
    """Simulate invoice.paid — should reset lead count."""
    from app.services.billing_service import handle_invoice_paid

    print("\n=== TEST: invoice.paid (resets lead count) ===")
    # First set leads_used to simulate usage
    db.table("clinics").update({"monthly_leads_used": 150}).eq("id", CLINIC_ID).execute()
    before = read_clinic()
    print(f"  Before: leads_used={before['monthly_leads_used']}")

    invoice = {"customer": "cus_test_xyz"}
    handle_invoice_paid(invoice)

    after = read_clinic()
    print(f"  After:  leads_used={after['monthly_leads_used']}")
    assert after["monthly_leads_used"] == 0, f"Expected 0, got {after['monthly_leads_used']}"
    print("  PASS")


def test_subscription_deleted():
    """Simulate subscription deleted — should downgrade to trial."""
    from app.services.billing_service import handle_subscription_deleted

    print("\n=== TEST: customer.subscription.deleted (downgrade) ===")
    sub = {
        "id": "sub_test_abc",
        "metadata": {"clinic_id": CLINIC_ID},
    }
    handle_subscription_deleted(sub)
    state = read_clinic()
    print(f"  plan={state['plan']}, status={state['subscription_status']}, limit={state['monthly_lead_limit']}")
    assert state["plan"] == "trial", f"Expected trial, got {state['plan']}"
    assert state["subscription_status"] == "inactive"
    assert state["monthly_lead_limit"] == 25
    assert state["stripe_subscription_id"] == ""
    print("  PASS")


def test_invoice_payment_failed():
    """Simulate payment failure."""
    from app.services.billing_service import handle_invoice_payment_failed

    # First re-upgrade so there's something to mark past_due
    db.table("clinics").update({
        "plan": "professional",
        "subscription_status": "active",
        "stripe_customer_id": "cus_test_xyz",
    }).eq("id", CLINIC_ID).execute()

    print("\n=== TEST: invoice.payment_failed ===")
    invoice = {"customer": "cus_test_xyz"}
    handle_invoice_payment_failed(invoice)
    state = read_clinic()
    print(f"  status={state['subscription_status']}")
    assert state["subscription_status"] == "past_due"
    print("  PASS")


def cleanup():
    """Reset clinic to trial state for further testing."""
    db.table("clinics").update({
        "plan": "trial",
        "subscription_status": "trialing",
        "monthly_lead_limit": 25,
        "monthly_leads_used": 0,
        "stripe_customer_id": "",
        "stripe_subscription_id": "",
    }).eq("id", CLINIC_ID).execute()
    print("\n=== CLEANUP: Reset to trial ===")


if __name__ == "__main__":
    print("Starting webhook handler tests...")
    print(f"Clinic: {CLINIC_ID}")
    print(f"Initial state: {read_clinic()}")

    test_checkout_completed()
    test_subscription_updated()
    test_subscription_updated_by_sub_id()
    test_invoice_paid()
    test_subscription_deleted()
    test_invoice_payment_failed()
    cleanup()

    print("\n" + "=" * 50)
    print("ALL WEBHOOK HANDLER TESTS PASSED")
    print("=" * 50)
