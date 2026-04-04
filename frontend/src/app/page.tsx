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
  ContactRound,
  Inbox,
  LayoutGrid,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
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
  href: string;
  highlighted: boolean;
  badge?: string;
};

const plans: LandingPlan[] = [
  {
    id: "trial",
    name: "Starter Trial",
    price: "$0",
    period: "for 14 days",
    description: "A quick, honest way to test Clinic AI with your real clinic information.",
    features: [
      "AI assistant and live web chat",
      "Inbox, leads, customers, and dashboard",
      "25 captured requests included",
      "Guided onboarding and training workspace",
    ],
    cta: "Start Free",
    href: "/register",
    highlighted: false,
  },
  {
    id: "professional",
    name: "Professional",
    price: "$49",
    period: "/month",
    description: "For clinics that want one calm operational workspace for inquiries, follow-up, and booking.",
    features: [
      "Everything in Starter Trial",
      "200 requests per month",
      "SMS inbox and review controls",
      "Appointments workspace and reminder readiness",
      "Google Sheets and Excel quick connect",
    ],
    cta: "Choose Professional",
    href: "/register",
    highlighted: true,
    badge: "Most popular",
  },
  {
    id: "premium",
    name: "Premium",
    price: "$99",
    period: "/month",
    description: "For higher-volume clinics that want AI assistance, deposits, and operations visibility without capacity limits.",
    features: [
      "Everything in Professional",
      "Unlimited captured requests",
      "Priority support",
      "Custom branding",
      "Advanced booking and deposit workflows",
    ],
    cta: "Choose Premium",
    href: "/register",
    highlighted: false,
  },
];

const valueCards = [
  {
    icon: MessageSquareMore,
    title: "Answer patients instantly",
    description:
      "Handle common questions, collect intent, and keep your clinic responsive after hours without leaving people waiting.",
  },
  {
    icon: Inbox,
    title: "Work everything from one inbox",
    description:
      "See web chat, SMS, review-required replies, manual takeover, and operator actions in a single front-desk workspace.",
  },
  {
    icon: TriangleAlert,
    title: "Catch follow-up risk early",
    description:
      "Clinic AI surfaces missed opportunities, stalled requests, and reminder issues before they turn into lost bookings.",
  },
  {
    icon: CalendarDays,
    title: "Keep bookings operational",
    description:
      "Move from conversation to booked appointment, reminders, and deposit tracking without pretending there is a calendar sync that does not exist.",
  },
];

const productCards = [
  {
    icon: MessageSquareMore,
    title: "AI patient chat",
    description:
      "A branded assistant that answers questions, collects contact details, and hands real requests into the clinic workspace.",
    tone: "teal",
  },
  {
    icon: Inbox,
    title: "Operator inbox",
    description:
      "Review every thread, take over manually, approve suggested replies, and move patients forward to booking.",
    tone: "violet",
  },
  {
    icon: BrainCircuit,
    title: "AI training workspace",
    description:
      "Keep services, FAQs, hours, and clinic-specific notes current so the assistant stays grounded in real information.",
    tone: "slate",
  },
  {
    icon: TriangleAlert,
    title: "Follow-up and recovery queue",
    description:
      "Spot missed-call recovery, abandoned requests, and action-needed items before they disappear into the day.",
    tone: "amber",
  },
  {
    icon: CalendarDays,
    title: "Appointments workspace",
    description:
      "Manage booked requests, reminder readiness, deposit state, and operational actions from one clean screen.",
    tone: "emerald",
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
      if (globalThis.window === undefined) {
        return;
      }

      const accessToken = globalThis.localStorage.getItem("access_token");
      if (!accessToken) {
        router.push(`/register?plan=${planId}`);
        return;
      }

      await startCheckoutForPlan(planId);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Failed to start checkout."
      );
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <nav className="sticky top-0 z-40 border-b border-white/70 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 shadow-sm shadow-teal-500/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-slate-950">Clinic AI</p>
              <p className="text-xs text-slate-500">Front-desk operating system</p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <a href="#product" className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:bg-white hover:text-slate-900">
              Product
            </a>
            <a href="#trust" className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:bg-white hover:text-slate-900">
              Trust
            </a>
            <a href="#pricing" className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:bg-white hover:text-slate-900">
              Pricing
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
              Start Free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative px-5 pb-20 pt-16 sm:px-6 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="app-page-kicker mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                Built for modern clinics and private practices
              </div>
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
                An AI front desk your clinic can actually trust.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Clinic AI answers patient questions, captures booking requests, organizes every conversation,
                and gives your team a calm operational workspace to review, follow up, and confirm appointments.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm shadow-teal-500/25 transition-colors hover:bg-teal-700"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/chat/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <MessageSquareMore className="h-4 w-4 text-teal-600" />
                  Try Live Demo
                </Link>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Fast setup, operator review when needed, and honest workflow visibility from first inquiry to booked appointment.
              </p>
              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {[
                  "24/7 patient capture",
                  "Manual takeover when needed",
                  "Clear operational follow-up",
                ].map((item) => (
                  <div key={item} className="app-card-muted px-4 py-3 text-sm font-medium text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -left-6 top-10 h-28 w-28 rounded-full bg-violet-200/35 blur-3xl" />
              <div className="pointer-events-none absolute -right-4 bottom-6 h-36 w-36 rounded-full bg-teal-200/40 blur-3xl" />
              <div className="app-card relative overflow-hidden p-5 sm:p-6">
                <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="app-card-muted overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-slate-200/80 px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-600 text-white">
                        <MessageSquareMore className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Patient chat</p>
                        <p className="text-xs text-slate-500">Available after hours</p>
                      </div>
                      <span className="ml-auto app-pill border-emerald-200 bg-emerald-50 text-emerald-700">
                        Live
                      </span>
                    </div>
                    <div className="space-y-3 px-4 py-4 text-sm">
                      <div className="max-w-[88%] rounded-[1.2rem] rounded-bl-sm bg-white px-3.5 py-3 text-slate-700 shadow-sm">
                        Hi, I can help you with appointments, services, and clinic questions.
                      </div>
                      <div className="ml-auto max-w-[80%] rounded-[1.2rem] rounded-br-sm bg-teal-600 px-3.5 py-3 text-white shadow-sm shadow-teal-500/20">
                        I need a cleaning next week.
                      </div>
                      <div className="max-w-[88%] rounded-[1.2rem] rounded-bl-sm bg-white px-3.5 py-3 text-slate-700 shadow-sm">
                        Great. I can collect your details and your preferred time for the team.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="app-card-muted p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Inbox workspace</p>
                          <p className="text-xs text-slate-500">AI + staff review in one place</p>
                        </div>
                        <Inbox className="h-4.5 w-4.5 text-violet-600" />
                      </div>
                      <div className="mt-4 space-y-3">
                        {[
                          { name: "Maria Santos", note: "Pending human review", tone: "bg-blue-50 text-blue-700" },
                          { name: "James O'Brien", note: "Booked", tone: "bg-emerald-50 text-emerald-700" },
                          { name: "Priya Patel", note: "Staff handling SMS", tone: "bg-amber-50 text-amber-700" },
                        ].map((item) => (
                          <div key={item.name} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-3 py-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                              <ContactRound className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                              <p className="truncate text-xs text-slate-500">{item.note}</p>
                            </div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.tone}`}>
                              Active
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <div className="app-card-muted p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                          <Sparkles className="h-4.5 w-4.5" />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-slate-900">Training and trust</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Keep services, hours, FAQs, and notes accurate so the assistant stays grounded.
                        </p>
                      </div>
                      <div className="app-card-muted p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                          <CalendarDays className="h-4.5 w-4.5" />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-slate-900">Appointments</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Booked requests, reminder readiness, and deposit tracking stay visible for the front desk.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="product" className="px-5 py-18 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="app-page-kicker mx-auto mb-5">
                <LayoutGrid className="h-3.5 w-3.5" />
                Immediate product value
              </div>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                More than a booking button. A real front-desk workflow.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Clinic AI is built for real clinic operations: quick patient answers, one inbox, follow-up visibility,
                operator review, manual takeover, and a cleaner path from inquiry to confirmed appointment.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {valueCards.map((card) => (
                <div key={card.title} className="app-card p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-950">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-18 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="app-page-kicker mx-auto mb-5">
                <BriefcaseMedical className="h-3.5 w-3.5" />
                See what you get
              </div>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                A premium workspace for clinics that need clarity, not chaos.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                The product stays honest about what is automated, what needs review, and where your team should step in.
              </p>
            </div>
            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {productCards.map((card) => {
                const toneClasses =
                  card.tone === "teal"
                    ? "bg-teal-50 text-teal-700"
                    : card.tone === "violet"
                      ? "bg-violet-50 text-violet-700"
                      : card.tone === "amber"
                        ? "bg-amber-50 text-amber-700"
                        : card.tone === "emerald"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-700";

                return (
                  <div key={card.title} className="app-card p-6">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClasses}`}>
                      <card.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-950">{card.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{card.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-18 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="app-card px-6 py-8 sm:px-8 lg:px-10">
              <div className="mx-auto max-w-3xl text-center">
                <div className="app-page-kicker mx-auto mb-5">
                  <ArrowRight className="h-3.5 w-3.5" />
                  How it works
                </div>
                <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                  Patient in. Conversation captured. Team in control.
                </h2>
              </div>
              <div className="mt-12 grid gap-5 md:grid-cols-4">
                {[
                  {
                    title: "Patient reaches out",
                    description: "A patient opens chat or sends an SMS to ask a question or request an appointment.",
                  },
                  {
                    title: "Assistant responds",
                    description: "Clinic AI answers based on your real clinic setup and collects the details your team needs.",
                  },
                  {
                    title: "Staff reviews when needed",
                    description: "Lower-confidence or sensitive cases are surfaced for human review, editing, or takeover.",
                  },
                  {
                    title: "Appointment moves forward",
                    description: "The request becomes booked, followed up, reminded, or handled from the same workspace.",
                  },
                ].map((item, index) => (
                  <div key={item.title} className="app-card-muted p-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <h3 className="mt-5 text-base font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="trust" className="px-5 py-18 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <div className="app-page-kicker mb-5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Trust and visibility
              </div>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                Built to feel careful, transparent, and clinic-controlled.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                Clinic AI is designed for real front-desk work. That means operators can review, staff can take over,
                and every conversation has clear state instead of vague automation.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {[
                {
                  icon: ShieldCheck,
                  title: "Clinic-controlled information",
                  description:
                    "The assistant is trained on the clinic details, FAQs, services, hours, and notes you configure.",
                },
                {
                  icon: ContactRound,
                  title: "Human takeover is built in",
                  description:
                    "Operators can step in on a thread, re-enable AI later, and keep patient handling clear at every stage.",
                },
                {
                  icon: BrainCircuit,
                  title: "No blind confidence",
                  description:
                    "When the assistant is unsure, the product can route the draft to staff review instead of pretending confidence.",
                },
                {
                  icon: Inbox,
                  title: "Operational visibility",
                  description:
                    "Inbox, opportunities, appointments, and activity stay connected so the front desk sees what actually happened.",
                },
              ].map((item) => (
                <div key={item.title} className="app-card p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <item.icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-18 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="app-page-kicker mx-auto mb-5">
                <BriefcaseMedical className="h-3.5 w-3.5" />
                Who it is for
              </div>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                A strong fit for clinics that want faster response and cleaner operations.
              </h2>
            </div>
            <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {[
                "Dental clinics",
                "Private practices",
                "Med spas",
                "Local healthcare offices",
              ].map((label) => (
                <div key={label} className="app-card-muted flex items-center gap-4 px-5 py-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                    <BriefcaseMedical className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-5 py-18 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="app-page-kicker mx-auto mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                Pricing
              </div>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                Premium enough for a real clinic. Simple enough to trust.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Start free, prove the workflow, then upgrade when the clinic is ready for more volume and operator tooling.
              </p>
            </div>

            {checkoutError ? (
              <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {checkoutError}
              </div>
            ) : null}

            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex h-full flex-col rounded-[1.75rem] p-7 ${
                    plan.highlighted ? "app-card ring-2 ring-teal-200/80" : "app-card-muted"
                  }`}
                >
                  {plan.badge ? (
                    <span className="absolute -top-3 left-6 rounded-full bg-teal-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm shadow-teal-500/20">
                      {plan.badge}
                    </span>
                  ) : null}
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{plan.name}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>
                  </div>
                  <div className="mt-7">
                    <span className="text-5xl font-semibold tracking-tight text-slate-950">{plan.price}</span>
                    <span className="ml-2 text-sm text-slate-500">{plan.period}</span>
                  </div>
                  <ul className="mt-8 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                        <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {plan.id === "trial" ? (
                    <Link
                      href={plan.href}
                      className={`mt-8 inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-colors ${
                        plan.highlighted
                          ? "bg-teal-600 text-white hover:bg-teal-700"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePaidPlanClick(plan.id as PaidPlanId)}
                      disabled={checkoutLoading === plan.id}
                      className={`mt-8 inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-colors ${
                        plan.highlighted
                          ? "bg-teal-600 text-white hover:bg-teal-700"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      {checkoutLoading === plan.id ? "Starting checkout..." : plan.cta}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-18 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="app-page-kicker mx-auto mb-5">
                <ShieldCheck className="h-3.5 w-3.5" />
                FAQ
              </div>
              <h2 className="text-4xl font-semibold tracking-tight text-slate-950">
                Questions clinic owners usually ask first.
              </h2>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {[
                {
                  q: "Is this difficult to set up?",
                  a: "No. You can start with clinic basics, add services and hours, test the assistant, and go live without rebuilding your workflow.",
                },
                {
                  q: "Can my staff still review conversations?",
                  a: "Yes. The inbox is built for operator review, manual replies, takeover, and AI re-enable on the thread when appropriate.",
                },
                {
                  q: "What if the assistant is unsure?",
                  a: "Clinic AI can keep the thread honest by routing lower-confidence replies for human review instead of auto-sending blindly.",
                },
                {
                  q: "Can I update clinic information later?",
                  a: "Yes. Services, hours, FAQs, assistant messaging, spreadsheets, and operational settings can all be updated after setup.",
                },
                {
                  q: "Do patients know they are speaking with an assistant?",
                  a: "The product is designed for transparent front-desk communication and operator oversight rather than pretending staff are typing when they are not.",
                },
                {
                  q: "Can my team step in manually?",
                  a: "Yes. Staff can reply directly, take over a thread, book appointments, mark outcomes, and keep the workflow moving from the same workspace.",
                },
              ].map((item) => (
                <div key={item.q} className="app-card p-6">
                  <h3 className="text-base font-semibold text-slate-950">{item.q}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 pt-6 sm:px-6 lg:px-8 lg:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="app-card overflow-hidden px-6 py-10 text-center sm:px-10">
              <div className="app-page-kicker mx-auto mb-5">
                <ArrowRight className="h-3.5 w-3.5" />
                Ready to start
              </div>
              <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-slate-950">
                Give your clinic a calmer, more reliable front desk workflow.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
                Start with your real clinic information, test the assistant, and go live when the workflow feels right.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm shadow-teal-500/20 transition-colors hover:bg-teal-700"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/70 bg-white/80 px-5 py-8 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-600">
              <Bot className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Clinic AI</p>
              <p className="text-xs text-slate-500">AI front-desk operating system for clinics</p>
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
