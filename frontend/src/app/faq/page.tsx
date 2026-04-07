import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  CreditCard,
  MessageSquareMore,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";

export const metadata: Metadata = {
  title: "FAQ — Clinic AI",
  description:
    "Frequently asked questions about Clinic AI: setup, AI behavior, staff control, patient experience, booking, and billing.",
};

type FaqItem = { question: string; answer: string };
type FaqCategory = { icon: React.ComponentType<{ className?: string }>; label: string; items: FaqItem[] };

const categories: FaqCategory[] = [
  {
    icon: Settings,
    label: "Setup & onboarding",
    items: [
      {
        question: "How long does setup take?",
        answer:
          "Most clinics finish initial setup in under 15 minutes. You enter your clinic details, add your services and business hours, write a few common FAQs, and test the assistant with a live preview — all before going live. The guided onboarding flow walks you through each step.",
      },
      {
        question: "What information does the assistant need to work?",
        answer:
          "The assistant needs your clinic name, services with basic descriptions, business hours, and a short FAQ list to start. The more context you add, the more accurately it can answer patient questions. You can start minimal and add detail over time.",
      },
      {
        question: "Can I test the assistant before going live with patients?",
        answer:
          "Yes. During and after onboarding, you have access to a live assistant preview that behaves exactly as it would for patients. You can test any question and see how the assistant responds based on your configured information before adding it to your website or SMS.",
      },
      {
        question: "How do I add the assistant to my website?",
        answer:
          "After setup, you will receive an embed snippet — a small block of code — that you or a developer can paste into your website. The chat widget appears as a floating button. No external platform or plugin required.",
      },
    ],
  },
  {
    icon: BrainCircuit,
    label: "AI behavior",
    items: [
      {
        question: "What does the assistant do when it does not know the answer?",
        answer:
          "It holds the reply and flags the thread for staff review. The assistant does not guess, improvise, or generate a response it is not confident about. Your team sees the conversation and decides how to respond.",
      },
      {
        question: "Can the assistant provide medical advice?",
        answer:
          "No. Clinic AI is an administrative front-desk tool. It handles appointment requests, service questions, business hours, and general clinic information — not clinical advice, diagnoses, or treatment recommendations. Conversations that require clinical judgment are routed to staff.",
      },
      {
        question: "Where does the assistant get its information?",
        answer:
          "Exclusively from what you configure in your clinic workspace. The assistant does not draw on general internet knowledge, other clinics' setups, or any external sources. Responses are grounded only in your services, hours, FAQs, and internal notes.",
      },
      {
        question: "Can patients interact in languages other than English?",
        answer:
          "The assistant can respond to common conversational inputs in multiple languages, but the quality and accuracy of responses depends on the language of your clinic configuration. If your patients primarily speak another language, you should configure your clinic information in that language.",
      },
    ],
  },
  {
    icon: Users,
    label: "Staff control",
    items: [
      {
        question: "Can staff review and override AI responses?",
        answer:
          "Yes. Every conversation is visible in the operator inbox. Staff can review any thread, read the full message history, edit a suggested reply before it sends, take over a conversation entirely, or pause AI replies for any specific thread. Nothing is hidden from your team.",
      },
      {
        question: "How does staff takeover work?",
        answer:
          "When a staff member opens a thread and switches to takeover mode, the AI stops sending automated replies for that conversation. The staff member handles the exchange directly. When resolved, AI handling can be re-enabled for that thread.",
      },
      {
        question: "Can I pause the assistant entirely?",
        answer:
          "Yes. You can pause AI replies for an individual thread, for all new conversations, or disable the assistant entirely from your workspace settings. Pausing and resuming does not require a support ticket — it is self-serve.",
      },
      {
        question: "How many staff members can access the workspace?",
        answer:
          "Current plans support a single workspace login per clinic account. Multi-user access with role-based permissions is on the product roadmap. If this is a requirement for your clinic, contact us to discuss your specific needs.",
      },
    ],
  },
  {
    icon: MessageSquareMore,
    label: "Patient experience",
    items: [
      {
        question: "Do patients know they are talking to an AI assistant?",
        answer:
          "You decide. You control the assistant's name, the greeting message, and how handoff to a real person is presented. Many clinics choose a transparent disclosure — e.g., 'You are chatting with our automated assistant' — while others prefer a more neutral presentation. Transparent communication is the default behavior we recommend.",
      },
      {
        question: "What happens if a patient has a sensitive or urgent issue?",
        answer:
          "The assistant is designed to recognize when a conversation should not continue automatically. Sensitive topics, clinical concerns, and anything that falls outside the assistant's configured scope are flagged for immediate staff review. We always recommend that your contact information is visible to patients if they need direct human assistance.",
      },
      {
        question: "Is patient data visible to other clinics?",
        answer:
          "No. Patient conversations, contact details, and appointment records in your workspace are completely separate from other clinics. Your data is not shared, cross-referenced, or visible to anyone outside your account.",
      },
    ],
  },
  {
    icon: CalendarDays,
    label: "Booking & follow-up",
    items: [
      {
        question: "Does Clinic AI integrate with my scheduling system?",
        answer:
          "Clinic AI manages the communication and capture side of the booking workflow — taking requests, collecting patient details, and tracking appointment status. Direct calendar integration with external booking systems is not available in the current version. Appointment requests are tracked in the Clinic AI workspace and actioned by your staff.",
      },
      {
        question: "How do appointment reminders work?",
        answer:
          "The Professional and Premium plans include reminder readiness tracking in the appointments workspace. Your team can see which upcoming appointments have had reminder communication sent and which have not, making it easy to manage follow-up without a separate tool.",
      },
      {
        question: "What is the follow-up visibility feature?",
        answer:
          "The follow-up queue surfaces patient conversations that have gone quiet — requests that came in but were not progressed, missed callbacks, or booking discussions that stalled. Your team can see these from the dashboard and act before the patient moves on.",
      },
    ],
  },
  {
    icon: CreditCard,
    label: "Billing & account",
    items: [
      {
        question: "How does billing work?",
        answer:
          "Paid plans are billed monthly through Stripe. You can upgrade, downgrade, or cancel at any time from your billing settings. Cancellation takes effect at the end of your current billing period — you retain access until then.",
      },
      {
        question: "What happens at the end of my trial?",
        answer:
          "Your workspace and all configured data remain intact. You can upgrade to a paid plan at any time to continue operations. If you choose not to upgrade, your workspace moves to a read-only state but your data is not immediately deleted.",
      },
      {
        question: "Are there refunds?",
        answer:
          "If you cancel a paid plan within 7 days of your initial charge, contact us and we will process a full refund. After that period, refunds are handled case by case. We do not charge for months you have fully cancelled.",
      },
      {
        question: "Do you offer custom or enterprise pricing?",
        answer:
          "For multi-location clinics or organizations with specific requirements, contact us through the demo booking page. We can discuss custom arrangements that fit your scale.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC]">
      <PublicNav />

      {/* Hero */}
      <section className="border-b border-[#E2E8F0] bg-[#FFFFFF] px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-[1280px]">
          <div className="max-w-3xl">
            <div className="marketing-kicker mb-6">
              <ShieldCheck className="h-3 w-3" />
              Frequently asked questions
            </div>
            <h1 className="marketing-h1">
              Clear answers about how Clinic AI works.
            </h1>
            <p className="marketing-lead mt-6 max-w-2xl">
              Questions about setup, AI behavior, staff control, patient experience, and billing — answered directly, without marketing fluff.
            </p>
          </div>
        </div>
      </section>

      {/* Category jump nav */}
      <section className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <a
                key={cat.label}
                href={`#${cat.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-sm font-medium text-[#475569] transition-colors hover:border-[#CBD5E1] hover:text-[#0F172A]"
              >
                <cat.icon className="h-3.5 w-3.5 text-[#0F766E]" />
                {cat.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <main className="px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1280px]">

          <div className="divide-y divide-[#E2E8F0]">
            {categories.map((cat) => (
              <section
                key={cat.label}
                id={cat.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                className="marketing-section"
              >
                <div className="mb-8 flex items-center gap-3">
                  <div className="marketing-icon-wrap h-10 w-10">
                    <cat.icon className="h-4.5 w-4.5" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0F172A]">{cat.label}</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {cat.items.map((item) => (
                    <div key={item.question} className="marketing-card p-6">
                      <h3 className="text-sm font-semibold text-[#0F172A]">{item.question}</h3>
                      <p className="mt-2.5 text-sm leading-6 text-[#475569]">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Still have questions */}
          <section className="pb-16 sm:pb-24">
            <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-8 py-12 sm:px-12 shadow-sm">
              <div className="grid gap-8 xl:grid-cols-[1fr_auto] xl:items-center">
                <div>
                  <h2 className="text-2xl font-bold text-[#0F172A]">
                    Still have a question?
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[#475569]">
                    If you didn&apos;t find what you were looking for, book a short demo and we&apos;ll walk you through how Clinic AI works for your specific clinic type.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row xl:flex-col xl:items-start">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#115E59]"
                  >
                    Book a demo
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] px-6 py-3.5 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
                  >
                    <Sparkles className="h-4 w-4 text-[#0F766E]" />
                    Start free trial
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
