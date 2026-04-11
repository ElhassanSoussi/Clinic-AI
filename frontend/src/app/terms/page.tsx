import { ShieldCheck } from "lucide-react";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";

export default function TermsPage() {
  return (
    <div className="public-marketing-root">
      <PublicNav />
      <main className="marketing-container py-16 lg:py-20">
        <div className="max-w-3xl">
          <div className="marketing-kicker">
            <ShieldCheck className="h-3.5 w-3.5" />
            Terms
          </div>
          <h1 className="mt-6 text-[clamp(2.4rem,3vw,4rem)] font-semibold tracking-[-0.055em] text-foreground">
            Terms information presented with the same premium clarity as the rest of the product.
          </h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            This page is a reset-friendly legal shell. It keeps the route stable while giving the legal content a cleaner presentation layer.
          </p>
        </div>

        <div className="mt-10 grid gap-4">
          {[
            ["Use of service", "Clinic AI is intended for clinic operations and should be used according to applicable organizational and regulatory requirements."],
            ["Configuration responsibility", "The clinic is responsible for what it configures into business hours, service offerings, FAQs, and other patient-facing settings."],
            ["Operational judgment", "Clinic teams should review workflows and use operational judgment when handling patient communication and follow-up."],
          ].map(([title, body]) => (
            <section key={title} className="bg-card rounded-[1.9rem] p-6">
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
