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
import { MarketingProductWindow } from "@/components/marketing/MarketingProductWindow";

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

/** Sidebar order and labels match `dashboard/layout.tsx` (truncated list would undersell real nav). */
const DASHBOARD_NAV_PREVIEW = [
  "Dashboard",
  "Inbox",
  "Leads",
  "Appointments",
  "Customers",
  "Opportunities",
  "Operations",
  "Activity",
  "AI Training",
  "Billing",
  "Settings",
] as const;

const afterSignupJourney = [
  {
    step: "01",
    title: "Account & workspace",
    description:
      "You create an owner account and enter guided onboarding immediately — same workspace trial and paid teams use.",
  },
  {
    step: "02",
    title: "Configure what patients see",
    description:
      "Clinic profile, services, hours, FAQs, and optional spreadsheet links — everything the assistant is allowed to talk about.",
  },
  {
    step: "03",
    title: "Test before the public sees it",
    description:
      "Use the built-in chat test and your /chat/{slug} preview. Embed the widget when you are ready; patients still see a clear not-live state until you go live.",
  },
  {
    step: "04",
    title: "Staff work from Inbox → Leads → Appointments",
    description:
      "Threads, captured requests, and booking state stay linked. Human review, takeover, and notes all happen in those real modules.",
  },
  {
    step: "05",
    title: "Go live when you decide",
    description:
      "Flip Go live in the dashboard header when you want the assistant to show as active. Return to Settings any time to tune training or hours.",
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
    <div className="public-marketing-root">
      <PublicNav />

      {/* ── HERO ── */}
      <section className="marketing-hero marketing-surface-white border-b border-slate-300/80">
        <div className="marketing-container">
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
              <p className="marketing-lead mt-7 max-w-2xl">
                Clinic AI answers inbound patient questions, captures appointment requests,
                and gives your team a single operating view — with human review and
                takeover built in at every step.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/register" className="marketing-cta-primary">
                  Start free — 14 days
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/chat/demo" className="marketing-cta-secondary">
                  <MessageSquareMore className="h-4 w-4 text-[#0F766E]" />
                  Try live demo
                </Link>
              </div>
              <p className="mt-4">
                <Link
                  href="/product"
                  className="text-[0.9375rem] font-semibold text-[#0F766E] transition-colors hover:text-[#115E59]"
                >
                  See every module and route →
                </Link>
              </p>
              <p className="mt-6 text-[1.0625rem] font-medium text-slate-600">
                No credit card required &middot; Set up in under 15 minutes &middot; Your staff stays in control
              </p>

              <div className="mt-10 flex flex-wrap gap-2.5">
                {[
                  "Responds 24/7",
                  "Staff review & takeover",
                  "Grounded in your clinic info",
                  "One inbox for all channels",
                ].map((feat) => (
                  <span key={feat} className="marketing-trust-chip">
                    <Check className="h-4 w-4 shrink-0 text-[#0F766E]" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Workspace preview */}
            <div className="relative hidden lg:block">
              <MarketingProductWindow
                pathLabel="/dashboard/inbox"
                caption="Composite preview — sidebar labels match real dashboard routes; after setup, lists and search reflect your clinic’s conversations and patients."
              >
                <div className="marketing-hero-preview relative overflow-hidden p-6 sm:p-7 lg:p-8">
                  <div className="grid gap-4 lg:grid-cols-[12.5rem_1fr_14rem] xl:grid-cols-[13rem_1fr_14.5rem]">
                    {/* Sidebar */}
                    <aside className="rounded-xl border border-slate-200/90 bg-white/80 p-4 shadow-sm backdrop-blur-sm">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#0F766E] shadow-sm">
                          <Bot className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-[0.8125rem] font-semibold text-[#0F172A]">Clinic AI</p>
                          <p className="text-[0.6875rem] font-medium text-[#64748B]">Signed-in workspace</p>
                        </div>
                      </div>
                      <div className="max-h-[13.5rem] space-y-1 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {DASHBOARD_NAV_PREVIEW.map((item) => (
                          <div
                            key={item}
                            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-[0.75rem] font-medium sm:py-2 sm:text-[0.8125rem] ${item === "Inbox"
                              ? "border border-slate-200 bg-white text-[#0F172A] shadow-sm"
                              : "text-[#475569]"
                              }`}
                          >
                            <div
                              className={`h-2 w-2 shrink-0 rounded-full ${item === "Inbox" ? "bg-[#0F766E]" : "bg-[#CBD5E1]"
                                }`}
                            />
                            {item}
                          </div>
                        ))}
                      </div>
                    </aside>

                    {/* Main panel */}
                    <div className="app-card p-5">
                      <div className="workspace-toolbar border-b border-[#E2E8F0] pb-3">
                        <div className="workspace-search min-h-[2.5rem] min-w-0 flex-1 text-[0.8125rem]">
                          <Search className="h-4 w-4" />
                          <span className="truncate">Search conversations or patients</span>
                        </div>
                        <div className="app-pill border-[#99f6e4] bg-[#CCFBF1] text-[#115E59] text-[0.8125rem]">
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
                            className={`app-list-row flex items-center gap-3 px-3 py-3 ${i === 0 ? "border border-[#99f6e4] bg-[#FFFFFF] shadow-sm" : ""
                              }`}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                              <Users className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-[0.8125rem] font-semibold text-slate-900">{item.name}</p>
                                <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${item.tone}`}>
                                  {item.state}
                                </span>
                              </div>
                              <p className="truncate text-[0.75rem] text-slate-600">{item.note}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rail */}
                    <div className="space-y-3">
                      <div className="workspace-rail-card p-4 shadow-sm">
                        <p className="workspace-section-label">Today</p>
                        <h3 className="mt-3 text-[0.9375rem] font-semibold text-slate-900">Marta is booked</h3>
                        <p className="mt-1 text-[0.8125rem] leading-snug text-slate-600">From inquiry to confirmed appointment.</p>
                        <div className="mt-3 space-y-2">
                          {["Earliest slot confirmed", "Reminder set", "Deposit visible"].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-[0.8125rem] text-slate-600">
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="workspace-rail-card p-4 shadow-sm">
                        <p className="workspace-section-label">Operator view</p>
                        <div className="mt-3 space-y-2">
                          <div className="app-card-muted px-3 py-2.5">
                            <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">Staff takeover</p>
                            <p className="mt-1 text-[0.8125rem] font-semibold text-slate-900">Available anytime</p>
                          </div>
                          <div className="app-card-muted px-3 py-2.5">
                            <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">AI training</p>
                            <p className="mt-1 text-[0.8125rem] font-semibold text-slate-900">Grounded in clinic data</p>
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
        {/* ── HOW IT WORKS ── */}
        <section className="marketing-section marketing-surface-warm">
          <div className="marketing-container">
            <div className="mb-16 max-w-4xl">
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
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {howItWorks.map((step) => (
                <div
                  key={step.step}
                  className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-md shadow-slate-900/5 sm:p-9"
                >
                  <span className="text-5xl font-bold tabular-nums text-slate-200">{step.step}</span>
                  <h3 className="marketing-h3 mt-5">{step.title}</h3>
                  <p className="marketing-body mt-3">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRODUCT PROOF (honest, no fabricated metrics) ── */}
        <section className="marketing-section-tight marketing-surface-elevated border-y border-slate-200/90">
          <div className="marketing-container">
            <div className="mx-auto max-w-3xl text-center">
              <div className="marketing-kicker mx-auto mb-5">
                <ShieldCheck className="h-3 w-3" />
                Same app from trial through paid plans
              </div>
              <h2 className="marketing-h2 mx-auto max-w-2xl">
                Built as operational software, not a landing-page demo
              </h2>
              <p className="marketing-lead mx-auto mt-4 max-w-2xl">
                Clinic AI is a coherent workspace: patient chat, operator inbox, configuration, and billing hooks are
                shipping surfaces — not mocked screenshots or a separate &ldquo;enterprise&rdquo; codebase.
              </p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                {
                  title: "Live routes on day one",
                  body: "Dashboard, inbox, leads, appointments, settings, and patient chat URLs are real Next.js routes in your account — the trial uses the same navigation paying teams see.",
                },
                {
                  title: "Grounded in what you configure",
                  body: "Services, hours, FAQs, and optional spreadsheet links come from your setup. The assistant does not invent clinic facts or learn from other customers.",
                },
                {
                  title: "You control go-live",
                  body: "Until you go live, the public chat shows an explicit not-live state. Embed code and preview links help you stage before patients see an active assistant.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200/90 bg-white p-8 text-left shadow-sm sm:p-9"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#CCFBF1] text-[#0F766E]">
                    <Check className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="marketing-h3 mt-5">{item.title}</h3>
                  <p className="marketing-body mt-3">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AFTER SIGNUP (conversion confidence) ── */}
        <section
          id="after-signup"
          className="marketing-section marketing-surface-white border-b border-slate-200/90"
          aria-labelledby="after-signup-heading"
        >
          <div className="marketing-container">
            <div className="mb-12 max-w-3xl">
              <div className="marketing-kicker mb-5">
                <Workflow className="h-3 w-3" />
                After you start the trial
              </div>
              <h2 id="after-signup-heading" className="marketing-h2">
                What happens in your first week — no guesswork.
              </h2>
              <p className="marketing-lead mt-4">
                Same product surface from day one: real routes like{" "}
                <span className="font-mono text-[0.875em] text-slate-700">/dashboard/inbox</span>,{" "}
                <span className="font-mono text-[0.875em] text-slate-700">/dashboard/settings</span>, and{" "}
                <span className="font-mono text-[0.875em] text-slate-700">/dashboard/training</span>.
                The steps below are the path most clinics follow; nothing here requires a separate &ldquo;enterprise&rdquo; app.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {afterSignupJourney.map((step) => (
                <div
                  key={step.step}
                  className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-7 shadow-sm sm:p-8"
                >
                  <span className="text-xs font-bold tabular-nums tracking-widest text-[#0F766E]">{step.step}</span>
                  <h3 className="marketing-h3 mt-3 text-[1.125rem]">{step.title}</h3>
                  <p className="marketing-body mt-2 text-[0.9375rem]">{step.description}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-center text-[0.9375rem] text-slate-600">
              Want the module-by-module map first?{" "}
              <Link href="/product" className="font-semibold text-[#0F766E] hover:text-[#115E59]">
                Read the product overview
              </Link>
              {" · "}
              <Link href="/faq" className="font-semibold text-[#0F766E] hover:text-[#115E59]">
                FAQ &amp; setup
              </Link>
            </p>
          </div>
        </section>

        {/* ── WHAT YOU GET ── */}
        <section id="product" className="marketing-section marketing-surface-white border-y border-slate-300/70">
          <div className="marketing-container">
            <div className="mb-16 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
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
                className="shrink-0 inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-[#0F766E] hover:text-[#115E59]"
              >
                See full product overview
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="marketing-feature-grid">
              {featureCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/90 p-8 shadow-md transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg sm:p-9"
                >
                  <div className="marketing-icon-wrap h-12 w-12">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <h3 className="marketing-h3 mt-6">{card.title}</h3>
                  <p className="marketing-body mt-3">{card.description}</p>
                </div>
              ))}
            </div>

            {/* Platform modules */}
            <div className="mt-12 grid gap-6 xl:grid-cols-[1.12fr_0.88fr] xl:gap-8">
              <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
                <div className="app-page-kicker mb-5">
                  <Bot className="h-3.5 w-3.5" />
                  Platform modules
                </div>
                <h3 className="marketing-h3 max-w-lg">
                  One product system from inquiry to booked appointment.
                </h3>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {[
                    { icon: Inbox, name: "Operator inbox", desc: "Every patient thread, AI-handled and staff-reviewed, in one place." },
                    { icon: CalendarDays, name: "Appointments workspace", desc: "Track bookings, reminders, reschedules, and deposit status." },
                    { icon: BrainCircuit, name: "AI training", desc: "Keep your assistant accurate with services, FAQs, and internal notes." },
                    { icon: TriangleAlert, name: "Follow-up visibility", desc: "Stalled requests and booking gaps surface before they fall through." },
                  ].map((mod) => (
                    <div key={mod.name} className="rounded-xl border border-slate-100 bg-slate-50/90 p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#CCFBF1] text-[#115E59]">
                        <mod.icon className="h-5 w-5" />
                      </div>
                      <h4 className="mt-4 text-[1.0625rem] font-semibold text-[#0F172A]">{mod.name}</h4>
                      <p className="marketing-body mt-2">{mod.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                {clinicTypes.map((item) => (
                  <div key={item.type} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                    <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.1em] text-slate-500">Who it&apos;s for</p>
                    <h3 className="marketing-h3 mt-3">{item.type}</h3>
                    <p className="marketing-body mt-2">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST ── */}
        <section id="trust" className="marketing-section marketing-surface-mist">
          <div className="marketing-container">
            <div className="mb-16 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
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
                className="shrink-0 inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-[#0F766E] hover:text-[#115E59]"
              >
                Read our trust approach
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {trustCards.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-teal-100/80 bg-white/95 p-8 shadow-md shadow-teal-900/5 backdrop-blur-sm sm:p-9"
                >
                  <div className="marketing-icon-wrap h-12 w-12">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="marketing-h3 mt-6">{item.title}</h3>
                  <p className="marketing-body mt-3">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="pricing" className="marketing-section marketing-surface-slate">
          <div className="marketing-container">
            <div className="mb-16 text-center">
              <div className="marketing-kicker mx-auto mb-5">
                <Sparkles className="h-3 w-3" />
                Pricing
              </div>
              <h2 className="marketing-h2 mx-auto max-w-4xl">
                Honest pricing. No per-message fees.
              </h2>
              <p className="marketing-lead mx-auto mt-5 max-w-2xl">
                Pick the plan that matches your patient volume. Start free, upgrade when ready, cancel anytime.
              </p>
            </div>

            {checkoutError ? (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#DC2626]">
                {checkoutError}
              </div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white p-8 sm:p-9 ${plan.highlighted
                    ? "border-[#0F766E] shadow-xl shadow-teal-900/10 ring-1 ring-[#0F766E]/20"
                    : "border-white/80 shadow-md shadow-slate-900/5"
                    }`}
                >
                  {plan.badge ? (
                    <div className="mb-5 inline-flex rounded-full border border-[#99f6e4] bg-[#CCFBF1] px-3 py-1 text-[0.8125rem] font-semibold text-[#115E59]">
                      {plan.badge}
                    </div>
                  ) : null}
                  <h3 className="text-lg font-semibold text-[#0F172A]">{plan.name}</h3>
                  <div className="mt-6 flex items-end gap-2">
                    <span className="text-5xl font-bold tabular-nums tracking-tight text-[#0F172A]">{plan.price}</span>
                    <span className="pb-1.5 text-[0.9375rem] font-medium text-[#64748B]">{plan.period}</span>
                  </div>
                  <p className="marketing-body mt-5">{plan.description}</p>
                  <div className="mt-7 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#CCFBF1] text-[#115E59]">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span className="marketing-body">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-10">
                    {plan.id === "trial" ? (
                      <Link href="/register" className="marketing-cta-primary !w-full">
                        {plan.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePaidPlanClick(plan.id as PaidPlanId)}
                        disabled={checkoutLoading === plan.id}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[0.9375rem] font-semibold transition-colors disabled:opacity-60 ${plan.highlighted
                          ? "marketing-cta-primary !w-full shadow-lg"
                          : "border border-slate-300 bg-white text-[#0F172A] hover:bg-slate-50"
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

            <p className="mt-10 text-center text-[0.9375rem] text-slate-600">
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
          </div>
        </section>

        {/* ── FAQ TEASER ── */}
        <section id="faq" className="marketing-section marketing-surface-elevated border-y border-slate-300/60">
          <div className="marketing-container">
            <div className="grid gap-14 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.4fr)] xl:gap-20">
              <div className="max-w-lg xl:max-w-xl">
                <div className="marketing-kicker mb-5">
                  <ShieldCheck className="h-3 w-3" />
                  Common questions
                </div>
                <h2 className="marketing-h2">
                  Straightforward answers.
                </h2>
                <p className="marketing-lead mt-5">
                  Clinic AI is not a replacement for clinical judgment. It is a reliable operating layer for patient communication, booking, and front-desk follow-up.
                </p>
                <Link
                  href="/faq"
                  className="mt-8 inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-[#0F766E] hover:text-[#115E59]"
                >
                  See all questions
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-5">
                {faqs.map((item) => (
                  <div
                    key={item.question}
                    className="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-sm sm:p-9"
                  >
                    <h3 className="text-lg font-semibold text-[#0F172A]">{item.question}</h3>
                    <p className="marketing-body mt-3">{item.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="marketing-final-act">
          <div className="marketing-container">
            <div className="overflow-hidden rounded-3xl bg-[#0F766E] px-8 py-12 shadow-2xl shadow-teal-950/25 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
              <div className="grid gap-10 xl:grid-cols-[1fr_auto] xl:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/35 bg-teal-800/40 px-4 py-1.5 text-[0.8125rem] font-semibold uppercase tracking-[0.07em] text-teal-100">
                    <Sparkles className="h-3.5 w-3.5" />
                    Get started today
                  </div>
                  <h2 className="mt-6 text-[clamp(2rem,2.2vw+1rem,3rem)] font-bold tracking-tight text-white">
                    See the difference in your first week.
                  </h2>
                  <p className="mt-6 max-w-xl text-[1.1875rem] leading-relaxed text-teal-50/95">
                    Configure the assistant with your real clinic information, let your team work from one workspace, and see what a complete front-desk operating system feels like.
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
