import type { Metadata } from "next";
import Link from "next/link";
import { Bot, ArrowLeft, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy — Clinic AI",
  description: "How Clinic AI collects, uses, stores, and protects your data.",
};

const lastUpdated = "April 2025";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Nav */}
      <nav className="border-b border-[#E2E8F0] bg-[#FFFFFF]">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F766E]">
              <Bot className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-[#0F172A]">Clinic AI</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-5 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#CCFBF1] text-[#115E59]">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
              Legal
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Last updated: {lastUpdated}
          </p>
          <p className="mt-4 text-sm leading-7 text-[#475569]">
            This Privacy Policy describes how Clinic AI (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the platform&rdquo;) collects, uses, stores, and protects information when you use our service. By using Clinic AI, you agree to the practices described in this policy.
          </p>
        </div>

        <div className="space-y-10">

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">1. Who this policy applies to</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                This policy applies to two categories of people:
              </p>
              <p>
                <strong className="font-semibold text-[#0F172A]">Clinic operators</strong> — clinic owners, administrators, and staff who create and manage a Clinic AI account. You directly input data into the platform and are responsible for how you configure the assistant.
              </p>
              <p>
                <strong className="font-semibold text-[#0F172A]">Patients</strong> — individuals who interact with an AI chat widget or SMS channel powered by Clinic AI, as deployed by a clinic operator. Patients interact with the platform indirectly, through a clinic&apos;s deployment.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">2. Information we collect</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p><strong className="font-semibold text-[#0F172A]">From clinic operators:</strong></p>
              <ul className="ml-4 list-disc space-y-1.5">
                <li>Account registration information: name, email address, clinic name, password.</li>
                <li>Clinic configuration data: services, business hours, FAQ content, internal notes, branding preferences.</li>
                <li>Billing information: processed by Stripe. We do not store payment card details.</li>
                <li>Usage data: actions taken in the workspace, feature usage, session information.</li>
              </ul>
              <p className="mt-3"><strong className="font-semibold text-[#0F172A]">From patients (via deployed chat or SMS):</strong></p>
              <ul className="ml-4 list-disc space-y-1.5">
                <li>Information voluntarily shared during a conversation: name, phone number, email address, reason for inquiry.</li>
                <li>Conversation content: the full text of messages exchanged through the assistant.</li>
                <li>Session metadata: approximate timestamps, channel (web or SMS), session identifiers.</li>
              </ul>
              <p className="mt-3">
                We do not collect sensitive health or medical information as part of the platform&apos;s core function. Clinic AI is an administrative scheduling tool — if a patient volunteers sensitive health information in a conversation, it is treated as general conversation data within that operator&apos;s workspace.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">3. How we use your information</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>We use collected information for the following purposes:</p>
              <ul className="ml-4 list-disc space-y-1.5">
                <li>Operating and delivering the Clinic AI platform and its features.</li>
                <li>Generating AI assistant responses based on clinic-configured content.</li>
                <li>Processing billing and managing subscription plans.</li>
                <li>Sending account and system notifications (e.g. new leads, appointment updates).</li>
                <li>Improving and debugging the platform.</li>
                <li>Responding to support requests.</li>
              </ul>
              <p className="mt-3">
                We do not sell personal information. We do not share personal information with third parties for marketing, advertising, or profiling purposes.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">4. Third-party services</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                Clinic AI uses third-party infrastructure providers to operate the platform. Data may be processed by the following services:
              </p>
              <ul className="ml-4 list-disc space-y-1.5">
                <li><strong className="font-semibold text-[#0F172A]">OpenAI</strong> — used to generate AI assistant responses. Patient conversation context is sent to OpenAI&apos;s API as part of response generation. OpenAI&apos;s data usage policies apply.</li>
                <li><strong className="font-semibold text-[#0F172A]">Supabase</strong> — used for database hosting and authentication. Data is stored in Supabase-managed infrastructure.</li>
                <li><strong className="font-semibold text-[#0F172A]">Stripe</strong> — used for billing and payment processing. Stripe handles all payment card data under their own PCI-compliant systems.</li>
                <li><strong className="font-semibold text-[#0F172A]">Resend</strong> — used for transactional email delivery (e.g. account notifications, lead alerts).</li>
                <li><strong className="font-semibold text-[#0F172A]">Google Sheets</strong> — optionally used by clinic operators to export lead and patient data. Enabled only when the operator configures this integration.</li>
              </ul>
              <p className="mt-3">
                Each service has its own privacy policy. We select providers that meet reasonable data protection standards and limit data shared with each service to what is operationally necessary.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">5. Data storage and security</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                Data is stored using industry-standard practices, including encryption in transit (HTTPS/TLS) and at-rest encryption through our database provider. Access to production data is restricted to authorized personnel.
              </p>
              <p>
                We take reasonable technical and organizational measures to protect data against unauthorized access, loss, or misuse. No system is perfectly secure, and we cannot guarantee absolute security.
              </p>
              <p>
                Clinic AI does not currently hold HIPAA Business Associate Agreement (BAA) status. Clinic operators who process protected health information (PHI) under HIPAA are responsible for assessing whether Clinic AI is appropriate for their specific compliance requirements.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">6. Data isolation between clinics</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                Each clinic account is isolated. Clinic configuration data, patient conversations, and operator information from one account are not visible to, shared with, or used to train any other clinic account. Data from your clinic is not cross-referenced with or used to benefit any other operator.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">7. Data retention and deletion</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                We retain account and conversation data for as long as your account is active and for a reasonable period after cancellation to support data recovery and export requests.
              </p>
              <p>
                Clinic operators can delete individual patient records from the workspace dashboard. To request deletion of your full account and all associated data, contact us through the contact page. We will process account deletion requests within a reasonable timeframe.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">8. Medical disclaimer</h2>
            <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 text-sm leading-7 text-[#475569]">
              <p className="font-medium text-[#0F172A]">
                Clinic AI is an administrative intake and scheduling tool only.
              </p>
              <p className="mt-2">
                It does not provide medical advice, clinical assessments, diagnoses, or treatment recommendations. All AI-generated responses are limited to appointment scheduling, FAQ answers, and general clinic information as configured by the clinic operator. No communication through Clinic AI should be interpreted as clinical or medical guidance.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">9. Cookies and tracking</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                Clinic AI uses cookies and similar technologies for authentication (keeping you logged in) and basic platform functionality. We do not use advertising cookies or third-party behavioral tracking on the main platform.
              </p>
              <p>
                The public marketing website may use basic analytics to understand traffic patterns. No personally identifiable information is collected through these analytics.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">10. Changes to this policy</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                We may update this policy as the platform evolves. Material changes will be communicated to registered clinic operators via email. The date at the top of this page reflects the most recent update. Continued use of the platform after a policy update constitutes acceptance of the revised terms.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">11. Contact</h2>
            <div className="mt-3 text-sm leading-7 text-[#475569]">
              <p>
                For questions, concerns, or data requests related to this privacy policy, please use the{" "}
                <Link href="/contact" className="font-medium text-[#0F766E] hover:text-[#115E59]">
                  contact page
                </Link>
                .
              </p>
            </div>
          </section>

        </div>

        <div className="mt-12 border-t border-[#E2E8F0] pt-8">
          <div className="flex flex-wrap gap-4 text-sm text-[#64748B]">
            <Link href="/terms" className="hover:text-[#0F172A]">Terms of Service</Link>
            <Link href="/trust" className="hover:text-[#0F172A]">Trust &amp; Safety</Link>
            <Link href="/" className="hover:text-[#0F172A]">Back to home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
