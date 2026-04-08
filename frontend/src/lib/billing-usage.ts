import type { BillingStatus } from "@/types";

/**
 * Coerces API billing usage fields to finite numbers so <progress> and UI math
 * never receive NaN (React warns when max/value are NaN).
 */
export function normalizeLeadUsage(billing: BillingStatus) {
  const rawLimit = billing.monthly_lead_limit;
  const rawUsed = billing.monthly_leads_used;
  const leadLimit =
    typeof rawLimit === "number" && Number.isFinite(rawLimit) ? rawLimit : 0;
  const leadsUsed =
    typeof rawUsed === "number" && Number.isFinite(rawUsed) ? rawUsed : 0;
  const isUnlimited = leadLimit === -1;
  const hasFiniteCap = !isUnlimited && leadLimit > 0;
  const usagePercent =
    isUnlimited || leadLimit <= 0
      ? 0
      : Math.min(100, Math.round((leadsUsed / leadLimit) * 100));
  const isAtLimit = hasFiniteCap && leadsUsed >= leadLimit;
  const usageTone: "ok" | "warn" | "critical" = isAtLimit
    ? "critical"
    : usagePercent > 80
      ? "warn"
      : "ok";
  const usageMeterMax = Math.max(1, leadLimit);
  const usageMeterValue = Math.min(Math.max(0, leadsUsed), usageMeterMax);

  return {
    leadsUsed,
    leadLimit,
    isUnlimited,
    hasFiniteCap,
    usagePercent,
    isAtLimit,
    usageTone,
    usageMeterMax,
    usageMeterValue,
  };
}
