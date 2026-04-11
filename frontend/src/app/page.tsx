import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  MessageSquareMore,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";
import { MarketingProductWindow } from "@/components/marketing/MarketingProductWindow";

const featureCards = [
  {
    title: "Patient conversations",
    body: "Answer routine questions, capture intent, and keep every thread visible to staff.",
    icon: MessageSquareMore,
  },
  {
    title: "Appointment operations",
    body: "Booking requests, confirmations, reminders, and attention cases stay in one surface.",
    icon: CalendarDays,
  },
  {
    title: "Clinic control",
    body: "Settings, training, billing, and go-live controls share one clear operational system.",
    icon: Settings2,
  },
  {
    title: "Team visibility",
    body: "Inbox, leads, customers, and follow-up stay readable instead of scattered across tools.",
    icon: Users,
  },
];

const modules = [
  "Dashboard",
  "Inbox",
  "Leads",
  "Appointments",
  "Customers",
  "Operations",
  "Training",
  "Billing",
];

export default function HomePage() {
  return (
    <div className="public-marketing-root">
      <PublicNav />

      <main>
        <section className="border-b border-border/70">
          <div className="marketing-container px-0 py-18 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="marketing-kicker">
                <ShieldCheck className="h-3.5 w-3.5" />
                Front desk operating system for clinics
              </div>
              <h1 className="mt-6 text-[clamp(2.9rem,5vw,4.75rem)] font-bold leading-[0.96] tracking-[-0.06em] text-foreground">
                AI-powered patient conversations and clinic operations in one calm workspace.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
                Clinic AI combines patient chat, booking flow, follow-up, and staff operations in a system teams can actually trust and use every day.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link href="/register" className="app-btn app-btn-primary">
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/chat/demo" className="app-btn app-btn-secondary">
                  Try live demo
                </Link>
                <Link href="/product" className="app-btn app-btn-secondary">
                  See how it works
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                {["14-day free trial", "No credit card", "Setup in under 1 hour"].map((item) => (
                  <div key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-14">
              <MarketingProductWindow
                pathLabel="Dashboard - Bright Smile Dental"
                caption="The new page layer keeps the product readable under pressure: one sidebar, one workbench, one source of truth for patient operations."
              >
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    {[
                      ["24", "New conversations"],
                      ["8", "Booked today"],
                      ["12", "Active leads"],
                      ["94%", "AI accuracy"],
                    ].map(([value, label]) => (
                      <div key={label} className="rounded-[0.95rem] border border-border/80 bg-card p-4">
                        <p className="text-2xl font-bold tracking-[-0.04em] text-foreground">{value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-[0.95rem] border border-border/80 bg-card p-5">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-foreground">Recent activity</p>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        New appointment: Sarah J. - Thu 2:00 PM
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Lead captured: Michael B. - Teeth whitening
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        Reminder sent: Lisa A. - Appointment tomorrow
                      </div>
                    </div>
                  </div>
                </div>
              </MarketingProductWindow>
            </div>
          </div>
        </section>

        <section className="marketing-container py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="marketing-kicker">
              <Sparkles className="h-3.5 w-3.5" />
              What Clinic AI does
            </div>
            <h2 className="mt-5 text-[clamp(2rem,3vw,3.1rem)] font-bold tracking-[-0.05em] text-foreground">
              A complete system for patient communication and clinic operations.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {featureCards.map((item) => (
              <article key={item.title} className="rounded-xl border border-border/90 bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="marketing-section-alt">
          <div className="marketing-container py-16 lg:py-20">
            <div className="max-w-3xl text-center lg:mx-auto">
              <h2 className="text-[clamp(2rem,3vw,3rem)] font-bold tracking-[-0.05em] text-foreground">
                Simple setup, powerful automation, complete control.
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                Configure the clinic, connect your channels, and go live with clear staff oversight.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                ["Starter Trial", "Use the real workspace free for 14 days while you configure and evaluate fit."],
                ["Professional", "Move into the operational plan for clinics running an active front desk."],
                ["Premium", "Expand into higher-volume usage and broader operational control."],
              ].map(([name, detail]) => (
                <div key={name} className="rounded-xl border border-border/90 bg-card p-6 shadow-[var(--shadow-soft)]">
                  <p className="panel-section-head">{name}</p>
                  <p className="mt-3 text-3xl font-bold tracking-[-0.05em] text-foreground">
                    {name === "Starter Trial" ? "$0" : name === "Professional" ? "$49" : "$99"}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                ["1", "Configure your clinic", "Add services, hours, policies, and core clinic information in under an hour."],
                ["2", "Connect your channels", "Embed chat, prepare messaging, and preview exactly what patients will see."],
                ["3", "Go live with oversight", "Let AI handle routine questions while staff keeps visibility and control."],
              ].map(([step, title, body]) => (
                <div key={title} className="rounded-xl border border-border/90 bg-card p-6 text-center shadow-[var(--shadow-soft)]">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">
                    {step}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="marketing-container py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="marketing-kicker">
              <Settings2 className="h-3.5 w-3.5" />
              Built for clinic operations
            </div>
            <h2 className="mt-5 text-[clamp(2rem,3vw,3rem)] font-bold tracking-[-0.05em] text-foreground">
              Everything the team needs lives in one product family.
            </h2>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {modules.map((module) => (
              <div key={module} className="rounded-lg border border-border/90 bg-card p-5 shadow-[var(--shadow-soft)]">
                <p className="text-sm font-semibold text-foreground">{module}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Clear structure, shared hierarchy, and real product context.
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-4">
            {[
              ["How is Clinic AI different from a simple chatbot?", "The product is built around the clinic workspace, not just the patient chat."],
              ["Can staff take over conversations?", "Yes. Teams can review, intervene, and follow up from the same environment."],
              ["What do we configure before going live?", "Clinic basics, services, hours, notifications, and assistant knowledge."],
            ].map(([question, answer]) => (
              <div key={question} className="rounded-xl border border-border/90 bg-card p-6 shadow-[var(--shadow-soft)]">
                <p className="text-base font-semibold text-foreground">{question}</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{answer}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
