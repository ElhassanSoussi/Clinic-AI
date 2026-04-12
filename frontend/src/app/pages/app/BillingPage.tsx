import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CreditCard, Calendar, AlertTriangle, Check, Shield } from "lucide-react";
import { Modal } from "@/app/components/Modal";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  createBillingCheckout,
  createBillingPortal,
  fetchBillingPlans,
  fetchBillingStatus,
} from "@/lib/api/services";
import type { BillingPlan, BillingStatus } from "@/lib/api/types";
import { getPublicOrigin } from "@/lib/site";
import { notifyError, notifySuccess } from "@/lib/feedback";
import { cn } from "@/app/components/ui/utils";
import { appPagePaddingClass, appPageSubtitleClass, appPageTitleClass, appSectionTitleClass } from "@/lib/page-layout";

function formatMoneyCents(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

export function BillingPage() {
  const { session } = useAuth();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session?.accessToken) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [st, pl] = await Promise.all([
          fetchBillingStatus(session.accessToken),
          fetchBillingPlans(),
        ]);
        if (!cancelled) {
          setStatus(st);
          setPlans(pl || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load billing");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.accessToken]);

  const leadPct = useMemo(() => {
    if (!status?.monthly_lead_limit) {
      return 0;
    }
    return Math.min(100, (status.monthly_leads_used / status.monthly_lead_limit) * 100);
  }, [status]);

  const usageColor = (pct: number) => {
    if (pct >= 90) {
      return { bar: "bg-red-500", text: "text-red-600" };
    }
    if (pct >= 80) {
      return { bar: "bg-orange-500", text: "text-orange-600" };
    }
    return { bar: "bg-teal-500", text: "text-teal-600" };
  };

  const uc = usageColor(leadPct);
  const leadUsageBarRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = leadUsageBarRef.current;
    if (el) {
      el.style.width = `${leadPct}%`;
    }
  }, [leadPct]);

  const needsAttention = leadPct >= 80;
  const atLimit =
    Boolean(status?.monthly_lead_limit) &&
    status != null &&
    status.monthly_leads_used >= status.monthly_lead_limit;

  const openCheckout = async (planId: string) => {
    if (!session?.accessToken) {
      return;
    }
    const origin = getPublicOrigin();
    setBusy(`checkout:${planId}`);
    setError(null);
    try {
      const { checkout_url } = await createBillingCheckout(session.accessToken, {
        plan_id: planId,
        success_url: `${origin}/app/billing?checkout=success`,
        cancel_url: `${origin}/app/billing?checkout=cancel`,
      });
      if (!checkout_url?.trim()) {
        throw new ApiError("Checkout did not return a URL. Verify Stripe keys and billing env on the server.", 500);
      }
      notifySuccess("Opening Stripe checkout…");
      window.location.href = checkout_url.trim();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Checkout failed";
      setError(msg);
      notifyError(msg);
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    if (!session?.accessToken) {
      return;
    }
    const origin = getPublicOrigin();
    setBusy("portal");
    setError(null);
    try {
      const { portal_url } = await createBillingPortal(session.accessToken, `${origin}/app/billing`);
      if (!portal_url?.trim()) {
        throw new ApiError("Portal did not return a URL. Verify Stripe customer portal configuration.", 500);
      }
      notifySuccess("Opening Stripe customer portal…");
      window.location.href = portal_url.trim();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Could not open billing portal";
      setError(msg);
      notifyError(msg);
    } finally {
      setBusy(null);
    }
  };

  const currentPlanMeta = plans.find((p) => p.id === status?.plan);

  return (
    <div className={appPagePaddingClass}>
      <div className="mb-8 max-w-3xl">
        <h1 className={appPageTitleClass}>Billing</h1>
        <p className={appPageSubtitleClass}>
          Billing center — this page reflects your clinic record and monthly lead allowance. Checkout upgrades the plan here; Stripe hosts
          cards, invoices, and subscription lifecycle.
        </p>
        {error && <p className="text-sm text-destructive mt-2">{error}</p>}
      </div>

      {loading && <p className="text-muted-foreground">Loading billing…</p>}

      {!loading && status && (
        <>
          {atLimit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-700" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2 text-red-900">Lead limit reached</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    This workspace has used its monthly lead allowance ({status.monthly_leads_used} / {status.monthly_lead_limit}). Upgrade or
                    wait for the next reset; enforcement happens on the server.
                  </p>
                  <button type="button" onClick={() => setShowPlanModal(true)} className="text-sm text-primary hover:underline font-medium">
                    View paid plans
                  </button>
                </div>
              </div>
            </div>
          )}

          {needsAttention && !atLimit && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Usage alert</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    You are approaching this billing period&apos;s lead limit. Upgrade in Stripe checkout or manage your subscription in the
                    customer portal.
                  </p>
                  <button type="button" onClick={() => setShowPlanModal(true)} className="text-sm text-primary hover:underline font-medium">
                    View paid plans
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <div>
                    <h2 className={cn(appSectionTitleClass, "text-xl")}>Current plan</h2>
                    <p className="text-sm text-muted-foreground mt-1">Synced from your workspace billing record.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-bold capitalize shadow-sm">
                      {status.plan_name || status.plan}
                    </span>
                    <span className="px-3 py-1.5 bg-accent text-primary rounded-full text-sm font-semibold capitalize border border-primary/15">
                      {status.subscription_status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-slate-50/80 p-4 mb-6">
                  <p className="text-sm text-foreground leading-relaxed">
                    <span className="font-semibold">What you manage here:</span> start checkout for paid tiers and see allowance usage.{" "}
                    <span className="font-semibold">What Stripe manages:</span> payment methods, invoices, tax IDs, and cancellation timing
                    after you are subscribed.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-border">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Trial ends</p>
                    <p className="text-lg font-semibold text-foreground">{status.trial_ends_at || "—"}</p>
                    {status.subscription_status === "trialing" || status.plan === "trial" ? (
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Trial access is enforced server-side. Completing checkout moves you onto a paid Stripe subscription when configured.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Stripe customer portal</p>
                    <p className="text-lg font-semibold text-foreground">{status.has_stripe_subscription ? "Available" : "Not yet linked"}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {status.has_stripe_subscription
                        ? "Open the portal to update cards, download invoices, or adjust subscription settings."
                        : "Finish a successful checkout so Stripe can attach a billing customer to this workspace."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPlanModal(true)}
                    className="px-4 py-2.5 border border-border rounded-lg hover:bg-muted transition-colors font-semibold bg-white"
                  >
                    Compare plans
                  </button>
                  <button
                    type="button"
                    disabled={busy === "portal" || !status.has_stripe_subscription}
                    onClick={() => void openPortal()}
                    className="px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold disabled:opacity-50 shadow-sm"
                  >
                    {busy === "portal" ? "Opening…" : "Open Stripe customer portal"}
                  </button>
                </div>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <h2 className="text-xl font-semibold mb-6">Usage this period</h2>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Leads used</span>
                    <span className={`text-sm font-semibold ${uc.text}`}>
                      {status.monthly_leads_used} / {status.monthly_lead_limit}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div ref={leadUsageBarRef} className={`${uc.bar} h-3 rounded-full transition-all min-w-0`} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{leadPct.toFixed(1)}% of monthly lead limit</p>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Conversation, seat, and message limits are not reported by this API; only monthly lead usage is enforced server-side for
                  trials and paid plans.
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <h2 className="text-xl font-semibold mb-2">Invoices & payment methods</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Stripe hosts saved payment methods and invoice PDFs. Open the customer portal to view history or update billing details.
                </p>
                <button
                  type="button"
                  disabled={!status.has_stripe_subscription || busy === "portal"}
                  onClick={() => void openPortal()}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors font-medium disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  Open Stripe billing
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold">Secure billing</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Payments are processed by Stripe. Clinic AI does not store full card numbers in this application.
                </p>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Plan reference</h3>
                </div>
                {currentPlanMeta ? (
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {currentPlanMeta.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Plan catalog loaded separately.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} title="Choose a plan" size="lg">
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = status?.plan === plan.id;
            const canCheckout = plan.id === "professional" || plan.id === "premium";
            return (
              <div
                key={plan.id}
                className={`border rounded-xl p-6 ${isCurrent ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border"}`}
              >
                {isCurrent && <span className="text-xs px-2 py-1 bg-primary text-white rounded-full mb-3 inline-block">Current</span>}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{formatMoneyCents(plan.monthly_price_cents)}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${isCurrent || !canCheckout ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-primary text-white hover:bg-primary/90"
                    }`}
                  disabled={isCurrent || !canCheckout || busy !== null}
                  onClick={() => canCheckout && void openCheckout(plan.id)}
                >
                  {isCurrent ? "Current plan" : !canCheckout ? "Managed as trial" : busy === `checkout:${plan.id}` ? "Redirecting…" : "Checkout"}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Checkout supports Professional and Premium. Trial plans upgrade through Stripe; cancel or swap plans from the Stripe customer portal
          once subscribed.
        </p>
      </Modal>
    </div>
  );
}
