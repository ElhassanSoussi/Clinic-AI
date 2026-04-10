"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { startCheckoutForPlan, type PaidPlanId } from "@/lib/billing-checkout";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";

type Plan = {
  id: "trial" | PaidPlanId;
  name: string;
  price: string;
  detail: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

const plans: Plan[] = [
  {
    id: "trial",
    name: "Starter Trial",
    price: "$0",
    detail: "14 days",
    description: "Use the real product with no card while you configure and evaluate fit.",
    features: [
      "Real dashboard routes and inbox surfaces",
      "AI training workspace",
      "Preview chat before launch",
      "Guided clinic setup",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "$49",
    detail: "per month",
    description: "For active clinic front desks that need a dependable operating layer.",
    highlighted: true,
    features: [
      "Everything in trial",
      "Operational inbox and follow-up workflow",
      "Appointment reminders",
      "Shared team visibility",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$99",
    detail: "per month",
    description: "For higher-volume clinics that want more control and operational depth.",
    features: [
      "Everything in professional",
      "Unlimited patient requests",
      "Deposit workflow support",
      "Priority support",
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState<PaidPlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  const handlePaidPlanClick = async (planId: PaidPlanId) => {
    setCheckoutLoading(planId);
    setCheckoutError("");
    try {
      if (globalThis.window === undefined) return;
      const accessToken = globalThis.localStorage.getItem("access_token");
      if (!accessToken) {
        router.push(`/register?plan=${planId}`);
        return;
      }
      await startCheckoutForPlan(planId);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Failed to start checkout.");
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="public-marketing-root">
      <PublicNav />
      <main>
        <section className="marketing-container py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="marketing-kicker">
              <ShieldCheck className="h-3.5 w-3.5" />
              Pricing
            </div>
            <h1 className="mt-6 text-[clamp(2.5rem,3vw,4.4rem)] font-bold tracking-[-0.055em] text-app-text">
              Clear pricing for teams that want a serious front-desk product, not a throwaway pilot.
            </h1>
            <p className="mt-5 text-base leading-8 text-app-text-secondary">
              Start with the real workspace for free, then move into the plan that matches your clinic’s operational load.
            </p>
          </div>

          {checkoutError ? (
            <div className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {checkoutError}
            </div>
          ) : null}

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={`panel-surface rounded-4xl p-7 ${plan.highlighted ? "ring-1 ring-app-primary/30 shadow-[0_28px_60px_-34px_rgba(15,143,131,0.45)]" : ""}`}
              >
                <p className="panel-section-head">
                  {plan.name}
                </p>
                <div className="mt-5 flex items-end gap-2">
                  <span className="text-5xl font-bold tracking-[-0.07em] text-app-text">{plan.price}</span>
                  <span className="pb-1 text-sm text-app-text-muted">{plan.detail}</span>
                </div>
                <p className="mt-5 text-sm leading-7 text-app-text-secondary">{plan.description}</p>
                <ul className="mt-6 grid gap-3 text-sm text-app-text-secondary">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-app-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  {plan.id === "trial" ? (
                    <Link href="/register" className="app-btn app-btn-secondary w-full">
                      Start free trial
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="app-btn app-btn-primary w-full"
                      onClick={() => void handlePaidPlanClick(plan.id as PaidPlanId)}
                      disabled={checkoutLoading === plan.id}
                    >
                      {checkoutLoading === plan.id ? "Starting checkout..." : `Choose ${plan.name}`}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
