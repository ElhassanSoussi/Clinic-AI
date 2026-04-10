import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";
import { MarketingProductWindow } from "@/components/marketing/MarketingProductWindow";

const productColumns = [
  {
    title: "One shared front desk",
    body: "Inbox, leads, appointments, follow-up, and operations live in one calm workspace instead of disconnected tools.",
    icon: Users,
  },
  {
    title: "Grounded, reviewable AI",
    body: "The assistant answers from your clinic data and keeps the team in control of every patient-facing workflow.",
    icon: ShieldCheck,
  },
  {
    title: "Configured for real clinics",
    body: "Hours, services, FAQs, reminders, and go-live controls are all designed for the operational details that matter.",
    icon: Sparkles,
  },
];

const plans = [
  { name: "Starter Trial", price: "$0", detail: "14 days", body: "Get the real workspace without a card." },
  { name: "Professional", price: "$49", detail: "per month", body: "Built for active clinic operations." },
  { name: "Premium", price: "$99", detail: "per month", body: "For higher-volume teams that need more control." },
];

const faqs = [
  {
    question: "Does this replace our staff?",
    answer:
      "No. Clinic AI is designed to reduce front-desk load, surface context faster, and let staff step in whenever needed.",
  },
  {
    question: "Can we test the assistant before going live?",
    answer:
      "Yes. Every workspace includes a direct chat preview and embed flow so the clinic can test before publishing.",
  },
  {
    question: "Is this only for web chat?",
    answer:
      "The core workspace covers web chat first, with operational support for SMS and follow-up workflows where configured.",
  },
];

export default function HomePage() {
  return (
    <div className="public-marketing-root">
      <PublicNav />

      <main>
        <section className="border-b border-white/60">
          <div className="marketing-container grid gap-14 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
            <div>
              <div className="marketing-kicker">
                <ShieldCheck className="h-3.5 w-3.5" />
                Premium front-desk operating system
              </div>
              <h1 className="mt-6 text-[clamp(2.9rem,5vw,5.4rem)] font-bold leading-[0.96] tracking-[-0.06em] text-app-text">
                A calmer way to run patient conversations, bookings, and follow-through.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-app-text-secondary">
                Clinic AI gives teams a clear operating surface for AI-assisted chat, booking requests,
                follow-up, and front-desk visibility. Clean enough for patients, strong enough for staff.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="app-btn app-btn-primary">
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/chat/demo" className="app-btn app-btn-secondary">
                  Try live demo
                  <MessageSquareMore className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {[
                  ["Shared inbox", "Every patient conversation visible to the whole team."],
                  ["Booking clarity", "Track requests, appointments, reminders, and next steps."],
                  ["Launch control", "Configure, preview, and go live with intent."],
                ].map(([title, body]) => (
                  <div key={title} className="panel-surface rounded-3xl p-5">
                    <p className="text-sm font-bold text-app-text">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-app-text-muted">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <MarketingProductWindow
              pathLabel="/dashboard"
              caption="The workspace is built to feel composed under pressure: clear hierarchy, faster scanning, and real operational context."
            >
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="panel-surface rounded-3xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-app-text-muted">
                        Today
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-app-text">
                        Command center
                      </h2>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Live
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      ["18", "Open conversations"],
                      ["7", "Booking requests"],
                      ["92%", "Readiness"],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-2xl border border-app-border/70 bg-white/70 p-4">
                        <p className="text-2xl font-semibold tracking-[-0.04em] text-app-text">{value}</p>
                        <p className="mt-1 text-sm text-app-text-muted">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="panel-surface rounded-3xl p-5">
                    <p className="text-sm font-semibold text-app-text">Inbox pressure</p>
                    <p className="mt-2 text-sm leading-6 text-app-text-muted">
                      Follow-up, manual takeover, and booked outcomes stay visible without making the page feel noisy.
                    </p>
                  </div>
                  <div className="panel-surface rounded-3xl p-5">
                    <p className="text-sm font-semibold text-app-text">Appointments</p>
                    <p className="mt-2 text-sm leading-6 text-app-text-muted">
                      Confirmed, cancelled, and reminder-dependent work stays grouped into a real operational surface.
                    </p>
                  </div>
                </div>
              </div>
            </MarketingProductWindow>
          </div>
        </section>

        <section id="product" className="marketing-section-alt border-b border-white/60">
          <div className="marketing-container py-16 lg:py-20">
            <div className="max-w-3xl">
              <div className="marketing-kicker">
                <Sparkles className="h-3.5 w-3.5" />
                Product
              </div>
              <h2 className="mt-5 text-[clamp(2rem,3vw,3.25rem)] font-bold tracking-[-0.05em] text-app-text">
                Built for real clinic workflows, not generic AI demos.
              </h2>
              <p className="mt-4 text-lg leading-8 text-app-text-secondary">
                Every surface in the workspace is designed around how clinic teams actually operate: fast scanning,
                clear hierarchy, and operational context that stays visible under pressure.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {productColumns.map((item) => (
                <article key={item.title} className="panel-surface rounded-4xl p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-primary/10 text-app-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-bold tracking-[-0.04em] text-app-text">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-app-text-muted">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-b border-white/60">
          <div className="marketing-container py-16 lg:py-20">
            <div className="max-w-2xl">
              <div className="marketing-kicker">
                <CalendarDays className="h-3.5 w-3.5" />
                Pricing
              </div>
              <h2 className="mt-5 text-[clamp(2rem,3vw,3.1rem)] font-bold tracking-[-0.05em] text-app-text">
                Clear plans for evaluation, launch, and scale.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {plans.map((plan, index) => (
                <article
                  key={plan.name}
                  className={`panel-surface rounded-4xl p-7 ${index === 1 ? "ring-1 ring-app-primary/30 shadow-[0_28px_60px_-34px_rgba(15,143,131,0.45)]" : ""}`}
                >
                  <p className="panel-section-head">{plan.name}</p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-[-0.06em] text-app-text">
                      {plan.price}
                    </span>
                    <span className="text-sm text-app-text-muted">{plan.detail}</span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-app-text-muted">{plan.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="marketing-section-alt">
          <div className="marketing-container py-16 lg:py-20">
            <div className="max-w-2xl">
              <div className="marketing-kicker">
                <CheckCircle2 className="h-3.5 w-3.5" />
                FAQ
              </div>
              <h2 className="mt-5 text-[clamp(2rem,3vw,3rem)] font-bold tracking-[-0.05em] text-app-text">
                Questions teams ask before they replace a patchwork of tools.
              </h2>
            </div>
            <div className="mt-10 grid gap-4">
              {faqs.map((item) => (
                <article key={item.question} className="panel-surface rounded-[1.75rem] p-6">
                  <h3 className="text-lg font-bold tracking-[-0.03em] text-app-text">{item.question}</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-app-text-muted">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
