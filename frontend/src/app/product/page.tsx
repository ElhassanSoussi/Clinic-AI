import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  Check,
  ContactRound,
  Inbox,
  LayoutGrid,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Workflow,
} from "lucide-react";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";

export const metadata: Metadata = {
  title: "Product — Clinic AI",
  description:
    "How Clinic AI works: inbox, appointments, AI training, follow-up, staff review, and operational visibility — all in one platform.",
};

const modules = [
  {
    icon: Inbox,
    name: "Operator inbox",
    tagline: "One inbox for every patient thread",
    description:
      "Web chat messages, SMS threads, staff notes, and manual takeovers all live in a single inbox. Every conversation has a complete history so your team never needs to reconstruct context from other tools.",
    details: [
      "Web chat and SMS conversations in one view",
      "AI-handled and staff-reviewed threads side by side",
      "Full message history with timestamps and author labels",
      "Manual takeover from any conversation at any point",
      "Filter and search by status, date, or patient name",
    ],
  },
  {
    icon: CalendarDays,
    name: "Appointments workspace",
    tagline: "Track every booking from request to confirmed",
    description:
      "Every appointment request that comes through chat or SMS is tracked from first message to confirmed booking. Reminder readiness, deposit status, reschedule history, and staff notes stay connected to the original inquiry.",
    details: [
      "Appointment requests created from patient conversations",
      "Booking status: pending, confirmed, cancelled, rescheduled",
      "Reminder readiness view for upcoming appointments",
      "Deposit tracking for practices that require it",
      "Staff notes attached to each appointment record",
    ],
  },
  {
    icon: BrainCircuit,
    name: "AI training",
    tagline: "Teach the assistant exactly what your clinic does",
    description:
      "The assistant learns from what you configure — not from the internet, not from other clinics. Add your services, business hours, common FAQs, and internal notes. Update them anytime from the workspace.",
    details: [
      "Services list with descriptions and pricing if needed",
      "Business hours with location or provider-specific overrides",
      "Clinic FAQs the assistant draws on to answer patients",
      "Internal notes for edge cases and special handling",
      "Live preview to test the assistant before going live",
    ],
  },
  {
    icon: TriangleAlert,
    name: "Follow-up visibility",
    tagline: "Surface every stalled request before it falls through",
    description:
      "Stalled conversations, missed callbacks, and blocked patient journeys are surfaced automatically so your team can act before patients move on. You decide what counts as a follow-up risk.",
    details: [
      "Stalled conversations flagged after configurable timeout",
      "Missed callback recovery queue for unanswered requests",
      "Booking gap detection for high-priority follow-up",
      "Operator view distinguishes handled vs. pending threads",
      "Team visibility into who last touched each request",
    ],
  },
  {
    icon: ContactRound,
    name: "Staff review & takeover",
    tagline: "Human control at every step",
    description:
      "Your team is never locked out. Staff can review any AI-handled conversation, edit a suggested reply before it sends, step in live to take over, or pause AI replies for a specific thread entirely.",
    details: [
      "Review AI-suggested replies before they are sent",
      "Edit and send from the same inbox view",
      "Take over any thread — AI pauses automatically",
      "Resume AI handling when staff has resolved the issue",
      "Lower-confidence threads flagged for proactive review",
    ],
  },
  {
    icon: LayoutGrid,
    name: "Operational visibility",
    tagline: "A complete view of your front-desk operations",
    description:
      "The dashboard gives your team a live picture of patient requests, appointment activity, follow-up queues, and communication history — everything needed to run the front desk without switching between tools.",
    details: [
      "Daily summary of patient requests and status",
      "Appointment pipeline across all active bookings",
      "Follow-up queue with time-since-last-contact",
      "Lead capture log for new patient inquiries",
      "Audit trail — every conversation, action, and reply",
    ],
  },
];

export default function ProductPage() {
  return (
    <div className="public-marketing-root">
      <PublicNav />

      {/* Hero */}
      <section className="marketing-hero marketing-surface-white border-b border-slate-200">
        <div className="marketing-container">
          <div className="max-w-3xl">
            <div className="marketing-kicker mb-6">
              <LayoutGrid className="h-3 w-3" />
              The complete system
            </div>
            <h1 className="marketing-h1">
              Everything your front desk needs, in one place.
            </h1>
            <p className="marketing-lead mt-6 max-w-2xl">
              Clinic AI is not a chatbot you point at your website and forget.
              It is an operating system for your clinic&apos;s front desk — with a
              structured inbox, appointment tracking, staff review controls, AI training,
              and full operational visibility built in from the start.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/register" className="marketing-cta-primary">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/chat/demo" className="marketing-cta-secondary">
                <MessageSquareMore className="h-4 w-4 text-[#0F766E]" />
                Try live demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Platform overview strip */}
      <section className="marketing-section-tight marketing-surface-slate">
        <div className="marketing-container">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { icon: Inbox, label: "Operator inbox" },
              { icon: CalendarDays, label: "Appointments" },
              { icon: BrainCircuit, label: "AI training" },
              { icon: TriangleAlert, label: "Follow-up queue" },
              { icon: ContactRound, label: "Staff takeover" },
              { icon: LayoutGrid, label: "Operations view" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-white/80 bg-white px-4 py-4 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#CCFBF1] text-[#115E59]">
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="text-[0.9375rem] font-medium text-[#0F172A]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main>
        <div className="marketing-container">

          {/* Module deep-dives */}
          <div className="divide-y divide-[#E2E8F0]">
            {modules.map((mod, i) => (
              <section
                key={mod.name}
                className="marketing-section"
              >
                <div className={`grid items-center gap-10 xl:grid-cols-2 ${i % 2 === 1 ? "xl:grid-flow-dense" : ""}`}>
                  <div className={i % 2 === 1 ? "xl:col-start-2" : ""}>
                    <div className="marketing-kicker mb-5">
                      <mod.icon className="h-3 w-3" />
                      {mod.name}
                    </div>
                    <h2 className="marketing-h2">{mod.tagline}</h2>
                    <p className="marketing-lead mt-4">{mod.description}</p>
                    <ul className="mt-6 space-y-3">
                      {mod.details.map((detail) => (
                        <li key={detail} className="marketing-body flex items-start gap-3">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#CCFBF1] text-[#115E59]">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={`landing-shell p-7 ${i % 2 === 1 ? "xl:col-start-1 xl:row-start-1" : ""}`}>
                    <div className="marketing-icon-wrap mb-5 h-12 w-12">
                      <mod.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#0F172A]">{mod.name}</h3>
                    <p className="mt-2 text-sm text-[#64748B]">{mod.tagline}</p>
                    <div className="mt-6 space-y-2.5">
                      {mod.details.slice(0, 3).map((detail) => (
                        <div
                          key={detail}
                          className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-medium text-[#0F172A]"
                        >
                          <Check className="h-4 w-4 shrink-0 text-[#0F766E]" />
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* How it fits together */}
          <section className="marketing-section border-t border-[#E2E8F0]">
            <div className="mb-12 max-w-2xl">
              <div className="marketing-kicker mb-5">
                <Workflow className="h-3 w-3" />
                The complete picture
              </div>
              <h2 className="marketing-h2">
                How everything works together.
              </h2>
              <p className="marketing-lead mt-4">
                Every module connects. A patient conversation in the inbox can become an
                appointment, trigger a follow-up, surface a reminder, and be reviewed by
                staff — all without leaving the workspace.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "Patient reaches out",
                  body: "Chat or SMS message arrives in the operator inbox with full context.",
                },
                {
                  step: "02",
                  title: "AI handles the response",
                  body: "The assistant answers using your clinic setup and captures the patient's details.",
                },
                {
                  step: "03",
                  title: "Staff reviews if needed",
                  body: "Uncertain or sensitive threads are flagged. Staff can edit, reply, or take over.",
                },
                {
                  step: "04",
                  title: "Appointment is tracked",
                  body: "Booking status, reminders, and follow-up risk are all visible from the dashboard.",
                },
              ].map((item) => (
                <div key={item.step} className="marketing-card p-6">
                  <span className="text-3xl font-bold text-[#E2E8F0]">{item.step}</span>
                  <h3 className="mt-4 text-base font-semibold text-[#0F172A]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#475569]">{item.body}</p>
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
                    Ready to see it live?
                  </div>
                  <h2 className="mt-6 text-[clamp(1.875rem,2vw+1rem,2.75rem)] font-bold tracking-tight text-white">
                    Start your free trial today.
                  </h2>
                  <p className="mt-4 max-w-xl text-[1.125rem] leading-relaxed text-teal-100">
                    Set up in under 15 minutes. Test the assistant with your real clinic info. No credit card required.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row xl:flex-col xl:items-stretch">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-[1rem] font-semibold text-[#0F766E] shadow-lg transition-colors hover:bg-teal-50"
                  >
                    Start free — 14 days
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/trust"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-teal-300/50 bg-teal-800/40 px-8 py-4 text-[1rem] font-semibold text-white transition-colors hover:bg-teal-800/60"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Read our trust approach
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
