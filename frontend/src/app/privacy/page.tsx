import { ShieldCheck } from "lucide-react";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";

export default function PrivacyPage() {
  return (
    <div className="public-marketing-root">
      <PublicNav />
      <main className="marketing-container py-16 lg:py-20">
        <div className="max-w-3xl">
          <div className="marketing-kicker">
            <ShieldCheck className="h-3.5 w-3.5" />
            Privacy
          </div>
          <h1 className="mt-6 text-[clamp(2.4rem,3vw,4rem)] font-semibold tracking-[-0.055em] text-foreground">
            Privacy information in a clearer, calmer legal surface.
          </h1>
          <p className="mt-5 text-base leading-8 text-muted-foreground">
            This page explains privacy expectations for the Clinic AI product experience. The exact legal policy language should remain aligned with your organization’s approved policy text.
          </p>
        </div>

        <div className="mt-10 grid gap-4">
          {[
            ["Product data", "Clinic AI stores and processes workspace data needed to operate the frontend and product workflows."],
            ["Operational visibility", "Certain patient-facing interactions surface in the staff workspace so teams can review, follow up, and manage clinic operations."],
            ["Configuration ownership", "Clinics remain responsible for the information configured into services, hours, FAQs, and other business-specific settings."],
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
