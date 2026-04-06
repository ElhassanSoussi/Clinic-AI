"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  BriefcaseMedical,
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
    period: "for 14 days",
    description: "Set up in under 15 minutes. The assistant uses your real clinic data — no credit card, no commitment.",
    features: [
      "AI chat assistant trained on your services and hours",
      "Inbox, leads, customers, and operational dashboard",
      "25 captured patient requests included",
      "Guided onboarding with live assistant preview",
    ],
    cta: "Start free",
    highlighted: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$49",
    period: "/month",
    description: "Everything a front desk needs: SMS, human review, appointment tracking, and a single workspace for daily operations.",
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
    description: "Unlimited capacity for higher-volume clinics. Deposit tracking, custom branding, and full team visibility included.",
    features: [
      "Everything in Professional",
      "Unlimited patient requests — no caps",
      "Deposit requests and payment tracking",
      "Priority support with faster response times",
      "Custom branding and advanced operations visibility",
    ],
    cta: "Choose Premium",
    highlighted: false,
  },
];

const valuePoints = [
  {
    icon: MessageSquareMore,
    title: "Answers patients using your real clinic info",
    description: "Responses are grounded in the services, hours, and FAQs you configure. Nothing is assumed, borrowed, or generated from generic templates.",
  },
  {
    icon: Inbox,
    title: "One inbox for web chat, SMS, and staff notes",
    description: "Every patient thread — web chat, SMS, manual takeover notes, and booking actions — lives in one place. No switching between tools.",
  },
  {
    icon: Workflow,
    title: "Surfaces follow-up risk before it slips",
    description: "Stalled requests, missed-call recovery, and booking gaps stay visible so your team can act before patients move on to another clinic.",
  },
  {
    icon: CalendarDays,
    title: "Ties every request to a booked appointment",
    description: "Appointment timing, reminder readiness, deposit status, and staff notes stay linked to the original conversation throughout.",
  },
];

const trustCards = [
  {
    icon: ShieldCheck,
    title: "Your clinic controls the information",
    description: "The assistant only uses the services, FAQs, hours, and notes you configure. It never invents details, pulls from other clinics, or assumes anything.",
  },
  {
    icon: ContactRound,
    title: "Staff can take over at any point",
    description: "Every conversation is visible. Staff can review, edit AI drafts, or take over entirely. Lower-confidence threads are flagged automatically.",
  },
  {
    icon: BrainCircuit,
    title: "Holds the reply when uncertain",
    description: "When the assistant is not confident about an answer, it pauses and flags the thread for human review instead of guessing.",
  },
  {
    icon: LayoutGrid,
    title: "Full visibility — nothing is hidden",
    description: "Every conversation, request, appointment, and follow-up is traceable in the workspace. You always know what the assistant said and why.",
  },
];

const productModules = [
  {
    icon: Inbox,
    title: "Operator inbox",
    description: "See every patient thread, review AI-handled conversations, approve or edit drafts, and take over when needed.",
  },
  {
    icon: CalendarDays,
    title: "Appointments workspace",
    description: "Track booked requests, reminder readiness, reschedules, cancellations, and deposit status from one board.",
  },
  {
    icon: BrainCircuit,
    title: "AI training",
    description: "Keep your assistant accurate by updating services, FAQs, internal notes, and clinic context as things change.",
  },
  {
    icon: TriangleAlert,
    title: "Follow-up visibility",
    description: "Stalled requests, missed callbacks, and blocked patient journeys surface automatically so nothing falls through.",
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
      "It holds the reply and flags the thread for staff review. The system never generates a confident guess when it lacks information.",
  },
  {
    question: "Do patients know they are talking to an assistant?",
    answer:
      "You decide. You control the assistant name, greeting, and how handoff to a real person is presented. Transparent communication is the default.",
  },
  {
    question: "Is my clinic data shared or used to train other models?",
    answer:
      "No. Your clinic information is only used to generate responses for your patients. It is never shared with other clinics or used to train shared models.",
  },
  {
    question: "What happens when my trial ends?",
    answer:
      "Your workspace and data remain intact. You can upgrade to a paid plan at any time to continue operations, or export your data.",
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
    <div className="min-h-screen overflow-x-hidden">
      <nav className="sticky top-0 z-40 border-b border-white/70 bg-white/82 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 shadow-sm shadow-teal-500/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-950">Clinic AI</p>
              <p className="text-xs text-slate-500">AI front-desk operating system</p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            <a href="#product" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-white hover:text-slate-900">
              Product
            </a>
            <a href="#trust" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-white hover:text-slate-900">
              Trust
            </a>
            <a href="#pricing" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-white hover:text-slate-900">
              Pricing
            </a>
            <a href="#faq" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-white hover:text-slate-900">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-white hover:text-slate-950">
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-500/20 transition-colors hover:bg-teal-700"
            >
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="px-5 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-14">
        <div className="mx-auto max-w-7xl space-y-8">
          <section className="landing-shell px-6 py-7 sm:px-8 lg:px-10 lg:py-10">
            <div className="landing-grid">
              <div className="min-w-0">
                <div className="app-page-kicker mb-6">
                  <Sparkles className="h-3.5 w-3.5" />
                  Designed for modern clinics, private practices, and med spas
                </div>
                <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-[4.35rem]">
                  One calm workspace for your entire front desk.
                </h1>
                <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                  Clinic AI answers patient questions, captures appointment requests around the clock,
                  and gives your team a single operating view from first inquiry to confirmed booking &mdash;
                  with human review built in at every stage.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm shadow-teal-500/25 transition-colors hover:bg-teal-700"
                  >
                    Start free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/chat/demo"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                  >
                    <MessageSquareMore className="h-4 w-4 text-teal-600" />
                    Try live demo
                  </Link>
                </div>
                <p className="mt-4 text-sm text-slate-500">
                  Set up in minutes. No credit card required. Your staff stays in control at every stage.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    "Responds to patients 24/7",
                    "Staff can review or take over anytime",
                    "Chat, SMS, and follow-up in one place",
                  ].map((item) => (
                    <div key={item} className="app-card-muted px-4 py-3 text-sm font-semibold text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="pointer-events-none absolute -left-6 top-14 h-28 w-28 rounded-full bg-violet-200/45 blur-3xl" />
                <div className="pointer-events-none absolute -right-6 bottom-10 h-36 w-36 rounded-full bg-teal-200/45 blur-3xl" />
                <div className="landing-shell relative p-4 sm:p-5">
                  <div className="grid gap-4 xl:grid-cols-[13rem_1fr_15rem]">
                    <aside className="rounded-[1.55rem] bg-[linear-gradient(180deg,rgba(137,114,255,0.18),rgba(205,197,255,0.18))] p-4">
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm">
                          <Bot className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Clinic AI</p>
                          <p className="text-xs text-slate-500">Operator workspace</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {[
                          "Dashboard",
                          "Conversations",
                          "Appointments",
                          "Patients",
                          "AI Training",
                        ].map((item, index) => (
                          <div
                            key={item}
                            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold ${
                              index === 1
                                ? "bg-white text-slate-950 shadow-sm"
                                : "text-slate-600"
                            }`}
                          >
                            <div className="h-2 w-2 rounded-full bg-violet-400" />
                            {item}
                          </div>
                        ))}
                      </div>
                    </aside>

                    <div className="app-card p-4 sm:p-5">
                      <div className="workspace-toolbar border-b border-slate-100 pb-4">
                        <div className="workspace-search min-w-0 flex-1">
                          <Search className="h-4 w-4" />
                          <span className="truncate text-sm">Search conversations, patients, or appointments</span>
                        </div>
                        <div className="app-pill border-violet-200 bg-violet-50 text-violet-700">
                          Appointments
                        </div>
                      </div>
                      <div className="mt-5 space-y-3">
                        {[
                          {
                            name: "Dad to tieners",
                            note: "Asked about a follow-up visit and next available time",
                            state: "Confirmed",
                            tone: "bg-emerald-50 text-emerald-700",
                          },
                          {
                            name: "Request cleaning",
                            note: "Pending staff confirmation for Friday morning",
                            state: "Needs review",
                            tone: "bg-blue-50 text-blue-700",
                          },
                          {
                            name: "Missed callback",
                            note: "Recovery queue item created from missed call",
                            state: "Queued",
                            tone: "bg-amber-50 text-amber-700",
                          },
                        ].map((item, index) => (
                          <div
                            key={item.name}
                            className={`app-list-row flex items-center gap-3 px-4 py-3 ${index === 0 ? "border-violet-100 bg-white shadow-sm" : ""}`}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                              <Users className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.tone}`}>
                                  {item.state}
                                </span>
                              </div>
                              <p className="truncate text-xs text-slate-500">{item.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="workspace-rail-card p-4">
                        <p className="workspace-section-label">Today</p>
                        <h3 className="mt-3 text-lg font-semibold text-slate-950">Marta is booked</h3>
                        <p className="mt-1 text-sm text-slate-500">Appointment moved from inquiry to confirmed request.</p>
                        <div className="mt-4 space-y-3">
                          {[
                            "Earliest slot confirmed",
                            "Reminder readiness checked",
                            "Deposit state visible",
                          ].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                              <CheckCircle2 className="h-4 w-4 text-teal-600" />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="workspace-rail-card p-4">
                        <p className="workspace-section-label">Operator view</p>
                        <div className="mt-3 grid gap-3">
                          <div className="app-card-muted px-4 py-3">
                            <p className="text-xs text-slate-500">Manual takeover</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">Visible when needed</p>
                          </div>
                          <div className="app-card-muted px-4 py-3">
                            <p className="text-xs text-slate-500">AI training</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">Grounded in clinic data</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="product" className="space-y-6">
            <div className="mx-auto max-w-3xl text-center">
              <div className="app-page-kicker mx-auto mb-5">
                <LayoutGrid className="h-3.5 w-3.5" />
                What you actually get
              </div>
              <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                Not just a chatbot. A complete front-desk workspace.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Built for real clinic operations: answering patient questions, capturing requests,
                keeping one inbox, surfacing follow-up risk, and moving conversations toward booked appointments.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {valuePoints.map((card) => (
                <div key={card.title} className="app-card p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
            <div className="landing-shell p-6 sm:p-8">
              <div className="app-page-kicker mb-5">
                <BriefcaseMedical className="h-3.5 w-3.5" />
                Product showcase
              </div>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                One product system from first inquiry to booked appointment.
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {productModules.map((module) => (
                  <div key={module.title} className="app-card-muted p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                      <module.icon className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold text-slate-950">{module.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{module.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-shell p-6 sm:p-8">
              <div className="app-page-kicker mb-5">
                <Workflow className="h-3.5 w-3.5" />
                How it works
              </div>
              <div className="space-y-4">
                {[
                  ["Patient reaches out", "A patient opens chat or sends an SMS asking about services, availability, or a booking."],
                  ["Assistant responds", "Clinic AI answers using your real clinic setup and collects the details your team needs."],
                  ["Staff reviews when needed", "Lower-confidence or sensitive threads stay visible for human review, editing, or takeover."],
                  ["Appointment moves forward", "The request becomes booked, followed up, reminded, or handled from the same workspace."],
                ].map(([title, description], index) => (
                  <div key={title} className="app-card-muted flex gap-4 px-5 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="trust" className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="landing-shell p-6 sm:p-8">
              <div className="app-page-kicker mb-5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Trust, privacy, and oversight
              </div>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                Built to feel careful, visible, and clinic-controlled.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Clinic AI is designed for real clinic work. The product stays honest about what the
                assistant can handle, keeps staff in control of every decision, and makes every patient interaction traceable.
              </p>
              <div className="mt-6 space-y-3 text-sm leading-6 text-slate-600">
                <p>Your clinic information stays under your configuration — the assistant never references generic scripts or outside sources.</p>
                <p>Operators can review, edit, step in manually, or pause AI replies at any time from the same workspace.</p>
                <p>Patient communication is logged end-to-end so your team always knows what was said, by whom, and when.</p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {trustCards.map((item) => (
                <div key={item.title} className="app-card p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Dental clinics",
                description: "Keep common appointment requests, cleaning questions, and front-desk workload organized in one place.",
              },
              {
                title: "Private practices",
                description: "Stay responsive to patient inquiries without relying only on voicemail, forms, or inbox fragments.",
              },
              {
                title: "Med spas",
                description: "Manage higher inquiry volume with stronger review visibility, intake capture, and appointment follow-through.",
              },
              {
                title: "Local healthcare offices",
                description: "Give staff a calmer workflow for triage, callbacks, reminders, and booked request handling.",
              },
            ].map((item) => (
              <div key={item.title} className="app-card p-6">
                <p className="workspace-section-label">Who it’s for</p>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              </div>
            ))}
          </section>

          <section id="pricing" className="space-y-6">
            <div className="mx-auto max-w-3xl text-center">
              <div className="app-page-kicker mx-auto mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                Pricing
              </div>
              <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">
                Honest pricing. No per-message fees. No hidden costs.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Pick the plan that matches your patient volume. Start free, upgrade when ready, cancel anytime — no lock-in contracts.
              </p>
            </div>

            {checkoutError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {checkoutError}
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-[1.9rem] border p-6 shadow-sm ${
                    plan.highlighted
                      ? "border-violet-200 bg-[linear-gradient(180deg,rgba(249,245,255,0.98),rgba(255,255,255,0.98))] shadow-[0_22px_46px_rgba(127,86,217,0.12)]"
                      : "border-slate-200 bg-white/90"
                  }`}
                >
                  {plan.badge ? (
                    <div className="mb-4 inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-700">
                      {plan.badge}
                    </div>
                  ) : null}
                  <h3 className="text-xl font-semibold text-slate-950">{plan.name}</h3>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-4xl font-semibold tracking-[-0.05em] text-slate-950">{plan.price}</span>
                    <span className="pb-1 text-sm font-medium text-slate-500">{plan.period}</span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>
                  <div className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                        <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-teal-50 text-teal-700">
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
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                          plan.highlighted
                            ? "bg-violet-600 text-white hover:bg-violet-700"
                            : "bg-teal-600 text-white hover:bg-teal-700"
                        }`}
                      >
                        {plan.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePaidPlanClick(plan.id as PaidPlanId)}
                        disabled={checkoutLoading === plan.id}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                          plan.highlighted
                            ? "bg-violet-600 text-white hover:bg-violet-700"
                            : "bg-slate-950 text-white hover:bg-slate-800"
                        } disabled:opacity-60`}
                      >
                        {checkoutLoading === plan.id ? "Loading..." : plan.cta}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="faq" className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <div className="landing-shell p-6 sm:p-8">
              <div className="app-page-kicker mb-5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Common questions
              </div>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                Straightforward answers about how the product works.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Clinic AI is not a replacement for clinical judgment. It is a reliable operating layer
                for patient communication, appointment follow-up, and front-desk scheduling.
              </p>
            </div>
            <div className="space-y-4">
              {faqs.map((item) => (
                <div key={item.question} className="app-card p-6">
                  <h3 className="text-base font-semibold text-slate-950">{item.question}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="landing-shell px-6 py-8 sm:px-8 sm:py-10">
            <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <div className="app-page-kicker mb-5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Start with the real workflow
                </div>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                  See the difference in your first week.
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                  Start free, configure the assistant with your real clinic information, and let your team work from one workspace.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row xl:flex-col">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm shadow-teal-500/20 transition-colors hover:bg-teal-700"
                >
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/chat/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Try live demo
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/80 bg-white/70 px-5 py-8 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600 text-white">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Clinic AI</p>
              <p className="text-xs text-slate-500">Patient communication and clinic operations, handled with care and full transparency.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <Link href="/login" className="hover:text-slate-900">Sign in</Link>
            <Link href="/register" className="hover:text-slate-900">Start free</Link>
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
