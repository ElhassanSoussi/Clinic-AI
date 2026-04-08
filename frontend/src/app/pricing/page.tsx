"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { startCheckoutForPlan, type PaidPlanId } from "@/lib/billing-checkout";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";

type Plan = {
  id: "trial" | PaidPlanId;
  name: string;
  audience: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  notIncluded?: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
};

const plans: Plan[] = [
  {
    id: "trial",
    name: "Starter Trial",
    audience: "For clinics evaluating the platform",
    price: "$0",
    period: "14 days",
    description:
      "Everything you need to evaluate Clinic AI with your real clinic data. No credit card. No obligation.",
    features: [
      "AI chat assistant trained on your real clinic info",
      "Full operator inbox (web chat)",
      "Appointments workspace",
      "Leads and patients dashboard",
      "AI training panel (services, hours, FAQs)",
      "25 captured patient requests",
      "Guided onboarding with live assistant preview",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    id: "professional",
    name: "Professional",
    audience: "For active front-desk operations",
    price: "$49",
    period: "/month",
    description:
      "The complete front-desk operating system for a busy clinic. SMS, staff review, reminders, and exports all included.",
    features: [
      "Everything in Starter Trial",
      "200 patient requests per month",
      "Two-way SMS inbox",
      "Human review controls for every conversation",
      "Appointment reminders and follow-up visibility",
      "Google Sheets and Excel export",
      "Cancellation and reschedule tracking",
    ],
    cta: "Choose Professional",
    highlighted: true,
    badge: "Most popular",
  },
  {
    id: "premium",
    name: "Premium",
    audience: "For higher-volume clinics",
    price: "$99",
    period: "/month",
    description:
      "No request caps, deposit tracking, custom branding, and priority support for clinics with high patient volume.",
    features: [
      "Everything in Professional",
      "Unlimited patient requests",
      "Deposit requests and payment tracking",
      "Custom assistant branding",
      "Advanced operational visibility",
      "Priority support with faster response times",
      "Dedicated onboarding assistance",
    ],
    cta: "Choose Premium",
    highlighted: false,
  },
];

const comparisonRows: { label: string; trial: boolean | string; pro: boolean | string; premium: boolean | string }[] = [
  { label: "AI chat assistant", trial: true, pro: true, premium: true },
  { label: "Operator inbox (web chat)", trial: true, pro: true, premium: true },
  { label: "Appointments workspace", trial: true, pro: true, premium: true },
  { label: "AI training panel", trial: true, pro: true, premium: true },
  { label: "Leads and patients dashboard", trial: true, pro: true, premium: true },
  { label: "Patient requests included", trial: "25", pro: "200/mo", premium: "Unlimited" },
  { label: "Two-way SMS inbox", trial: false, pro: true, premium: true },
  { label: "Human review controls", trial: true, pro: true, premium: true },
  { label: "Follow-up visibility", trial: true, pro: true, premium: true },
  { label: "Google Sheets / Excel export", trial: false, pro: true, premium: true },
  { label: "Appointment reminders", trial: false, pro: true, premium: true },
  { label: "Deposit tracking", trial: false, pro: false, premium: true },
  { label: "Custom assistant branding", trial: false, pro: false, premium: true },
  { label: "Priority support", trial: false, pro: false, premium: true },
];

const pricingFaqs = [
  {
    question: "Do I need a credit card to start the free trial?",
    answer:
      "No. The 14-day trial starts immediately with no payment details required. You upgrade to a paid plan only when you are ready.",
  },
  {
    question: "What counts as a patient request?",
    answer:
      "A patient request is counted when a patient initiates a conversation through your chat widget or SMS number. Internal staff messages and system actions do not count.",
  },
  {
    question: "Can I change my plan later?",
    answer:
      "Yes. You can upgrade or downgrade at any time from the billing settings in your workspace. Changes take effect at your next billing cycle.",
  },
  {
    question: "What happens when I hit the request limit?",
    answer:
      "On the Professional plan, we will notify you when you are approaching the 200-request limit. You can upgrade to Premium for unlimited requests at any time.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. There are no lock-in contracts. Cancel from your billing settings at any time and you will retain access until the end of your current billing period.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "Your workspace and conversation history remain intact for a grace period after cancellation. You can export your data before or after cancelling.",
  },
];

function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm font-semibold text-[#0F172A]">{value}</span>;
  }
  return value ? (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#CCFBF1] text-[#115E59]">
      <Check className="h-3.5 w-3.5" />
    </div>
  ) : (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F1F5F9] text-[#CBD5E1]">
      <X className="h-3.5 w-3.5" />
    </div>
  );
}

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

      {/* Hero */}
      <section className="marketing-hero marketing-surface-white border-b border-slate-200">
        <div className="marketing-container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="marketing-kicker mx-auto mb-6">
              <Sparkles className="h-3 w-3" />
              Pricing
            </div>
            <h1 className="marketing-h1">
              Honest pricing for real clinic operations.
            </h1>
            <p className="marketing-lead mt-6 mx-auto max-w-xl">
              No per-message fees. No hidden costs. No lock-in contracts. Choose the plan that fits your patient volume and upgrade or cancel anytime.
            </p>
          </div>
        </div>
      </section>

      <main>
        <div className="marketing-container">

          {/* Plan cards */}
          <section className="marketing-section marketing-surface-elevated border-b border-slate-200/80">
            {checkoutError ? (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#DC2626]">
                {checkoutError}
              </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col overflow-hidden rounded-2xl border p-8 ${plan.highlighted
                      ? "border-[#0F766E] bg-[#FFFFFF] shadow-xl shadow-teal-900/6"
                      : "border-[#E2E8F0] bg-[#FFFFFF] shadow-sm"
                    }`}
                >
                  {plan.badge ? (
                    <div className="mb-5 inline-flex rounded-full border border-[#99f6e4] bg-[#CCFBF1] px-3 py-1 text-xs font-semibold text-[#115E59]">
                      {plan.badge}
                    </div>
                  ) : null}

                  <div>
                    <h3 className="text-base font-semibold text-[#0F172A]">{plan.name}</h3>
                    <p className="mt-1 text-xs text-[#64748B]">{plan.audience}</p>
                  </div>

                  <div className="mt-6 flex items-end gap-2">
                    <span className="text-4xl font-bold text-[#0F172A]">{plan.price}</span>
                    <span className="pb-1.5 text-sm font-medium text-[#64748B]">{plan.period}</span>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[#475569]">{plan.description}</p>

                  <div className="mt-7 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm text-[#475569]">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#CCFBF1] text-[#115E59]">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8">
                    {plan.id === "trial" ? (
                      <Link
                        href="/register"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#115E59]"
                      >
                        {plan.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePaidPlanClick(plan.id as PaidPlanId)}
                        disabled={checkoutLoading === plan.id}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${plan.highlighted
                            ? "bg-[#0F766E] text-white hover:bg-[#115E59]"
                            : "border border-[#CBD5E1] bg-[#FFFFFF] text-[#0F172A] hover:bg-[#F8FAFC]"
                          }`}
                      >
                        {checkoutLoading === plan.id ? "Loading..." : plan.cta}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-center text-sm text-[#64748B]">
              All paid plans include a full refund if cancelled within 7 days. Questions?{" "}
              <Link href="/contact" className="font-semibold text-[#0F766E] hover:text-[#115E59]">
                Talk to us
              </Link>
              .
            </p>
          </section>

          {/* Feature comparison */}
          <section className="marketing-section marketing-surface-white border-b border-slate-200/80">
            <div className="mb-10 max-w-2xl">
              <div className="marketing-kicker mb-5">
                <Check className="h-3 w-3" />
                Feature comparison
              </div>
              <h2 className="marketing-h2">What&apos;s included in each plan.</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0]">
                    <th className="pb-4 pr-6 text-left text-sm font-medium text-[#64748B]">Feature</th>
                    <th className="px-4 pb-4 text-center text-sm font-semibold text-[#0F172A]">Trial</th>
                    <th className="px-4 pb-4 text-center text-sm font-semibold text-[#0F766E]">Professional</th>
                    <th className="px-4 pb-4 text-center text-sm font-semibold text-[#0F172A]">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <td className="py-3 pr-6 text-sm text-[#475569]">{row.label}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <CellValue value={row.trial} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <CellValue value={row.pro} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <CellValue value={row.premium} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Pricing FAQ */}
          <section className="marketing-section marketing-surface-slate border-b border-slate-300/50">
            <div className="mb-10 max-w-2xl">
              <div className="marketing-kicker mb-5">
                <ShieldCheck className="h-3 w-3" />
                Common billing questions
              </div>
              <h2 className="marketing-h2">Everything you need to know about plans.</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {pricingFaqs.map((item) => (
                <div key={item.question} className="rounded-2xl border border-white/80 bg-white p-7 shadow-sm">
                  <h3 className="text-[1.0625rem] font-semibold text-[#0F172A]">{item.question}</h3>
                  <p className="marketing-body mt-3">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* CTA */}
        <section className="marketing-final-act">
          <div className="marketing-container">
            <div className="overflow-hidden rounded-3xl bg-[#0F766E] px-8 py-12 shadow-2xl shadow-teal-950/25 sm:px-12 sm:py-16 lg:px-14">
              <div className="grid gap-10 xl:grid-cols-[1fr_auto] xl:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/35 bg-teal-800/40 px-4 py-1.5 text-[0.8125rem] font-semibold uppercase tracking-[0.07em] text-teal-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    No credit card needed
                  </div>
                  <h2 className="mt-6 text-[clamp(1.875rem,2vw+1rem,2.75rem)] font-bold tracking-tight text-white">
                    Start with the free trial.
                  </h2>
                  <p className="mt-4 max-w-xl text-[1.125rem] leading-relaxed text-teal-100">
                    14 days, full platform, your real clinic information. No commitment until you are ready.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row xl:flex-col xl:items-stretch">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-[1rem] font-semibold text-[#0F766E] shadow-lg transition-colors hover:bg-teal-50"
                  >
                    Start free trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/chat/demo"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-teal-300/50 bg-teal-800/40 px-8 py-4 text-[1rem] font-semibold text-white transition-colors hover:bg-teal-800/60"
                  >
                    <MessageSquareMore className="h-4 w-4" />
                    Try the live demo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
