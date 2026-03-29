import { api } from "@/lib/api";

export type PaidPlanId = "professional" | "premium";

export function getPaidPlanId(plan: string | null | undefined): PaidPlanId | null {
  if (plan === "professional" || plan === "premium") {
    return plan;
  }

  return null;
}

export async function startCheckoutForPlan(planId: PaidPlanId) {
  const origin = globalThis.location.origin;
  const result = await api.billing.createCheckout({
    plan_id: planId,
    success_url: `${origin}/dashboard/billing?success=true`,
    cancel_url: `${origin}/dashboard/billing?canceled=true`,
  });

  globalThis.location.href = result.checkout_url;
}
