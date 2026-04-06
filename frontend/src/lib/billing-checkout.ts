import { api } from "@/lib/api";
import { isSafeExternalUrl } from "@/lib/utils";

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

  if (!isSafeExternalUrl(result.checkout_url)) {
    throw new Error("Invalid checkout URL returned by server.");
  }

  globalThis.location.href = result.checkout_url;
}
