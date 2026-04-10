"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import type { BillingStatus, PlanInfo } from "@/types";

const fallbackPlans: PlanInfo[] = [
  {
    id: "professional",
    name: "Professional",
    description: "Operational plan for active clinic teams.",
    monthly_lead_limit: 200,
    monthly_price_cents: 4900,
    features: ["Shared inbox", "Booking pipeline", "Training controls"],
  },
  {
    id: "premium",
    name: "Premium",
    description: "Higher-volume plan with expanded operational headroom.",
    monthly_lead_limit: 0,
    monthly_price_cents: 9900,
    features: ["Unlimited requests", "Deposit workflow", "Priority support"],
  },
];

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>(fallbackPlans);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statusData, plansData] = await Promise.all([
        api.billing.getStatus(),
        api.billing.getPlans().catch(() => fallbackPlans),
      ]);
      setBilling(statusData);
      setPlans(plansData.length > 0 ? plansData : fallbackPlans);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const openPortal = async () => {
    const result = await api.billing.createPortal({
      return_url: `${globalThis.location.origin}/dashboard/billing`,
    });
    globalThis.location.href = result.portal_url;
  };

  if (loading) return <LoadingState message="Loading billing..." detail="Restoring plans and usage" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadBilling()} />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Billing"
        title="Billing control center"
        description="Current plan posture, usage, and upgrade options in the same premium settings family."
        actions={
          <button type="button" className="app-btn app-btn-secondary" onClick={() => void openPortal()}>
            <ExternalLink className="h-4 w-4" />
            Open billing portal
          </button>
        }
      />

      <div className="panel-surface rounded-4xl p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="panel-section-head">Current plan</p>
            <h2 className="mt-2.5 text-[2rem] font-bold tracking-[-0.055em] text-app-text">
              {billing?.plan_name || "Starter Trial"}
            </h2>
            <p className="mt-2 text-sm text-app-text-muted">
              {billing
                ? `${billing.monthly_leads_used}/${billing.monthly_lead_limit || "unlimited"} requests used`
                : "Usage details are unavailable."}
            </p>
          </div>
          <div className="metric-mini shrink-0">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-app-primary" />
              <span className="panel-section-head">Subscription status</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-app-text">{billing?.subscription_status || "trialing"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.id} className="panel-surface rounded-4xl p-6">
            <p className="panel-section-head">{plan.name}</p>
            <p className="mt-2.5 text-[2rem] font-bold tracking-[-0.055em] text-app-text">
              ${(plan.monthly_price_cents / 100).toFixed(0)}
              <span className="ml-2 text-base font-semibold text-app-text-muted">/ mo</span>
            </p>
            <p className="mt-3 text-sm leading-6 text-app-text-secondary">{plan.description}</p>
            <ul className="mt-4 grid gap-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-app-text-secondary">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-app-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
