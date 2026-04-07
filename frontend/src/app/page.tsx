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
  Search,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  Workflow,
} from "lucide-react";

import { startCheckoutForPlan, type PaidPlanId } from "@/lib/billing-checkout";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";

type LandingPlan = {
  id: "trial" | PaidPlanId;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  badge?: string;
};

const plans: LandingPlan[] = [
  {
    id: "trial",
    name: "Starter Trial",
    price: "$0",
    period: "14 days free",
    description:
      "Set up in under 15 minutes. The assistant uses your real clinic data — no credit card, no commitment.",
    features: [
      "AI chat assistant trained on your services and hours",
      "Inbox, leads, appointments, and operational dashboard",
      "25 captured patient requests included",
      "Guided onboarding with live assistant preview",
    ],
    cta: "Start free trial",
    highlighted: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$49",
    period: "/month",
    description:
      "Everything a front desk needs: SMS, human review, appointment tracking, and a single workspace for daily operations.",
    features: [
      "Everything in Starter Trial",
      "200 patient requests per month",
      "Two-way SMS inbox with human review controls",
      "Appointments workspace with reminder readiness",
      "Google Sheets and Excel export for records",
    ],
    cta: "Choose Professional",
    highlighted: true,
    badge: "Most popular",
  },
  {
    id: "premium",
    name: "Premium",
    price: "$99",
    period: "/month",
    description:
      "Unlimited capacity for higher-volume clinics. Deposit tracking, custom branding, and full team visibility.",
    features: [
      "Everything in Professional",
      "Unlimited patient requests",
      "Deposit requests and payment tracking",
      "Priority support with faster response times",
      "Custom branding and advanced operations visibility",
    ],
    cta: "Choose Premium",
    highlighted: false,
  },
];

const featureCards = [
  {
    icon: MessageSquareMore,
    title: "Answers patients using your real clinic info",
    description:
      "Every response is grounded in the services, hours, and FAQs you configure. Nothing is assumed, borrowed, or generated from generic templates.",
  },
  {
    icon: Inbox,
    title: "One inbox for web chat, SMS, and staff notes",
    description:
      "Every patient thread — web chat, SMS, manual takeover notes, and booking actions — in one place. No context-switching between tools.",
  },
  {
    icon: Workflow,
    title: "Surfaces follow-up risk before it slips",
    description:
      "Stalled requests, missed-call recovery, and booking gaps stay visible so your team can act before patients move on.",
  },
  {
    icon: CalendarDays,
    title: "Ties every request to a booking",
    description:
      "Appointment timing, reminder readiness, deposit status, and staff notes stay linked to the original conversation from start to finish.",
  },
];

const trustCards = [
  {
    icon: ShieldCheck,
    title: "Your clinic controls the information",
    description:
      "The assistant only uses what you configure. It never invents details, pulls from other clinics, or assumes anything outside your setup.",
  },
  {
    icon: ContactRound,
    title: "Staff can take over at any point",
    description:
      "Every conversation is visible. Staff can review, edit AI drafts, or take over entirely. Uncertain threads are flagged automatically.",
  },
  {
    icon: BrainCircuit,
    title: "Holds the reply when uncertain",
    description:
      "When the assistant lacks confidence, it pauses and flags the thread for human review instead of generating a risky guess.",
  },
  {
    icon: LayoutGrid,
    title: "Full visibility — nothing is hidden",
    description:
      "Every conversation, request, appointment, and follow-up action is traceable. You always know what was said and why.",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Patient reaches out",
    description:
      "A patient opens chat or sends an SMS asking about services, availability, or booking. The request lands in your workspace immediately.",
  },
  {
    step: "02",
    title: "Assistant responds",
    description:
      "Clinic AI answers using your real clinic setup — services, hours, FAQs — and collects the details your team needs to follow through.",
  },
  {
    step: "03",
    title: "Staff reviews when needed",
    description:
      "Sensitive or lower-confidence threads are flagged for human review. Staff can step in, edit, or take over from the same workspace.",
  },
  {
    step: "04",
    title: "Request moves to booking",
    description:
      "The inquiry becomes booked, followed up, reminded, or handled — all tracked from first message to confirmed appointment.",
  },
];

const clinicTypes = [
  {
    type: "Dental clinics",
    description:
      "Handle appointment requests, cleaning questions, and front-desk workload without relying solely on phones or fragmented inboxes.",
  },
  {
    type: "Private practices",
    description:
      "Stay responsive to patient inquiries around the clock — without overloading staff or missing requests during busy hours.",
  },
  {
    type: "Med spas",
    description:
      "Manage higher inquiry volume with stronger review visibility, intake capture, and appointment follow-through.",
  },
  {
    type: "Healthcare offices",
    description:
      "Give staff a calmer workflow for triage, callbacks, follow-up reminders, and booked request handling.",
  },
];

const faqs = [
  {
    question: "How long does setup take?",
    answer:
      "Most clinics finish in under 15 minutes. Enter your clinic details, add services and FAQs, and test the assistant with a live preview before going live.",
  },
  {
    question: "Can staff review and override the assistant?",
    answer:
      "Yes. Every conversation is visible in the inbox. Staff can review any thread, edit suggested replies, take over a conversation, or pause AI replies entirely.",
  },
  {
    question: "What does the assistant do when it does not know the answer?",
    answer:
      "It holds the reply and flags the thread for staff review. The system never generates a confident guess when it lacks the information.",
  },
  {
    question: "Do patients know they are talking to an assistant?",
    answer:
      "You decide. You control the assistant name, greeting, and how handoff to a real person is presented. Transparent communication is the default.",
  },
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
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC]">
      <PublicNav />

      {/* ── HERO ── */}
      <section className="border-b border-[#E2E8F0] bg-[#FFFFFF] px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-[1280px]">
          <div className="landing-hero-grid">
            {/* Copy */}
            <div className="min-w-0">
              <div className="marketing-kicker mb-6">
                <Sparkles className="h-3 w-3" />
                AI front-desk operating system
              </div>
              <h1 className="marketing-h1">
                Your clinic&apos;s AI front desk.
              </h1>
              <p className="marketing-lead mt-6 max-w-2xl">
                Clinic AI answers inbound patient questions, captures appointment requests,
                and gives your team a single operating view — with human review and
                takeover built in at every step.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#115E59]"
                >
                  Start free — 14 days
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/chat/demo"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-6 py-3.5 text-sm font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-[#F8FAFC]"
                >
                  <MessageSquareMore className="h-4 w-4 text-[#0F766E]" />
                  Try live demo
                </Link>
              </div>
              <p className="mt-4 text-xs text-[#94A3B8]">
                No credit card required &middot; Set up in under 15 minutes &middot; Your staff stays in control
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {[
                  "Responds 24/7",
                  "Staff review & takeover",
                  "Grounded in your clinic info",
                  "One inbox for all channels",
                ].map((feat) => (
                  <span
                    key={feat}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#475569]"
                  >
                    <Check className="h-3.5 w-3.5 text-[#0F766E]" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Workspace preview */}
            <div className="relative hidden xl:block">
              <div className="landing-shell relative overflow-hidden p-4 sm:p-5">
                <div className="grid gap-3 xl:grid-cols-[11rem_1fr_13rem]">
                  {/* Sidebar */}
                  <aside className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                    <div className="mb-4 flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-[#0F766E] shadow-sm">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#0F172A]">Clinic AI</p>
                        <p className="text-[10px] text-[#64748B]">Workspace</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {["Dashboard", "Conversations", "Appointments", "Patients", "AI Training"].map(
                        (item, i) => (
                          <div
                            key={item}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
                              i === 1
                                ? "border border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A] shadow-sm"
                                : "text-[#475569]"
                            }`}
                          >
                            <div
                              className={`h-1.5 w-1.5 rounded-full ${
                                i === 1 ? "bg-[#0F766E]" : "bg-[#CBD5E1]"
                              }`}
                            />
                            {item}
                          </div>
                        )
                      )}
                    </div>
                  </aside>

                  {/* Main panel */}
                  <div className="app-card p-4">
                    <div className="workspace-toolbar border-b border-[#E2E8F0] pb-3">
                      <div className="workspace-search min-w-0 flex-1 text-xs">
                        <Search className="h-3.5 w-3.5" />
                        <span className="truncate">Search conversations or patients</span>
                      </div>
                      <div className="app-pill border-[#99f6e4] bg-[#CCFBF1] text-[#115E59]">
                        Appointments
                      </div>
                    </div>
                    <div className="mt-4 space-y-2.5">
                      {[
                        { name: "Marta B.", note: "Follow-up on earliest slot", state: "Confirmed", tone: "bg-emerald-50 text-emerald-700" },
                        { name: "New cleaning", note: "Pending staff confirmation", state: "Needs review", tone: "bg-blue-50 text-blue-700" },
                        { name: "Missed callback", note: "Recovery queue item", state: "Queued", tone: "bg-amber-50 text-amber-700" },
                      ].map((item, i) => (
                        <div
                          key={item.name}
                          className={`app-list-row flex items-center gap-3 px-3 py-2.5 ${
                            i === 0 ? "border border-[#99f6e4] bg-[#FFFFFF] shadow-sm" : ""
                          }`}
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                            <Users className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-xs font-semibold text-slate-900">{item.name}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.tone}`}>
                                {item.state}
                              </span>
                            </div>
                            <p className="truncate text-[11px] text-slate-500">{item.note}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rail */}
                  <div className="space-y-3">
                    <div className="workspace-rail-card p-4">
                      <p className="workspace-section-label">Today</p>
                      <h3 className="mt-2.5 text-sm font-semibold text-slate-900">Marta is booked</h3>
                      <p className="mt-1 text-xs leading-5 text-slate-500">From inquiry to confirmed appointment.</p>
                      <div className="mt-3 space-y-2">
                        {["Earliest slot confirmed", "Reminder set", "Deposit visible"].map((item) => (
                          <div key={item} className="flex items-center gap-2 text-xs text-slate-600">
                            <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="workspace-rail-card p-4">
                      <p className="workspace-section-label">Operator view</p>
                      <div className="mt-3 space-y-2">
                        <div className="app-card-muted px-3 py-2.5">
                          <p className="text-[10px] text-slate-500">Staff takeover</p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-900">Available anytime</p>
                        </div>
                        <div className="app-card-muted px-3 py-2.5">
                          <p className="text-[10px] text-slate-500">AI training</p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-900">Grounded in clinic data</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1280px]">

          {/* ── HOW IT WORKS ── */}
          <section className="marketing-section border-b border-[#E2E8F0]">
            <div className="mb-12 max-w-2xl">
              <div className="marketing-kicker mb-5">
                <Workflow className="h-3 w-3" />
                How it works
              </div>
              <h2 className="marketing-h2">
                From first message to booked appointment.
              </h2>
              <p className="marketing-lead mt-4">
                Clinic AI handles the full front-desk loop — answering patients,
                capturing requests, surfacing follow-up — so nothing slips between the cracks.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {howItWorks.map((step) => (
                <div key={step.step} className="marketing-card p-6">
                  <span className="text-3xl font-bold text-[#E2E8F0]">{step.step}</span>
                  <h3 className="mt-4 text-base font-semibold text-[#0F172A]">{step.title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-[#475569]">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── WHAT YOU GET ── */}
          <section id="product" className="marketing-section border-b border-[#E2E8F0]">
            <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <div className="marketing-kicker mb-5">
                  <LayoutGrid className="h-3 w-3" />
                  What you get
                </div>
                <h2 className="marketing-h2">
                  Not just a chatbot. A complete front-desk workspace.
                </h2>
                <p className="marketing-lead mt-4">
                  Built for real clinic operations: answering patient questions, capturing requests,
                  keeping one inbox, surfacing follow-up risk.
                </p>
              </div>
              <Link
                href="/product"
                className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F766E] hover:text-[#115E59]"
              >
                See full product overview
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="marketing-feature-grid">
              {featureCards.map((card) => (
                <div key={card.title} className="marketing-card p-6">
                  <div className="marketing-icon-wrap">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-[#0F172A]">{card.title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-[#475569]">{card.description}</p>
                </div>
              ))}
            </div>

            {/* Platform modules */}
            <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_1fr]">
              <div className="landing-shell p-6 sm:p-8">
                <div className="app-page-kicker mb-5">
                  <Bot className="h-3.5 w-3.5" />
                  Platform modules
                </div>
                <h3 className="text-base font-semibold text-[#0F172A]">
                  One product system from inquiry to booked appointment.
                </h3>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    { icon: Inbox, name: "Operator inbox", desc: "Every patient thread, AI-handled and staff-reviewed, in one place." },
                    { icon: CalendarDays, name: "Appointments workspace", desc: "Track bookings, reminders, reschedules, and deposit status." },
                    { icon: BrainCircuit, name: "AI training", desc: "Keep your assistant accurate with services, FAQs, and internal notes." },
                    { icon: TriangleAlert, name: "Follow-up visibility", desc: "Stalled requests and booking gaps surface before they fall through." },
                  ].map((mod) => (
                    <div key={mod.name} className="app-card-muted p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#CCFBF1] text-[#115E59]">
                        <mod.icon className="h-4 w-4" />
                      </div>
                      <h4 className="mt-3 text-sm font-semibold text-[#0F172A]">{mod.name}</h4>
                      <p className="mt-1.5 text-sm leading-5 text-[#475569]">{mod.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
                {clinicTypes.map((item) => (
                  <div key={item.type} className="app-card p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">Who it&apos;s for</p>
                    <h3 className="mt-3 text-base font-semibold text-[#0F172A]">{item.type}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#475569]">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── TRUST ── */}
          <section id="trust" className="marketing-section border-b border-[#E2E8F0]">
            <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <div className="marketing-kicker mb-5">
                  <ShieldCheck className="h-3 w-3" />
                  Trust &amp; oversight
                </div>
                <h2 className="marketing-h2">
                  Built to stay careful, visible, and clinic-controlled.
                </h2>
                <p className="marketing-lead mt-4">
                  Clinic AI is designed for real clinic work. The assistant stays honest about
                  what it can handle, keeps staff in control of every decision, and makes every
                  patient interaction traceable.
                </p>
              </div>
              <Link
                href="/trust"
                className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F766E] hover:text-[#115E59]"
              >
                Read our trust approach
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {trustCards.map((item) => (
                <div key={item.title} className="marketing-card p-6">
                  <div className="marketing-icon-wrap">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold text-[#0F172A]">{item.title}</h3>
                  <p className="mt-2.5 text-sm leading-6 text-[#475569]">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── PRICING ── */}
          <section id="pricing" className="marketing-section border-b border-[#E2E8F0]">
            <div className="mb-12 text-center">
              <div className="marketing-kicker mx-auto mb-5">
                <Sparkles className="h-3 w-3" />
                Pricing
              </div>
              <h2 className="marketing-h2">
                Honest pricing. No per-message fees.
              </h2>
              <p className="marketing-lead mt-4 mx-auto max-w-xl">
                Pick the plan that matches your patient volume. Start free, upgrade when ready, cancel anytime.
              </p>
            </div>

            {checkoutError ? (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#DC2626]">
                {checkoutError}
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-2xl border p-7 ${
                    plan.highlighted
                      ? "border-[#0F766E] bg-[#FFFFFF] shadow-lg shadow-teal-900/5"
                      : "border-[#E2E8F0] bg-[#FFFFFF] shadow-sm"
                  }`}
                >
                  {plan.badge ? (
                    <div className="mb-5 inline-flex rounded-full border border-[#99f6e4] bg-[#CCFBF1] px-3 py-1 text-xs font-semibold text-[#115E59]">
                      {plan.badge}
                    </div>
                  ) : null}
                  <h3 className="text-sm font-semibold text-[#0F172A]">{plan.name}</h3>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-3xl font-bold text-[#0F172A]">{plan.price}</span>
                    <span className="pb-1 text-sm font-medium text-[#64748B]">{plan.period}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#475569]">{plan.description}</p>
                  <div className="mt-6 space-y-3">
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
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
                          plan.highlighted
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
              Questions about plans?{" "}
              <Link href="/pricing" className="font-semibold text-[#0F766E] hover:text-[#115E59]">
                See full pricing details
              </Link>{" "}
              or{" "}
              <Link href="/contact" className="font-semibold text-[#0F766E] hover:text-[#115E59]">
                talk to us
              </Link>
              .
            </p>
          </section>

          {/* ── FAQ TEASER ── */}
          <section id="faq" className="marketing-section border-b border-[#E2E8F0]">
            <div className="grid gap-8 xl:grid-cols-[1fr_1.4fr]">
              <div>
                <div className="marketing-kicker mb-5">
                  <ShieldCheck className="h-3 w-3" />
                  Common questions
                </div>
                <h2 className="marketing-h2">
                  Straightforward answers.
                </h2>
                <p className="marketing-lead mt-4">
                  Clinic AI is not a replacement for clinical judgment. It is a reliable operating layer for patient communication, booking, and front-desk follow-up.
                </p>
                <Link
                  href="/faq"
                  className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F766E] hover:text-[#115E59]"
                >
                  See all questions
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-4">
                {faqs.map((item) => (
                  <div key={item.question} className="marketing-card p-6">
                    <h3 className="text-sm font-semibold text-[#0F172A]">{item.question}</h3>
                    <p className="mt-2.5 text-sm leading-6 text-[#475569]">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FINAL CTA ── */}
          <section className="marketing-section">
            <div className="overflow-hidden rounded-2xl bg-[#0F766E] px-8 py-12 sm:px-12 sm:py-16">
              <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-teal-700/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-teal-100">
                    <Sparkles className="h-3 w-3" />
                    Get started today
                  </div>
                  <h2 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    See the difference in your first week.
                  </h2>
                  <p className="mt-4 max-w-xl text-base leading-7 text-teal-100">
                    Configure the assistant with your real clinic information, let your team work from one workspace, and see what a complete front-desk operating system feels like.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row xl:flex-col xl:items-start">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-[#0F766E] shadow-sm transition-colors hover:bg-[#F0FDF9]"
                  >
                    Start free trial
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/chat/demo"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-400/40 bg-teal-700/30 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700/50"
                  >
                    Try the live demo
                  </Link>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
