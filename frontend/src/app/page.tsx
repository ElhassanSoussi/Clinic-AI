"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ContactRound,
  Inbox,
  LayoutGrid,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Workflow,
} from "lucide-react";

import { startCheckoutForPlan, type PaidPlanId } from "@/lib/billing-checkout";
import { MarketingProductWindow } from "@/components/marketing/MarketingProductWindow";
import { PublicFooter } from "@/components/marketing/PublicFooter";
import { PublicNav } from "@/components/marketing/PublicNav";

type LandingPlan = {
  id: "trial" | PaidPlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  badge?: string;
  featured?: boolean;
};

const operatingPillars = [
  {
    icon: Inbox,
    title: "One operating inbox",
    description:
      "Web chat, SMS, patient requests, and manual takeovers stay in one visible queue.",
  },
  {
    icon: CalendarDays,
    title: "Booking without blind spots",
    description:
      "Requests, reminders, deposits, and appointment status stay connected to the original thread.",
  },
  {
    icon: BrainCircuit,
    title: "Grounded AI behavior",
    description:
      "The assistant uses your configured clinic info only and holds uncertain replies for staff review.",
  },
  {
    icon: Workflow,
    title: "Follow-through built in",
    description:
      "Stalled inquiries, missed callbacks, and next steps stay visible before they turn into lost patients.",
  },
];

const systemPoints = [
  "Real dashboard routes from day one",
  "Staff review and takeover included",
  "Patients stay tied to bookings and follow-up",
];

const afterSignupJourney = [
  {
    step: "01",
    title: "Create the workspace",
    description:
      "Sign up and land in the same dashboard trial and paid clinics use. Nothing is a fake demo surface.",
  },
  {
    step: "02",
    title: "Train with real clinic information",
    description:
      "Services, hours, FAQs, assistant copy, and spreadsheet links become the source of truth for replies.",
  },
  {
    step: "03",
    title: "Test the patient experience",
    description:
      "Preview your public chat page, run intake scenarios, and keep the clinic in a not-live state until you are ready.",
  },
  {
    step: "04",
    title: "Operate from one command surface",
    description:
      "Inbox, Leads, Appointments, Training, Billing, and Settings stay connected once patients start reaching out.",
  },
];

const plans: LandingPlan[] = [
  {
    id: "trial",
    name: "Starter Trial",
    price: "$0",
    period: "14 days free",
    description:
      "Set up with your real clinic data, test the assistant, and see the full workspace before paying.",
    features: [
      "AI chat assistant trained on your clinic data",
      "Inbox, leads, appointments, and settings",
      "25 patient requests included",
      "Guided onboarding and live preview chat",
    ],
    cta: "Start free trial",
  },
  {
    id: "professional",
    name: "Professional",
    price: "$49",
    period: "/month",
    description:
      "For clinics running real front-desk volume with SMS, reminders, exports, and operational review.",
    features: [
      "Everything in Starter Trial",
      "200 patient requests per month",
      "Two-way SMS inbox with human review",
      "Reminder readiness and export tools",
    ],
    cta: "Choose Professional",
    badge: "Most popular",
    featured: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "$99",
    period: "/month",
    description:
      "For higher-volume clinics that need unlimited requests, deposits, and stronger operational visibility.",
    features: [
      "Everything in Professional",
      "Unlimited patient requests",
      "Deposit request tracking",
      "Priority support and custom branding",
    ],
    cta: "Choose Premium",
  },
];

const faqs = [
  {
    question: "How long does setup take?",
    answer:
      "Most clinics finish the first setup in under 15 minutes. You can keep refining services, hours, and training later from Settings.",
  },
  {
    question: "Can staff review and override the assistant?",
    answer:
      "Yes. Staff can review any thread, edit suggested replies, take over manually, or pause AI responses entirely.",
  },
  {
    question: "What happens when the assistant is not sure?",
    answer:
      "It holds the reply and flags the conversation for staff review instead of guessing.",
  },
  {
    question: "Is this just a booking widget?",
    answer:
      "No. Clinic AI covers intake, conversation handling, follow-up visibility, booking status, reminders, and staff operations from one workspace.",
  },
];

const previewNav = [
  "Dashboard",
  "Inbox",
  "Leads",
  "Appointments",
  "Customers",
  "Operations",
  "AI Training",
  "Billing",
];

export default function LandingPage() {
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

      {/* ═══ HERO — full-bleed depth stage ═══ */}
      <section className="marketing-hero marketing-hero-wave marketing-hero-premium relative overflow-hidden border-b border-(--color-ds-frame-border-light)">
        <div className="marketing-container relative z-1">
          <div className="mx-auto max-w-4xl py-20 text-center sm:py-28 lg:py-32">
            <div className="marketing-kicker mx-auto mb-8 w-fit">
              <Sparkles className="h-3.5 w-3.5" />
              AI front-desk operating system
            </div>
            <h1 className="marketing-h1 mx-auto max-w-208 text-balance">
              Run the front desk your clinic deserves — even after hours.
            </h1>
            <p className="marketing-lead mx-auto mt-7 max-w-2xl text-balance">
              Clinic AI answers patients, captures booking requests, and keeps staff working from one premium workspace for inbox, leads, appointments, training, billing, and go-live control.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/register" className="marketing-cta-primary">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/chat/demo" className="marketing-cta-secondary">
                <MessageSquareMore className="h-4 w-4 text-app-primary" />
                Try live demo
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {systemPoints.map((item) => (
                <span key={item} className="marketing-trust-chip">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-app-primary" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Floating product preview — centered below hero text */}
        <div className="marketing-container relative z-1 pb-16 lg:pb-20">
          <MarketingProductWindow
            pathLabel="/dashboard/inbox"
            caption="Illustrative composition of the real signed-in routes: Dashboard, Inbox, Leads, Appointments, Training, Billing, and Settings."
          >
            <div className="marketing-hero-preview p-5 sm:p-6 lg:p-7">
              <div className="grid gap-4 lg:grid-cols-[10rem_1fr_12rem]">
                {/* Mini sidebar */}
                <aside className="hidden rounded-xl border border-(--color-ds-frame-border-light) bg-linear-to-b from-teal-50 to-teal-50 p-3 shadow-(--ds-shadow-sm) lg:block">
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[linear-gradient(180deg,#14b8a6_0%,#0f766e_100%)] text-white shadow-(--ds-shadow-md)">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[0.75rem] font-semibold text-app-text">Clinic AI</span>
                  </div>
                  <div className="space-y-1">
                    {previewNav.map((item) => (
                      <div
                        key={item}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[0.72rem] font-semibold ${
                          item === "Inbox"
                            ? "border border-white bg-white text-app-primary shadow-(--ds-shadow-sm)"
                            : "text-app-text-muted"
                        }`}
                      >
                        <div className={`h-2 w-2 rounded-full ${item === "Inbox" ? "bg-app-primary" : "bg-slate-300"}`} />
                        {item}
                      </div>
                    ))}
                  </div>
                </aside>

                {/* Thread list */}
                <div className="ds-card p-4">
                  <div className="mb-3 flex items-center justify-between border-b border-app-border pb-3">
                    <div>
                      <p className="ds-eyebrow">Operator inbox</p>
                      <p className="mt-0.5 text-[0.92rem] font-semibold text-app-text">Conversations &amp; next actions</p>
                    </div>
                    <span className="rounded-full border border-teal-200 bg-app-accent-wash px-2.5 py-1 text-[0.68rem] font-semibold text-app-primary">Live</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { name: "Marta Bell", preview: "Requested the earliest hygiene slot this week.", state: "Booked", note: "Confirmed 1:15 PM" },
                      { name: "Jason Miller", preview: "Asked about financing before confirming treatment.", state: "Needs review", note: "Human review required" },
                      { name: "Missed callback recovery", preview: "Follow-up thread reopened after a missed patient call.", state: "Queued", note: "Needs reply today" },
                    ].map((item) => (
                      <div key={item.name} className="app-list-row px-3.5 py-2.5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-canvas text-app-primary">
                            <ContactRound className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-[0.82rem] font-semibold text-app-text">{item.name}</p>
                              {(() => {
                                const stateStyles: Record<string, string> = {
                                  Booked: "bg-emerald-50 text-emerald-700",
                                  "Needs review": "bg-blue-50 text-blue-700",
                                };
                                const cls = stateStyles[item.state] ?? "bg-amber-50 text-amber-700";
                                return <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${cls}`}>{item.state}</span>;
                              })()}
                            </div>
                            <p className="mt-0.5 text-[0.72rem] text-app-text-muted">{item.preview}</p>
                            <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-widest text-app-primary">{item.note}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats rail */}
                <div className="hidden space-y-3 lg:block">
                  <div className="ds-rail-panel p-3.5">
                    <p className="ds-eyebrow">Today</p>
                    <div className="mt-2.5 space-y-2 text-[0.78rem] text-app-text-muted">
                      <div className="app-card-muted px-2.5 py-2">
                        <p className="font-semibold text-app-text">6 open threads</p>
                        <p className="mt-0.5">2 need human review.</p>
                      </div>
                      <div className="app-card-muted px-2.5 py-2">
                        <p className="font-semibold text-app-text">4 appointments</p>
                        <p className="mt-0.5">Tied to the same patient flow.</p>
                      </div>
                    </div>
                  </div>
                  <div className="ds-rail-panel p-3.5">
                    <p className="ds-eyebrow">How it works</p>
                    <div className="mt-2.5 space-y-1.5">
                      {["Grounded in your clinic data", "Staff takeover built in", "Patients stay linked"].map((t) => (
                        <div key={t} className="flex items-center gap-1.5 text-[0.75rem] text-app-text-muted">
                          <Check className="h-3 w-3 shrink-0 text-app-primary" />
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </MarketingProductWindow>
        </div>
      </section>

      <main>
        {/* ═══ PILLARS — horizontal band ═══ */}
        <section className="marketing-section marketing-surface-elevated">
          <div className="marketing-container">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <div className="marketing-kicker mx-auto mb-5 w-fit">
                <LayoutGrid className="h-3 w-3" />
                More than a booking button
              </div>
              <h2 className="marketing-h2">A real operating system for the clinic front desk.</h2>
              <p className="marketing-lead mt-4">
                Clinic AI is not a widget that disappears after the first patient message. It is the full operating layer behind intake, follow-up, booking progress, reminder readiness, and staff control.
              </p>
            </div>
            <div className="marketing-feature-grid">
              {operatingPillars.map((pillar) => (
                <div key={pillar.title} className="marketing-card">
                  <div className="marketing-icon-wrap h-13 w-13">
                    <pillar.icon className="h-5 w-5" />
                  </div>
                  <h3 className="marketing-h3 mt-5">{pillar.title}</h3>
                  <p className="marketing-body mt-3">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ TRUST — asymmetric two-column with inset panel ═══ */}
        <section className="marketing-section marketing-surface-slate">
          <div className="marketing-container">
            <div className="grid items-start gap-12 xl:grid-cols-[1fr_1.2fr]">
              <div className="sticky top-8">
                <div className="marketing-kicker mb-5">
                  <ShieldCheck className="h-3 w-3" />
                  Trust and oversight
                </div>
                <h2 className="marketing-h2">Clinic-controlled, staff-visible, and honest by design.</h2>
                <div className="mt-6 space-y-4 text-[1rem] leading-relaxed text-slate-600">
                  <p>The assistant only uses the services, hours, FAQs, and notes you configure.</p>
                  <p>When it cannot answer confidently, it holds the reply instead of fabricating one.</p>
                  <p>Every conversation stays visible to your staff, with takeover and review built in.</p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {[
                  { icon: ShieldCheck, title: "Clinic-controlled knowledge", body: "Services, hours, FAQs, and assistant copy all stay under your control." },
                  { icon: TriangleAlert, title: "Uncertain replies are held", body: "The system pauses instead of guessing when it lacks the right information." },
                  { icon: ContactRound, title: "Manual takeover is always available", body: "Staff can step in, review, edit, or resolve threads directly from the inbox." },
                  { icon: LayoutGrid, title: "Workflow stays visible", body: "Every patient thread, lead, booking, and reminder remains traceable." },
                ].map((item) => (
                  <div key={item.title} className="marketing-showcase-card p-6">
                    <div className="marketing-icon-wrap h-11 w-11">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-[1.05rem] font-semibold tracking-[-0.02em] text-app-text">{item.title}</p>
                    <p className="mt-2.5 text-sm leading-relaxed text-app-text-muted">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ JOURNEY — numbered timeline strip ═══ */}
        <section id="after-signup" className="marketing-section marketing-surface-white border-y border-(--color-ds-frame-border-light)">
          <div className="marketing-container">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <div className="marketing-kicker mx-auto mb-5 w-fit">
                <Workflow className="h-3 w-3" />
                After signup
              </div>
              <h2 className="marketing-h2">The first week is about control, not setup theatre.</h2>
              <p className="marketing-lead mt-4">
                Sign up, configure real clinic information, test the assistant, then decide when to go live. The routes your team uses after launch are already there during the trial.
              </p>
            </div>
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-linear-to-b from-app-primary/20 via-app-primary/40 to-app-primary/20 xl:block" aria-hidden />
              <div className="grid gap-6 xl:grid-cols-4">
                {afterSignupJourney.map((item) => (
                  <div key={item.step} className="ds-card relative px-6 py-7">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-app-primary text-[0.82rem] font-bold text-white shadow-(--ds-shadow-lg)">
                      {item.step}
                    </div>
                    <h3 className="mt-5 text-[1.1rem] font-semibold tracking-[-0.03em] text-app-text">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-app-text-muted">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ PRICING — stacked comparison ═══ */}
        <section id="pricing" className="marketing-section marketing-surface-mist">
          <div className="marketing-container">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <div className="marketing-kicker mx-auto mb-5 w-fit">
                <Sparkles className="h-3 w-3" />
                Pricing
              </div>
              <h2 className="marketing-h2">Start with the real product, then choose the right operating tier.</h2>
              <p className="marketing-lead mt-4">
                Every plan starts with the same core workspace. The difference is request volume, SMS access, and the depth of operational features you need.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl gap-6 xl:grid-cols-3">
              {plans.map((plan) => {
                const isPaid = plan.id !== "trial";
                const isLoading = checkoutLoading === plan.id;
                return (
                  <article
                    key={plan.id}
                    className={`ds-card relative overflow-hidden px-7 py-8 ${plan.featured ? "ring-2 ring-app-primary/30" : ""}`}
                  >
                    {plan.badge ? (
                      <div className="absolute right-5 top-5">
                        <span className="rounded-full border border-teal-200 bg-app-accent-wash px-3 py-1 text-[0.7rem] font-bold uppercase tracking-widest text-app-primary">
                          {plan.badge}
                        </span>
                      </div>
                    ) : null}
                    <p className="text-[1.15rem] font-semibold tracking-[-0.03em] text-app-text">{plan.name}</p>
                    <p className="mt-2 text-sm leading-relaxed text-app-text-muted">{plan.description}</p>
                    <div className="mt-6 border-t border-app-border pt-6">
                      <span className="text-[2.8rem] font-bold tracking-[-0.06em] text-app-text">{plan.price}</span>
                      <span className="ml-1.5 text-sm font-semibold text-app-text-muted">{plan.period}</span>
                    </div>
                    <ul className="mt-7 space-y-3.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed text-app-text-secondary">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-wash text-app-primary">
                            <Check className="h-3 w-3" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-8">
                      {isPaid ? (
                        <button
                          type="button"
                          onClick={() => handlePaidPlanClick(plan.id as PaidPlanId)}
                          disabled={isLoading}
                          className={`app-btn w-full justify-center ${plan.featured ? "app-btn-primary" : "app-btn-secondary"} disabled:pointer-events-none disabled:opacity-60`}
                        >
                          {isLoading ? "Starting checkout…" : plan.cta}
                        </button>
                      ) : (
                        <Link href="/register" className="app-btn app-btn-secondary w-full justify-center">
                          {plan.cta}
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {checkoutError ? (
              <p className="mx-auto mt-6 max-w-xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
                {checkoutError}
              </p>
            ) : null}
          </div>
        </section>

        {/* ═══ FAQ — single-column accordion-style ═══ */}
        <section id="faq" className="marketing-section marketing-surface-white border-t border-(--color-ds-frame-border-light)">
          <div className="marketing-container">
            <div className="mx-auto max-w-3xl">
              <div className="mb-12 text-center">
                <div className="marketing-kicker mx-auto mb-5 w-fit">
                  <ShieldCheck className="h-3 w-3" />
                  FAQ
                </div>
                <h2 className="marketing-h2">Questions clinic owners ask before they trust the system.</h2>
              </div>
              <div className="space-y-4">
                {faqs.map((item) => (
                  <div key={item.question} className="ds-card px-7 py-6">
                    <h3 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-app-text">{item.question}</h3>
                    <p className="mt-3 text-[0.9375rem] leading-relaxed text-app-text-muted">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ FINAL CTA — immersive depth slab ═══ */}
        <section className="marketing-final-act">
          <div className="marketing-container">
            <div className="overflow-hidden rounded-2xl bg-[linear-gradient(160deg,#0f766e_0%,#0a4a53_50%,#0f766e_100%)] px-8 py-14 shadow-(--ds-shadow-xl) sm:px-14 sm:py-20">
              <div className="mx-auto max-w-3xl text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/25 bg-teal-900/30 px-4 py-1.5 text-[0.8125rem] font-semibold uppercase tracking-widest text-teal-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Built for real clinics
                </div>
                <h2 className="mt-8 text-[clamp(2rem,2.5vw+1rem,3.2rem)] font-bold tracking-[-0.05em] text-white text-balance">
                  Launch the assistant when your team is ready, not when a demo says so.
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-[1.05rem] leading-relaxed text-teal-50/85">
                  Start free, configure your actual clinic information, test the patient experience, and go live on your own timing.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-[0.96rem] font-semibold text-app-primary shadow-(--ds-shadow-lg) transition-colors hover:bg-teal-50"
                  >
                    Start free trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/chat/demo"
                    className="inline-flex items-center gap-2 rounded-xl border border-teal-300/30 bg-teal-900/20 px-8 py-4 text-[0.96rem] font-semibold text-white transition-colors hover:bg-teal-900/40"
                  >
                    <MessageSquareMore className="h-4 w-4" />
                    Try live demo
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
