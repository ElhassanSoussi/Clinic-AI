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

      <section className="marketing-hero marketing-hero-wave marketing-hero-premium marketing-surface-white border-b border-slate-200/90">
        <div className="marketing-container">
          <div className="landing-shell overflow-hidden px-5 py-6 sm:px-7 sm:py-8 lg:px-9 lg:py-9">
            <div className="grid gap-10 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] xl:gap-14">
              <div className="min-w-0">
                <div className="marketing-kicker mb-6">
                  <Sparkles className="h-3 w-3" />
                  AI front-desk operating system
                </div>
                <h1 className="marketing-h1 max-w-3xl">
                  The front desk your clinic wishes it had after hours.
                </h1>
                <p className="marketing-lead mt-6 max-w-2xl">
                  Clinic AI answers patients, captures booking requests, and keeps staff working from one premium workspace for inbox, leads, appointments, training, billing, and go-live control.
                </p>

                <div className="mt-9 flex flex-wrap gap-3">
                  <Link href="/register" className="marketing-cta-primary !rounded-full !px-6 !py-3.5">
                    Start free trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/chat/demo" className="marketing-cta-secondary !rounded-full !px-6 !py-3.5">
                    <MessageSquareMore className="h-4 w-4 text-[#0F766E]" />
                    Try live demo
                  </Link>
                </div>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  {systemPoints.map((item) => (
                    <span key={item} className="marketing-trust-chip">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0F766E]" />
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {operatingPillars.map((pillar) => (
                    <div key={pillar.title} className="marketing-showcase-card p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ecfdfa] text-[#0F766E] shadow-[0_18px_34px_-24px_rgba(15,118,110,0.55)]">
                        <pillar.icon className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-[1rem] font-semibold tracking-[-0.02em] text-[#0F172A]">
                        {pillar.title}
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-[#5D6B7C]">
                        {pillar.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <MarketingProductWindow
                pathLabel="/dashboard/inbox"
                caption="Illustrative composition of the real signed-in routes: Dashboard, Inbox, Leads, Appointments, Training, Billing, and Settings."
              >
                <div className="marketing-hero-preview p-6 sm:p-7 lg:p-8">
                  <div className="grid gap-4 xl:grid-cols-[12rem_1fr_14rem]">
                    <aside className="rounded-[1.55rem] border border-white/80 bg-[linear-gradient(180deg,#f6fbfb_0%,#edf7f7_100%)] p-4 shadow-[0_24px_44px_-30px_rgba(15,23,42,0.22)]">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#14b8a6_0%,#0f766e_100%)] text-white shadow-[0_18px_30px_-20px_rgba(15,118,110,0.68)]">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[0.82rem] font-semibold text-[#0F172A]">Clinic AI</p>
                          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
                            Workspace
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {previewNav.map((item) => (
                          <div
                            key={item}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[0.8rem] font-semibold ${
                              item === "Inbox"
                                ? "border border-white bg-white text-[#0F766E] shadow-[0_20px_32px_-24px_rgba(15,118,110,0.45)]"
                                : "text-[#526274]"
                            }`}
                          >
                            <div className={`h-2.5 w-2.5 rounded-full ${item === "Inbox" ? "bg-[#14b8a6]" : "bg-[#CBD5E1]"}`} />
                            {item}
                          </div>
                        ))}
                      </div>
                    </aside>

                    <div className="rounded-[1.75rem] border border-white/85 bg-white/95 p-5 shadow-[0_34px_60px_-36px_rgba(12,18,32,0.34)]">
                      <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                        <div>
                          <p className="text-[0.76rem] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                            Operator inbox
                          </p>
                          <p className="mt-1 text-[1.05rem] font-semibold text-[#0F172A]">
                            Conversations, bookings, and next actions
                          </p>
                        </div>
                        <span className="rounded-full border border-[#99f6e4] bg-[#ecfdfa] px-3 py-1.5 text-[0.72rem] font-semibold text-[#0F766E]">
                          Live queue
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {[
                          {
                            name: "Marta Bell",
                            preview: "Requested the earliest hygiene slot this week.",
                            state: "Booked",
                            note: "Confirmed 1:15 PM",
                          },
                          {
                            name: "Jason Miller",
                            preview: "Asked about financing before confirming treatment.",
                            state: "Needs review",
                            note: "Human review required",
                          },
                          {
                            name: "Missed callback recovery",
                            preview: "Follow-up thread reopened after a missed patient call.",
                            state: "Queued",
                            note: "Needs reply today",
                          },
                        ].map((item) => (
                          <div key={item.name} className="rounded-2xl border border-[#E2E8F0] bg-[#FBFCFE] px-4 py-3">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F1F5F9] text-[#0F766E]">
                                <ContactRound className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-[0.87rem] font-semibold text-[#0F172A]">{item.name}</p>
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold ${
                                      item.state === "Booked"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : item.state === "Needs review"
                                          ? "bg-blue-50 text-blue-700"
                                          : "bg-amber-50 text-amber-700"
                                    }`}
                                  >
                                    {item.state}
                                  </span>
                                </div>
                                <p className="mt-1 text-[0.76rem] text-[#526274]">{item.preview}</p>
                                <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-[#0F766E]">
                                  {item.note}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="workspace-rail-card p-4 shadow-sm">
                        <p className="workspace-section-label">Today</p>
                        <h3 className="mt-3 text-[1rem] font-semibold tracking-[-0.02em] text-slate-900">
                          Pressure, throughput, and next action
                        </h3>
                        <div className="mt-3 space-y-2.5 text-[0.82rem] text-slate-600">
                          <div className="app-card-muted px-3 py-2.5">
                            <p className="font-semibold text-slate-900">6 open threads</p>
                            <p className="mt-1">2 require human review before sending.</p>
                          </div>
                          <div className="app-card-muted px-3 py-2.5">
                            <p className="font-semibold text-slate-900">4 appointments in motion</p>
                            <p className="mt-1">Reminders and deposits remain tied to the same patient flow.</p>
                          </div>
                        </div>
                      </div>
                      <div className="workspace-rail-card p-4 shadow-sm">
                        <p className="workspace-section-label">Why it lands</p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-[0.82rem] text-slate-600">
                            <Check className="h-4 w-4 shrink-0 text-teal-600" />
                            AI answers using your clinic setup only
                          </div>
                          <div className="flex items-center gap-2 text-[0.82rem] text-slate-600">
                            <Check className="h-4 w-4 shrink-0 text-teal-600" />
                            Staff can review or take over at any moment
                          </div>
                          <div className="flex items-center gap-2 text-[0.82rem] text-slate-600">
                            <Check className="h-4 w-4 shrink-0 text-teal-600" />
                            Patients stay tied to the booking workflow
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </MarketingProductWindow>
            </div>
          </div>
        </div>
      </section>

      <main>
        <section className="marketing-section marketing-surface-warm">
          <div className="marketing-container">
            <div className="mb-12 max-w-3xl">
              <div className="marketing-kicker mb-5">
                <LayoutGrid className="h-3 w-3" />
                More than a booking button
              </div>
              <h2 className="marketing-h2">A real operating system for the clinic front desk.</h2>
              <p className="marketing-lead mt-4">
                Clinic AI is not a widget that disappears after the first patient message. It is the full operating layer behind intake, follow-up, booking progress, reminder readiness, and staff control.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
              {operatingPillars.map((pillar) => (
                <div key={pillar.title} className="marketing-card">
                  <div className="marketing-icon-wrap h-12 w-12">
                    <pillar.icon className="h-5 w-5" />
                  </div>
                  <h3 className="marketing-h3 mt-5">{pillar.title}</h3>
                  <p className="marketing-body mt-3">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-section marketing-surface-slate">
          <div className="marketing-container">
            <div className="grid gap-8 xl:grid-cols-[0.88fr_1.12fr] xl:items-center">
              <div>
                <div className="marketing-kicker mb-5">
                  <ShieldCheck className="h-3 w-3" />
                  Trust and oversight
                </div>
                <h2 className="marketing-h2">Clinic-controlled, staff-visible, and honest by design.</h2>
                <div className="mt-5 space-y-4 text-[1rem] leading-relaxed text-slate-600">
                  <p>The assistant only uses the services, hours, FAQs, and notes you configure.</p>
                  <p>When it cannot answer confidently, it holds the reply instead of fabricating one.</p>
                  <p>Every conversation stays visible to your staff, with takeover and review built in.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: ShieldCheck,
                    title: "Clinic-controlled knowledge",
                    body: "Services, hours, FAQs, and assistant copy all stay under your control.",
                  },
                  {
                    icon: TriangleAlert,
                    title: "Uncertain replies are held",
                    body: "The system pauses instead of guessing when it lacks the right information.",
                  },
                  {
                    icon: ContactRound,
                    title: "Manual takeover is always available",
                    body: "Staff can step in, review, edit, or resolve threads directly from the inbox.",
                  },
                  {
                    icon: LayoutGrid,
                    title: "Workflow stays visible",
                    body: "Every patient thread, lead, booking, and reminder remains traceable.",
                  },
                ].map((item) => (
                  <div key={item.title} className="marketing-showcase-card p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ecfdfa] text-[#0F766E]">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-[1rem] font-semibold text-[#0F172A]">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-[#5D6B7C]">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="after-signup" className="marketing-section marketing-surface-white border-y border-slate-200/80">
          <div className="marketing-container">
            <div className="mb-12 max-w-3xl">
              <div className="marketing-kicker mb-5">
                <Workflow className="h-3 w-3" />
                After signup
              </div>
              <h2 className="marketing-h2">The first week is about control, not setup theatre.</h2>
              <p className="marketing-lead mt-4">
                Sign up, configure real clinic information, test the assistant, then decide when to go live. The routes your team uses after launch are already there during the trial.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
              {afterSignupJourney.map((item) => (
                <div key={item.step} className="rounded-[1.65rem] border border-slate-200/85 bg-white px-6 py-7 shadow-[0_20px_40px_-30px_rgba(12,18,32,0.22)]">
                  <span className="text-[0.78rem] font-bold uppercase tracking-[0.14em] text-[#0F766E]">
                    {item.step}
                  </span>
                  <h3 className="mt-4 text-[1.15rem] font-semibold tracking-[-0.03em] text-[#0F172A]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="marketing-section marketing-surface-mist">
          <div className="marketing-container">
            <div className="mb-12 max-w-3xl">
              <div className="marketing-kicker mb-5">
                <Sparkles className="h-3 w-3" />
                Pricing
              </div>
              <h2 className="marketing-h2">Start with the real product, then choose the right operating tier.</h2>
              <p className="marketing-lead mt-4">
                Every plan starts with the same core workspace. The difference is request volume, SMS access, and the depth of operational features you need.
              </p>
            </div>
            <div className="grid gap-6 xl:grid-cols-3">
              {plans.map((plan) => {
                const isPaid = plan.id !== "trial";
                const loading = checkoutLoading === plan.id;
                return (
                  <article
                    key={plan.id}
                    className={`rounded-[1.9rem] border p-7 shadow-[0_28px_56px_-36px_rgba(12,18,32,0.26)] ${
                      plan.featured
                        ? "border-[#99f6e4] bg-[linear-gradient(180deg,#ffffff_0%,#f2fffb_100%)]"
                        : "border-slate-200/90 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[1.15rem] font-semibold tracking-[-0.03em] text-[#0F172A]">{plan.name}</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{plan.description}</p>
                      </div>
                      {plan.badge ? (
                        <span className="rounded-full border border-[#99f6e4] bg-[#ecfdfa] px-3 py-1.5 text-[0.72rem] font-semibold text-[#0F766E]">
                          {plan.badge}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-6">
                      <span className="text-[2.65rem] font-bold tracking-[-0.06em] text-[#0F172A]">{plan.price}</span>
                      <span className="ml-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                        {plan.period}
                      </span>
                    </div>
                    <ul className="mt-6 space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ecfdfa] text-[#0F766E]">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-7">
                      {isPaid ? (
                        <button
                          type="button"
                          onClick={() => handlePaidPlanClick(plan.id as PaidPlanId)}
                          disabled={loading}
                          className="marketing-cta-primary !w-full !justify-center !rounded-full disabled:pointer-events-none disabled:opacity-60"
                        >
                          {loading ? "Starting checkout…" : plan.cta}
                        </button>
                      ) : (
                        <Link href="/register" className="marketing-cta-primary !w-full !justify-center !rounded-full">
                          {plan.cta}
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            {checkoutError ? (
              <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {checkoutError}
              </p>
            ) : null}
          </div>
        </section>

        <section id="faq" className="marketing-section marketing-surface-white border-t border-slate-200/85">
          <div className="marketing-container">
            <div className="mb-12 max-w-3xl">
              <div className="marketing-kicker mb-5">
                <ShieldCheck className="h-3 w-3" />
                FAQ
              </div>
              <h2 className="marketing-h2">Questions clinic owners ask before they trust the system.</h2>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {faqs.map((item) => (
                <div key={item.question} className="rounded-[1.7rem] border border-slate-200/85 bg-white px-6 py-6 shadow-[0_18px_38px_-28px_rgba(12,18,32,0.2)]">
                  <h3 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-[#0F172A]">{item.question}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-final-act">
          <div className="marketing-container">
            <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0f766e_0%,#0b4f59_100%)] px-8 py-12 shadow-[0_34px_72px_-36px_rgba(15,118,110,0.55)] sm:px-12 sm:py-16">
              <div className="grid gap-10 xl:grid-cols-[1fr_auto] xl:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-900/25 px-4 py-1.5 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-teal-50">
                    <Sparkles className="h-3.5 w-3.5" />
                    Built for real clinics
                  </div>
                  <h2 className="mt-6 text-[clamp(1.95rem,2vw+1rem,3rem)] font-bold tracking-[-0.05em] text-white">
                    Launch the assistant when your team is ready, not when a demo says so.
                  </h2>
                  <p className="mt-4 max-w-2xl text-[1.05rem] leading-relaxed text-teal-50/88">
                    Start free, configure your actual clinic information, test the patient experience, and go live on your own timing.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-[0.96rem] font-semibold text-[#0F766E] shadow-lg transition-colors hover:bg-teal-50"
                  >
                    Start free trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/chat/demo"
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-teal-300/40 bg-teal-900/20 px-7 py-3.5 text-[0.96rem] font-semibold text-white transition-colors hover:bg-teal-900/30"
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
