"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  Check,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Shield,
  Zap,
  Crown,
} from "lucide-react";
import { api } from "@/lib/api";
import { normalizeLeadUsage } from "@/lib/billing-usage";
import { isSafeExternalUrl } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { BillingStatus, PlanInfo } from "@/types";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  trialing: { label: "Trial", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  canceled: { label: "Canceled", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  past_due: { label: "Past due", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  inactive: { label: "Inactive", color: "text-app-text", bg: "bg-app-surface-alt border-app-border" },
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  trial: <Shield className="w-5 h-5" />,
  professional: <Zap className="w-5 h-5" />,
  premium: <Crown className="w-5 h-5" />,
};

function formatPrice(cents: number): string {
  if (!Number.isFinite(cents)) return "—";
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}/mo`;
}

function formatDate(iso: string | undefined): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [canceledMsg, setCanceledMsg] = useState("");

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statusData, plansData] = await Promise.all([
        api.billing.getStatus(),
        api.billing.getPlans(),
      ]);
      setBilling(statusData);
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  // Handle success/canceled return from Stripe Checkout
  useEffect(() => {
    const searchParams =
      globalThis.window === undefined
        ? new URLSearchParams()
        : new URLSearchParams(globalThis.location.search);

    if (searchParams.get("success")) {
      setSuccessMsg("Payment successful! Your plan has been upgraded.");
      // Webhook may need a moment — reload billing after a short delay
      const timer = setTimeout(() => loadBilling(), 2000);
      return () => clearTimeout(timer);
    }
    if (searchParams.get("canceled")) {
      setCanceledMsg("Checkout was canceled. No charges were made.");
    }
  }, [loadBilling]);

  const handleUpgrade = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const origin = globalThis.location.origin;
      const result = await api.billing.createCheckout({
        plan_id: planId,
        success_url: `${origin}/dashboard/billing?success=true`,
        cancel_url: `${origin}/dashboard/billing?canceled=true`,
      });
      globalThis.location.href = result.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const result = await api.billing.createPortal({
        return_url: `${globalThis.location.origin}/dashboard/billing`,
      });
      if (!isSafeExternalUrl(result.portal_url)) {
        throw new Error("Invalid billing portal URL returned by server.");
      }
      globalThis.location.href = result.portal_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
      setPortalLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading billing..." detail="Plan and usage" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={loadBilling} />;
  if (!billing) {
    return (
      <ErrorState
        variant="calm"
        message="Billing information could not be loaded."
        onRetry={loadBilling}
      />
    );
  }

  const statusInfo = STATUS_LABELS[billing.subscription_status] || STATUS_LABELS.inactive;
  const usage = normalizeLeadUsage(billing);
  const {
    leadsUsed,
    leadLimit,
    isUnlimited,
    hasFiniteCap,
    isAtLimit,
    usageTone,
    usageMeterMax,
    usageMeterValue,
  } = usage;
  const isTrial = billing.plan === "trial";
  const trialEndsStr = billing.trial_ends_at ? formatDate(billing.trial_ends_at) : "";
  const trialEndDate = billing.trial_ends_at ? new Date(billing.trial_ends_at) : null;
  const isTrialExpired =
    isTrial &&
    trialEndDate !== null &&
    !Number.isNaN(trialEndDate.getTime()) &&
    trialEndDate < new Date();
  const usageSummary = isUnlimited
    ? "Unlimited monthly patient requests on the current plan."
    : hasFiniteCap
      ? `${leadsUsed} of ${leadLimit} patient requests used this month.`
      : "Usage limits will appear when your plan includes a monthly request cap.";

  return (
    <div className="ds-workspace-main-area space-y-6">
      <PageHeader
        showDivider
        eyebrow={
          <>
            <CreditCard className="h-3.5 w-3.5" />
            Billing
          </>
        }
        title="Subscription &amp; account control"
        description="Entitlement, usage, Stripe portal, and upgrade paths in one decisive surface—payments are processed securely through Stripe."
      />

      {/* Stripe return feedback */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-800">
          <strong>{successMsg}</strong> It may take a moment to reflect.
        </div>
      )}
      {canceledMsg && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-sm text-amber-800">
          {canceledMsg}
        </div>
      )}

      <section className="ds-card p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div>
              <p className="ds-eyebrow">Billing command</p>
              <h2 className="mt-2 text-[1.95rem] font-bold tracking-tight text-app-text sm:text-[2.35rem]">
                Keep plan, usage, and payment controls in one confident surface.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-app-text-muted">
                This is your entitlement layer for patient-request volume, paid features, and secure Stripe account management. Plans change here; Stripe still handles cards, invoices, and receipts.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.3rem] border border-teal-200 bg-app-surface/90 px-4 py-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-app-text-muted">Current plan</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent-wash text-app-primary shadow-sm">
                    {PLAN_ICONS[billing.plan] || PLAN_ICONS.trial}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-app-text">{billing.plan_name}</p>
                    <span className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusInfo.bg} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.3rem] border border-app-border bg-app-surface/90 px-4 py-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-app-text-muted">Usage this month</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-app-text">
                  {leadsUsed}
                  {isUnlimited ? "" : <span className="text-lg font-semibold text-app-text-muted"> / {leadLimit}</span>}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-app-text-muted">{usageSummary}</p>
              </div>

              <div className="rounded-[1.3rem] border border-app-border bg-app-surface/90 px-4 py-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-app-text-muted">Billing channel</p>
                <p className="mt-3 text-base font-semibold text-app-text">
                  {billing.has_stripe_subscription ? "Stripe customer portal available" : "Trial without active Stripe subscription"}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-app-text-muted">
                  {billing.has_stripe_subscription
                    ? "Open invoices, payment methods, and receipts securely through Stripe."
                    : "The portal appears automatically once a paid subscription is created through checkout."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.45rem] border border-app-border bg-app-surface/94 p-5 shadow-(--ds-shadow-md)">
            <p className="ds-eyebrow">Stripe controls</p>
            <p className="mt-3 text-sm leading-relaxed text-app-text-muted">
              Use the customer portal for payment methods and invoices. Use the plan grid below when you want to move to a higher tier.
            </p>

            <div className="mt-4 space-y-3">
              {billing.has_stripe_subscription ? (
                <button
                  type="button"
                  onClick={() => void handleManageBilling()}
                  disabled={portalLoading}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-app-border bg-app-surface px-4 py-2.5 text-sm font-semibold text-app-text shadow-sm transition-all hover:-translate-y-px hover:bg-app-surface-alt disabled:opacity-50"
                >
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Open Stripe portal
                </button>
              ) : (
                <div className="rounded-xl border border-dashed border-app-border bg-app-surface-alt px-4 py-4 text-xs leading-relaxed text-app-text-muted">
                  No paid subscription is attached yet. Checkout below creates the Stripe customer relationship and unlocks the portal.
                </div>
              )}

              <div className="rounded-xl border border-app-border bg-app-surface-alt px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-app-text-muted">Billing posture</p>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-app-text-muted">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-app-primary" />
                    Critical account control stays here.
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-app-primary" />
                    Checkout and invoices stay in Stripe.
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-app-primary" />
                    Usage is measured from real patient-request volume.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="wave-billing-shell">
        <div className="grid gap-6 lg:grid-cols-[1fr_18rem] items-start">
          <div className="min-w-0 space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="workspace-main-frame border-teal-200 bg-app-accent-wash/35 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-widest text-app-accent-dark">Plan status</p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-app-text">{billing.plan_name}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-app-text-muted">
                      {isTrial
                        ? "Trial keeps the workspace live while you finish setup, validate chat, and decide when to unlock paid capacity."
                        : "Your workspace is on a paid plan. Use this area to understand current status before opening the Stripe portal or changing tiers."}
                    </p>
                    {isTrial && trialEndsStr && (
                      <p className={`mt-3 text-sm ${isTrialExpired ? "font-medium text-red-600" : "text-app-text-muted"}`}>
                        {isTrialExpired ? "Trial expired on " : "Trial ends "}
                        {trialEndsStr}
                      </p>
                    )}
                    {billing.subscription_status === "past_due" && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="font-medium">Payment issue detected</p>
                          <p className="text-red-600">Update the payment method in Stripe to keep paid features uninterrupted.</p>
                        </div>
                      </div>
                    )}
                    {billing.subscription_status === "canceled" && (
                      <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-700">
                        Your subscription is canceled but remains active until the current billing period ends.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="workspace-main-frame p-5">
                <h3 className="text-sm font-semibold text-app-text">Usage meter</h3>
                <p className="mt-1 text-xs leading-relaxed text-app-text-muted">
                  Every captured patient request counts toward plan capacity. This keeps billing tied to real front-desk volume instead of vanity metrics.
                </p>
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-sm text-app-text-muted">Patient requests</span>
                  <span className="text-sm font-semibold tabular-nums text-app-text">
                    {leadsUsed}
                    {isUnlimited ? "" : ` / ${leadLimit}`}
                  </span>
                </div>
                {hasFiniteCap ? (
                  <progress
                    className="billing-usage-meter mt-3"
                    data-usage-tone={usageTone}
                    max={usageMeterMax}
                    value={usageMeterValue}
                    aria-label={`Patient requests used: ${leadsUsed} of ${leadLimit}`}
                  />
                ) : null}
                <p className="mt-3 text-xs leading-relaxed text-app-text-muted">{usageSummary}</p>
                {isAtLimit && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">Request limit reached</p>
                      <p className="text-red-600">
                        New patient conversations pause until the next billing cycle unless you upgrade to a higher plan.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="ds-card p-5 xl:sticky xl:top-6">
              <p className="ds-eyebrow">Decision guide</p>
              <p className="mt-2 text-sm leading-relaxed text-app-text-muted">
                Trial is best while you finish setup. Professional adds real operating volume and SMS capability. Premium removes caps and adds deposits and priority support.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  { label: "Trial", detail: "Guided setup, preview, and early validation." },
                  { label: "Professional", detail: "Best for live clinics managing real intake volume." },
                  { label: "Premium", detail: "For teams running deposits, high throughput, and priority support." },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-app-border bg-app-surface px-3.5 py-3 shadow-sm">
                    <p className="text-sm font-semibold text-app-text">{item.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-app-text-muted">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Plans Comparison */}
      <div className="mt-6">
        <div className="ds-card mb-4 py-4!">
          <p className="ds-eyebrow">Upgrade path</p>
          <p className="mt-1 text-sm text-app-text-muted">
            Trial stays free for 14 days with no card. Professional adds SMS and higher volume. Premium removes caps and adds deposits and priority support. Choose the tier that matches your real front-desk volume, then let Stripe handle billing details.
          </p>
        </div>
        <h3 className="mt-1 text-sm font-semibold text-app-text">Compare plans</h3>
        <p className="mb-3 mt-1 text-xs text-app-text-muted">Move up when you need higher patient-request volume or professional features like Sheets sync.</p>
        {plans.length === 0 ? (
          <div className="rounded-xl border border-app-border bg-app-surface p-5 text-sm text-app-text-muted shadow-sm">
            Plan details are temporarily unavailable. Your current billing status is still accurate above.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.id === billing.plan;
              const isDowngrade =
                (billing.plan === "premium" && plan.id !== "premium") ||
                (billing.plan === "professional" && plan.id === "trial");
              const canUpgrade = !isCurrent && !isDowngrade && plan.id !== "trial";
              const isFeatured = plan.id === "professional";

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col overflow-hidden rounded-[1.45rem] border p-5 shadow-sm ${isCurrent
                    ? "border-teal-200 bg-[linear-gradient(180deg,rgba(236,253,250,0.96)_0%,rgba(255,255,255,0.96)_100%)] shadow-[0_24px_42px_-28px_rgba(15,118,110,0.45)]"
                    : isFeatured
                      ? "border-violet-300 bg-[linear-gradient(180deg,rgba(245,241,255,0.82)_0%,rgba(255,255,255,0.98)_100%)] shadow-[0_24px_42px_-28px_rgba(124,99,243,0.32)]"
                      : "border-app-border bg-app-surface shadow-[0_22px_38px_-30px_rgba(12,18,32,0.24)]"
                    }`}
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-teal-400 via-teal-600 to-violet-500" />
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCurrent ? "bg-app-accent-wash text-app-primary" : "bg-app-surface-alt text-app-text-muted"}`}>
                      {PLAN_ICONS[plan.id] || PLAN_ICONS.trial}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <h4 className="text-base font-semibold text-app-text">{plan.name}</h4>
                      {isCurrent ? (
                        <span className="rounded-full border border-teal-200 bg-app-accent-wash px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-app-accent-dark">
                          Current
                        </span>
                      ) : isFeatured ? (
                        <span className="rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-600">
                          Recommended
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm text-app-text-muted mb-3">{plan.description}</p>
                  <p className="text-2xl font-bold text-app-text mb-4">
                    {formatPrice(plan.monthly_price_cents)}
                  </p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={`feat-${f.slice(0, 30)}`} className="flex items-start gap-2 text-sm text-app-text-muted">
                        <Check className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {(() => {
                    if (isCurrent) {
                      return (
                        <div className="w-full py-2.5 text-center text-sm font-medium text-app-accent-dark bg-app-accent-wash rounded-lg">
                          Current plan
                        </div>
                      );
                    }
                    if (canUpgrade) {
                      return (
                        <button
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={checkoutLoading === plan.id}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-app-primary rounded-lg hover:bg-app-primary-hover disabled:opacity-50 transition-colors"
                        >
                          {checkoutLoading === plan.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              Upgrade <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      );
                    }
                    return (
                      <div className="w-full py-2.5 text-center text-sm font-medium text-app-text-muted bg-app-surface-alt rounded-lg border border-app-border">
                        {isDowngrade ? "Current or lower tier" : "Free"}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
