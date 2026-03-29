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
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import type { BillingStatus, PlanInfo } from "@/types";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: "Active", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  trialing: { label: "Trial", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  canceled: { label: "Canceled", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  past_due: { label: "Past Due", color: "text-red-700", bg: "bg-red-50 border-red-200" },
  inactive: { label: "Inactive", color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
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
      setPlans(plansData);
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
      globalThis.window !== undefined
        ? new URLSearchParams(globalThis.location.search)
        : new URLSearchParams();

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
      globalThis.location.href = result.portal_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
      setPortalLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading billing..." />;
  if (error) return <ErrorState message={error} onRetry={loadBilling} />;
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

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Billing & Plan</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your subscription and view usage
        </p>
      </div>

      {/* Stripe return feedback */}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
          <strong>{successMsg}</strong> It may take a moment to reflect.
        </div>
      )}
      {canceledMsg && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          {canceledMsg}
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                {PLAN_ICONS[billing.plan] || PLAN_ICONS.trial}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{billing.plan_name}</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${statusInfo.bg} ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
            {isTrial && trialEndsStr && (
              <p className={`text-sm mt-2 ${isTrialExpired ? "text-red-600 font-medium" : "text-slate-500"}`}>
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
          {billing.has_stripe_subscription && (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {portalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Manage Billing
            </button>
          )}
        </div>
      </div>

      {/* Usage Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Monthly Usage</h3>
        <div className="flex items-end justify-between mb-2">
          <span className="text-sm text-slate-600">
            Leads captured this month
          </span>
          <span className="text-sm font-medium text-slate-900">
            {billing.monthly_leads_used}
            {billing.monthly_lead_limit === -1 ? "" : ` / ${billing.monthly_lead_limit}`}
          </span>
        </div>
        {billing.monthly_lead_limit !== -1 && (
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={(() => {
                let barColor: string;
                if (isAtLimit) {
                  barColor = "bg-red-500";
                } else if (usagePercent > 80) {
                  barColor = "bg-amber-500";
                } else {
                  barColor = "bg-teal-500";
                }
                return `h-full rounded-full transition-all ${barColor}`;
              })()}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        )}
        {billing.monthly_lead_limit === -1 && (
          <p className="text-xs text-slate-400 mt-1">Unlimited leads on your plan</p>
        )}
        {isAtLimit && (
          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Lead limit reached</p>
              <p className="text-red-600">
                New patient conversations will be paused. Upgrade your plan to continue capturing leads.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Plans Comparison */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === billing.plan;
            const isDowngrade =
              (billing.plan === "premium" && plan.id !== "premium") ||
              (billing.plan === "professional" && plan.id === "trial");
            const canUpgrade = !isCurrent && !isDowngrade && plan.id !== "trial";

            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-6 flex flex-col ${
                  isCurrent
                    ? "border-teal-300 bg-teal-50/50 ring-1 ring-teal-200"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isCurrent ? "bg-teal-100 text-teal-600" : "bg-slate-100 text-slate-500"}`}>
                    {PLAN_ICONS[plan.id] || PLAN_ICONS.trial}
                  </div>
                  <h4 className="text-base font-semibold text-slate-900">{plan.name}</h4>
                </div>
                <p className="text-sm text-slate-500 mb-3">{plan.description}</p>
                <p className="text-2xl font-bold text-slate-900 mb-4">
                  {formatPrice(plan.monthly_price_cents)}
                </p>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={`feat-${f.slice(0, 30)}`} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {(() => {
                  if (isCurrent) {
                    return (
                      <div className="w-full py-2.5 text-center text-sm font-medium text-teal-700 bg-teal-100 rounded-lg">
                        Current Plan
                      </div>
                    );
                  }
                  if (canUpgrade) {
                    return (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={checkoutLoading === plan.id}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
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
                    <div className="w-full py-2.5 text-center text-sm font-medium text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
                      {isDowngrade ? "Current or lower tier" : "Free"}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Manage via portal for existing subscribers */}
      {billing.has_stripe_subscription && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-900">Payment & Invoices</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update payment method, view invoices, or cancel your subscription through the Stripe portal.
              </p>
            </div>
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              Open Portal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
