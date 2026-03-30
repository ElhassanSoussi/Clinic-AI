import type { Metadata } from "next";
import Link from "next/link";
import { Bot, ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Terms of Service — Clinic AI" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-slate-900">Clinic AI</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>

        <div className="prose prose-slate prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">1. Acceptance of Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              By accessing or using Clinic AI, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">2. Service Description</h2>
            <p className="text-slate-600 leading-relaxed">
              Clinic AI provides an AI-powered front desk assistant for clinics. The service includes a chat widget for patient intake, a lead management dashboard, email notifications, and optional Google Sheets integration.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">3. Not Medical Advice</h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              Clinic AI is strictly an administrative intake tool. It does not provide medical advice, diagnosis, treatment, or clinical recommendations of any kind.
              Clinic owners are responsible for ensuring that AI responses configured through the platform are accurate and appropriate.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">4. Account Responsibilities</h2>
            <p className="text-slate-600 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.
              You agree to provide accurate clinic information and keep your settings up to date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">5. Billing &amp; Subscriptions</h2>
            <p className="text-slate-600 leading-relaxed">
              Paid plans are billed monthly through Stripe. You may cancel at any time through the billing portal.
              Refunds are handled on a case-by-case basis. Free trials do not require a credit card.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">6. Acceptable Use</h2>
            <p className="text-slate-600 leading-relaxed">
              You agree not to misuse the platform, including but not limited to: using it for non-clinic purposes, attempting to circumvent usage limits, or configuring the AI to provide medical advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">7. Limitation of Liability</h2>
            <p className="text-slate-600 leading-relaxed">
              Clinic AI is provided &quot;as is&quot; without warranties of any kind. We are not liable for missed appointments, incorrect AI responses, or any damages arising from use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">8. Termination</h2>
            <p className="text-slate-600 leading-relaxed">
              We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">9. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              For questions about these terms, please visit our{" "}
              <Link href="/contact" className="text-teal-600 hover:text-teal-700 underline">contact page</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
