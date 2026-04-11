"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, ExternalLink } from "lucide-react";
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

  const usagePercent = useMemo(() => {
    if (!billing?.monthly_lead_limit) return 0;
    return Math.min(100, (billing.monthly_leads_used / billing.monthly_lead_limit) * 100);
  }, [billing?.monthly_leads_used, billing?.monthly_lead_limit]);

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

      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Current plan</p>
            <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-foreground">
              {billing?.plan_name || "Starter Trial"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {billing
                ? `${billing.monthly_leads_used}/${billing.monthly_lead_limit || "unlimited"} requests used`
                : "Usage details are unavailable."}
            </p>
            {billing?.monthly_lead_limit ? (
              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-start gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Subscription</span>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{billing?.subscription_status || "trialing"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {plans.map((plan) => (
          <article key={plan.id} className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
            <p className="mt-2 text-xl font-bold tracking-[-0.04em] text-foreground">
              ${(plan.monthly_price_cents / 100).toFixed(0)}
              <span className="ml-2 text-sm font-semibold text-muted-foreground">/ mo</span>
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</p>
            <ul className="mt-4 grid gap-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
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
