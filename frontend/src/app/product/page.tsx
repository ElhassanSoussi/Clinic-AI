import Link from "next/link";
import { ArrowRight, Inbox, LayoutGrid, Settings2, Sparkles } from "lucide-react";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";
import { MarketingProductWindow } from "@/components/marketing/MarketingProductWindow";

const sections = [
  {
    title: "Dashboard as command center",
    body: "Clinic AI starts with an operational overview instead of a wallpaper of cards. Status, bookings, follow-up load, and launch readiness are grouped intentionally.",
    icon: LayoutGrid,
  },
  {
    title: "Inbox and workbench surfaces",
    body: "Conversation work lives in a dedicated workspace that balances list scanning, context, and next actions without wasted layout space.",
    icon: Inbox,
  },
  {
    title: "Settings that lead",
    body: "Configuration is structured like a premium control center instead of a long generic form stack.",
    icon: Settings2,
  },
];

export default function ProductPage() {
  return (
    <div className="public-marketing-root">
      <PublicNav />
      <main>
        <section className="marketing-container py-16 lg:py-20">
          <div className="max-w-3xl">
            <div className="marketing-kicker">
              <Sparkles className="h-3.5 w-3.5" />
              Product architecture
            </div>
            <h1 className="mt-6 text-[clamp(2.5rem,3vw,4.4rem)] font-bold tracking-[-0.055em] text-app-text">
              Rebuilt from the page layer up for clinic operations.
            </h1>
            <p className="mt-5 text-base leading-8 text-app-text-secondary">
              The new frontend is calmer, clearer, and more disciplined: one family across marketing, auth, onboarding, dashboard, chat, and control surfaces.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {sections.map((section) => (
              <article key={section.title} className="panel-surface rounded-4xl p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-primary/10 text-app-primary">
                  <section.icon className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-xl font-bold tracking-[-0.04em] text-app-text">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-app-text-muted">{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="marketing-container grid gap-8 pb-16 lg:grid-cols-2 lg:pb-20">
          <MarketingProductWindow pathLabel="/dashboard/inbox" caption="Operational pages are framed like workbenches, not disconnected templates.">
            <div className="grid gap-4">
              <div className="panel-surface rounded-3xl p-4">
                <p className="text-sm font-bold text-app-text">Inbox hierarchy</p>
                <p className="mt-2 text-sm text-app-text-muted">
                  Status bands, channel context, and staff actions are visible without collapsing into tiny gray text or dead space.
                </p>
              </div>
              <div className="panel-surface rounded-3xl p-4">
                <p className="text-sm font-bold text-app-text">Clear detail surfaces</p>
                <p className="mt-2 text-sm text-app-text-muted">
                  Related request context, message timeline, and action state stay organized around the same conversation.
                </p>
              </div>
            </div>
          </MarketingProductWindow>

          <MarketingProductWindow pathLabel="/dashboard/settings" caption="Settings, billing, and training share the same premium control-center family.">
            <div className="grid gap-4">
              <div className="panel-surface rounded-3xl p-4">
                <p className="text-sm font-bold text-app-text">Configuration leadership</p>
                <p className="mt-2 text-sm text-app-text-muted">
                  Sections lead with what matters most, then keep supporting controls nearby instead of buried.
                </p>
              </div>
              <div className="panel-surface rounded-3xl p-4">
                <p className="text-sm font-bold text-app-text">Consistent surface language</p>
                <p className="mt-2 text-sm text-app-text-muted">
                  Marketing, app, and patient-facing routes all feel related without becoming sterile or generic.
                </p>
              </div>
            </div>
          </MarketingProductWindow>
        </section>

        <section className="marketing-container pb-16 lg:pb-20">
          <div className="panel-surface rounded-[2.3rem] px-8 py-10 text-center">
            <h2 className="text-[clamp(2rem,2.5vw,3.2rem)] font-bold tracking-[-0.05em] text-app-text">
              See the product with a live preview or open your workspace.
            </h2>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/chat/demo" className="app-btn app-btn-secondary">
                Try live demo
              </Link>
              <Link href="/register" className="app-btn app-btn-primary">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
