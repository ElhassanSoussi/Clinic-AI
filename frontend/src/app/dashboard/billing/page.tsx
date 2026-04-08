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
  inactive: { label: "Inactive", color: "text-[#0F172A]", bg: "bg-[#F8FAFC] border-[#E2E8F0]" },
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  trial: <Shield className="w-5 h-5" />,
  professional: <Zap className="w-5 h-5" />,
  premium: <Crown className="w-5 h-5" />,
};

function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(0)}/mo`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
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
  if (!billing) return null;

  const statusInfo = STATUS_LABELS[billing.subscription_status] || STATUS_LABELS.inactive;
  const usagePercent =
    billing.monthly_lead_limit === -1
      ? 0
      : Math.min(100, Math.round((billing.monthly_leads_used / billing.monthly_lead_limit) * 100));
  const isAtLimit =
    billing.monthly_lead_limit !== -1 && billing.monthly_leads_used >= billing.monthly_lead_limit;
  const isTrial = billing.plan === "trial";
  const trialEndsStr = billing.trial_ends_at ? formatDate(billing.trial_ends_at) : "";
  const isTrialExpired =
    isTrial && billing.trial_ends_at && new Date(billing.trial_ends_at) < new Date();
  const usageTone: "ok" | "warn" | "critical" = isAtLimit
    ? "critical"
    : usagePercent > 80
      ? "warn"
      : "ok";
  const usageMeterMax = Math.max(1, billing.monthly_lead_limit);
  const usageMeterValue = Math.min(billing.monthly_leads_used, usageMeterMax);

  return (
    <div className="mx-auto max-w-6xl workspace-page">
      <PageHeader
        showDivider
        eyebrow={
          <>
            <CreditCard className="h-3.5 w-3.5" />
            Billing
          </>
        }
        title="Subscription workspace"
        description="Current entitlement, real usage against limits, and upgrade paths—organized as account control, not a secondary settings page. Payments are processed securely through Stripe."
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

      <div className="workspace-split items-start">
        <div className="min-w-0 space-y-4">
          {/* Current plan + usage */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Current Plan Card */}
            <div className="workspace-main-frame border-[#99f6e4] bg-[#CCFBF1]/40 p-5 shadow-[0_1px_3px_rgb(15_23_42/0.06)]">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#115E59]">Current plan</p>
              <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-[#CCFBF1] flex items-center justify-center text-[#0F766E]">
                      {PLAN_ICONS[billing.plan] || PLAN_ICONS.trial}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold tracking-tight text-[#0F172A]">{billing.plan_name}</h2>
                      <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${statusInfo.bg} ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                  {isTrial && trialEndsStr && (
                    <p className={`text-sm mt-2 ${isTrialExpired ? "text-red-600 font-medium" : "text-[#475569]"}`}>
                      {isTrialExpired ? "Trial expired on " : "Trial ends "}
                      {trialEndsStr}
                    </p>
                  )}
                  {billing.subscription_status === "past_due" && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      Payment failed. Please update your payment method to continue service.
                    </div>
                  )}
                  {billing.subscription_status === "canceled" && (
                    <p className="text-sm text-amber-600 mt-2">
                      Your subscription is canceled but remains active until the end of the billing period.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Usage Card */}
            <div className="workspace-main-frame p-5">
              <h3 className="text-sm font-semibold text-[#0F172A] mb-1">Usage this month</h3>
              <p className="mb-4 text-xs text-[#64748B]">Each captured patient request counts toward your plan limit.</p>
              <div className="flex items-end justify-between mb-2">
                <span className="text-sm text-[#475569]">
                  Patient requests
                </span>
                <span className="text-sm font-semibold tabular-nums text-[#0F172A]">
                  {billing.monthly_leads_used}
                  {billing.monthly_lead_limit === -1 ? "" : ` / ${billing.monthly_lead_limit}`}
                </span>
              </div>
              {billing.monthly_lead_limit !== -1 && (
                <progress
                  className="billing-usage-meter"
                  data-usage-tone={usageTone}
                  max={usageMeterMax}
                  value={usageMeterValue}
                  aria-label={`Patient requests used: ${billing.monthly_leads_used} of ${billing.monthly_lead_limit}`}
                />
              )}
              {billing.monthly_lead_limit === -1 && (
                <p className="text-xs text-[#64748B] mt-1">Unlimited requests on your current plan</p>
              )}
              {isAtLimit && (
                <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Request limit reached</p>
                    <p className="text-red-600">
                      New patient conversations are paused until the next billing cycle. Upgrade your plan to continue.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="workspace-side-rail">
          <div className="workspace-rail-card p-5 xl:sticky xl:top-6">
            <p className="workspace-rail-title">Account actions</p>
            <p className="mt-2 text-xs leading-relaxed text-[#475569]">
              Open the Stripe customer portal for payment methods and invoices. Plan changes start from the comparison grid below.
            </p>
            {billing.has_stripe_subscription ? (
              <button
                type="button"
                onClick={() => void handleManageBilling()}
                disabled={portalLoading}
                className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Stripe customer portal
              </button>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2.5 text-xs text-[#64748B]">
                The portal appears once you have an active paid subscription through checkout.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* Plans Comparison */}
      <div>
        <p className="workspace-section-label">Upgrade path</p>
        <h3 className="mt-1 text-sm font-semibold text-[#0F172A]">Compare plans</h3>
        <p className="mb-3 mt-1 text-xs text-[#64748B]">Move up when you need higher patient-request volume or professional features like Sheets sync.</p>
        {plans.length === 0 ? (
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 text-sm text-[#475569] shadow-sm">
            Plan details are temporarily unavailable. Your current billing status is still accurate above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {plans.map((plan) => {
              const isCurrent = plan.id === billing.plan;
              const isDowngrade =
                (billing.plan === "premium" && plan.id !== "premium") ||
                (billing.plan === "professional" && plan.id === "trial");
              const canUpgrade = !isCurrent && !isDowngrade && plan.id !== "trial";

              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border p-5 flex flex-col ${isCurrent
                    ? "border-[#99f6e4] bg-[#CCFBF1]/80 shadow-sm"
                    : "border-[#E2E8F0] bg-white shadow-sm"
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCurrent ? "bg-[#CCFBF1] text-[#0F766E]" : "bg-[#F1F5F9] text-[#475569]"}`}>
                      {PLAN_ICONS[plan.id] || PLAN_ICONS.trial}
                    </div>
                    <h4 className="text-base font-semibold text-[#0F172A]">{plan.name}</h4>
                  </div>
                  <p className="text-sm text-[#475569] mb-3">{plan.description}</p>
                  <p className="text-2xl font-bold text-[#0F172A] mb-4">
                    {formatPrice(plan.monthly_price_cents)}
                  </p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={`feat-${f.slice(0, 30)}`} className="flex items-start gap-2 text-sm text-[#475569]">
                        <Check className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {(() => {
                    if (isCurrent) {
                      return (
                        <div className="w-full py-2.5 text-center text-sm font-medium text-[#115E59] bg-[#CCFBF1] rounded-lg">
                          Current plan
                        </div>
                      );
                    }
                    if (canUpgrade) {
                      return (
                        <button
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={checkoutLoading === plan.id}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-[#0F766E] rounded-lg hover:bg-[#115E59] disabled:opacity-50 transition-colors"
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
                      <div className="w-full py-2.5 text-center text-sm font-medium text-[#64748B] bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
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
