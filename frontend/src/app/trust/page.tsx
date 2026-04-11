import { ShieldCheck, UserRoundCheck } from "lucide-react";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";

export default function TrustPage() {
  return (
    <div className="public-marketing-root">
      <PublicNav />
      <main className="marketing-container py-16 lg:py-20">
        <div className="max-w-3xl">
          <div className="marketing-kicker">
            <ShieldCheck className="h-3.5 w-3.5" />
            Trust
          </div>
          <h1 className="mt-6 text-[clamp(2.4rem,3vw,4rem)] font-bold tracking-[-0.055em] text-foreground">
            Calm patient-facing AI starts with explicit team visibility and grounded clinic context.
          </h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            Trust in Clinic AI comes from product structure: clear go-live controls, reviewable workflows, and an operating system designed for clinic teams instead of black-box automation theater.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {[
            {
              title: "Grounded responses",
              body: "The assistant is meant to answer from configured clinic information, not generic improvisation.",
            },
            {
              title: "Staff oversight",
              body: "Inbox, follow-up, and customer context stay visible to staff so intervention is straightforward when needed.",
            },
            {
              title: "Intentional launch",
              body: "The clinic chooses when to go live. Configuration, previewing, and publishing are separate on purpose.",
            },
          ].map((item) => (
            <article key={item.title} className="bg-card rounded-4xl p-6">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
                <UserRoundCheck className="h-4 w-4 text-primary" />
                {item.title}
              </div>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
