import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ContactRound,
  Eye,
  FileText,
  LayoutGrid,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";

export const metadata: Metadata = {
  title: "Trust — Clinic AI",
  description:
    "How Clinic AI keeps your clinic in control: human oversight, grounded answers, staff takeover, and full conversation traceability.",
};

const principles = [
  {
    icon: ShieldCheck,
    title: "Human oversight is a first-class feature",
    body: "Every Clinic AI workspace is built around the assumption that your staff must be able to see, review, and override anything the assistant does. There is no mode where the assistant operates invisibly or without accountability.",
    points: [
      "Staff can view every AI-handled conversation",
      "Any thread can be taken over manually at any time",
      "AI replies can be paused for a specific thread or entirely",
      "Suggested replies can be edited before sending",
    ],
  },
  {
    icon: BrainCircuit,
    title: "Answers are grounded in your clinic information",
    body: "The assistant does not draw on general internet knowledge, other clinics' data, or improvised responses. Every answer is based on the services, hours, FAQs, and notes you configure. Nothing outside that scope is referenced.",
    points: [
      "Responses reference only what you have configured",
      "No external sources, no borrowed content from other setups",
      "Services, hours, FAQs, and notes are the only inputs",
      "You can update clinic info at any time and test immediately",
    ],
  },
  {
    icon: ContactRound,
    title: "The assistant holds uncertain replies",
    body: "When the assistant encounters a question it cannot confidently answer based on your clinic setup, it does not guess. It pauses the thread and flags it for staff review. Your team sees the conversation and decides how to respond.",
    points: [
      "Low-confidence threads are flagged automatically",
      "Staff are notified so nothing waits unattended",
      "The assistant does not fabricate or extrapolate answers",
      "Patient receives an honest response, not a risky guess",
    ],
  },
  {
    icon: Eye,
    title: "Full traceability — every message, every action",
    body: "Nothing the assistant does is hidden. Every patient message, every AI-generated reply, every staff edit, takeover, or manual note is logged and visible from the workspace. You can audit the full history of any conversation at any time.",
    points: [
      "Complete message history with author labels",
      "AI vs. staff-authored replies clearly distinguished",
      "Takeover events and timing are recorded",
      "No automatic deletion or hidden truncation of history",
    ],
  },
  {
    icon: LayoutGrid,
    title: "Your clinic information is not shared",
    body: "The clinic data you configure — services, FAQs, internal notes, patient communication — is used exclusively to operate your assistant. It is not shared with other clinics, used to train shared models, or available to any third party for profiling purposes.",
    points: [
      "Clinic data powers your assistant only",
      "Not shared across clinics or used for cross-clinic training",
      "Patient conversations are stored only to serve your workspace",
      "Third-party integrations are disclosed and limited in scope",
    ],
  },
  {
    icon: FileText,
    title: "Responsible behavior when patients are at risk",
    body: "Clinic AI is an administrative front-desk tool. It handles appointment requests, FAQs, and scheduling communication. It does not provide medical advice, clinical assessments, or diagnoses. When a conversation involves patient safety or clinical judgment, the assistant routes to staff.",
    points: [
      "No medical advice, diagnosis, or clinical guidance",
      "Safety-sensitive conversations are flagged for human review",
      "The assistant is clear about its role and limits",
      "Clinic owner is responsible for the accuracy of configured content",
    ],
  },
];

export default function TrustPage() {
  return (
    <div className="public-marketing-root">
      <PublicNav />

      {/* Hero */}
      <section className="marketing-hero marketing-surface-white border-b border-slate-200">
        <div className="marketing-container">
          <div className="max-w-3xl">
            <div className="marketing-kicker mb-6">
              <ShieldCheck className="h-3 w-3" />
              Trust &amp; safety
            </div>
            <h1 className="marketing-h1">
              Built for clinics that need to trust their tools.
            </h1>
            <p className="marketing-lead mt-6 max-w-2xl">
              Adopting an AI system for patient communication is a serious decision.
              This page explains exactly how Clinic AI approaches oversight, data handling,
              and responsible behavior — so you can make an informed choice.
            </p>
            <p className="mt-5 max-w-2xl text-[0.9375rem] leading-relaxed text-slate-600">
              These commitments show up as real controls after you sign in: conversation review in{" "}
              <span className="font-mono text-[0.8125rem] text-slate-700">/dashboard/inbox</span>, clinic facts and go-live in Settings and AI Training, and a full activity trail you can audit from the workspace — not policy text detached from the product.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/register" className="marketing-cta-primary">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/product" className="marketing-cta-secondary">
                How the product works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust principles overview strip */}
      <section className="marketing-section-tight marketing-surface-slate">
        <div className="marketing-container">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { icon: ShieldCheck, label: "Human oversight built in" },
              { icon: BrainCircuit, label: "Grounded in your clinic data" },
              { icon: ContactRound, label: "Uncertain replies are held" },
              { icon: Eye, label: "Full conversation traceability" },
              { icon: LayoutGrid, label: "Your data is not shared" },
              { icon: FileText, label: "No medical advice, ever" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-white/80 bg-white px-5 py-4 shadow-sm"
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

          {/* Principles */}
          <div className="divide-y divide-[#E2E8F0]">
            {principles.map((p) => (
              <section key={p.title} className="marketing-section">
                <div className="grid items-start gap-10 xl:grid-cols-[1fr_1fr]">
                  <div>
                    <div className="marketing-icon-wrap mb-5 h-12 w-12">
                      <p.icon className="h-6 w-6" />
                    </div>
                    <h2 className="marketing-h2">{p.title}</h2>
                    <p className="marketing-lead mt-4">{p.body}</p>
                  </div>
                  <div className="landing-shell p-7">
                    <p className="ds-eyebrow text-[#64748B]">
                      What this means in practice
                    </p>
                    <ul className="mt-5 space-y-3">
                      {p.points.map((point) => (
                        <li key={point} className="marketing-body flex items-start gap-3">
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#CCFBF1] text-[#115E59]">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            ))}
          </div>

          {/* Data note */}
          <section className="marketing-section border-t border-[#E2E8F0]">
            <div className="rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-8 sm:p-10">
              <div className="max-w-3xl">
                <div className="marketing-kicker mb-5">
                  <Eye className="h-3 w-3" />
                  Data handling
                </div>
                <h2 className="marketing-h2 text-[clamp(1.5rem,1.5vw+1rem,2rem)]">
                  How your clinic&apos;s data is handled.
                </h2>
                <div className="mt-6 space-y-4 marketing-body">
                  <p>
                    Your clinic configuration data — services, FAQs, business hours, internal notes — is stored securely and used exclusively to train and operate your clinic&apos;s assistant. It is not shared with other clinics, and it is not used to train any shared model.
                  </p>
                  <p>
                    Patient conversation data — messages, contact details, appointment requests — is stored to power your workspace. It is only accessible to users in your clinic account. Patient data is not sold or shared for advertising, marketing, or profiling.
                  </p>
                  <p>
                    Third-party services used to operate the platform include OpenAI (AI response generation), Supabase (database and authentication), Stripe (billing), and Resend (email notifications). Each service has their own privacy policy governing their use of data.
                  </p>
                  <p>
                    Clinic AI does not claim HIPAA Business Associate status. If your clinic handles protected health information, you are responsible for assessing the compliance requirements applicable to your specific jurisdiction and use case.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/privacy"
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F1F5F9]"
                  >
                    <FileText className="h-4 w-4 text-[#0F766E]" />
                    Privacy policy
                  </Link>
                  <Link
                    href="/terms"
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F1F5F9]"
                  >
                    <FileText className="h-4 w-4 text-[#0F766E]" />
                    Terms of service
                  </Link>
                </div>
              </div>
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
                    Start with confidence
                  </div>
                  <h2 className="mt-6 text-[clamp(1.875rem,2vw+1rem,2.75rem)] font-bold tracking-tight text-white">
                    Designed to earn your trust, not just ask for it.
                  </h2>
                  <p className="mt-4 max-w-xl text-[1.125rem] leading-relaxed text-teal-100">
                    Try the full platform free for 14 days. No credit card required. Your staff is in control from day one.
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
