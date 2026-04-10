import { CheckCircle2, HelpCircle } from "lucide-react";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";

const faqs = [
  {
    question: "How is Clinic AI different from a simple website chatbot?",
    answer:
      "The product is built around the clinic workspace, not just the patient chat. Inbox, leads, appointments, activity, settings, and training all share one operating layer.",
  },
  {
    question: "Can our staff take over conversations?",
    answer:
      "Yes. The workspace is designed around visibility and control, so teams can review, take over, or follow up from the same environment.",
  },
  {
    question: "What do we configure before going live?",
    answer:
      "Core clinic information, services, hours, FAQs, notifications, and any workflow settings the assistant should rely on.",
  },
  {
    question: "Do we have to change our back-end systems?",
    answer:
      "No. This reset preserves the existing routes, auth behavior, and product contracts while rebuilding the frontend presentation layer.",
  },
];

export default function FaqPage() {
  return (
    <div className="public-marketing-root">
      <PublicNav />
      <main className="marketing-container py-16 lg:py-20">
        <div className="max-w-3xl">
          <div className="marketing-kicker">
            <HelpCircle className="h-3.5 w-3.5" />
            FAQ
          </div>
          <h1 className="mt-6 text-[clamp(2.4rem,3vw,4rem)] font-bold tracking-[-0.055em] text-app-text">
            Practical answers about launch, workflow, and team control.
          </h1>
        </div>

        <div className="mt-10 grid gap-4">
          {faqs.map((item) => (
            <article key={item.question} className="panel-surface rounded-4xl p-6">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-app-text">
                <CheckCircle2 className="h-4 w-4 text-app-primary" />
                {item.question}
              </div>
              <p className="mt-3 text-sm leading-7 text-app-text-muted">{item.answer}</p>
            </article>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
