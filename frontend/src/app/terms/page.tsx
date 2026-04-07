import type { Metadata } from "next";
import Link from "next/link";
import { Bot, ArrowLeft, FileText } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service — Clinic AI",
  description: "The terms and conditions governing use of the Clinic AI platform.",
};

const lastUpdated = "April 2025";

export default function TermsPage() {
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
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
              Legal
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-[#94A3B8]">
            Last updated: {lastUpdated}
          </p>
          <p className="mt-4 text-sm leading-7 text-[#475569]">
            These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the Clinic AI platform. By creating an account or using the service, you agree to be bound by these Terms. If you do not agree, do not use the platform.
          </p>
        </div>

        <div className="space-y-10">

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">1. About the service</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                Clinic AI is an AI-powered front-desk operating system for clinics and private practices. The platform provides an AI chat assistant, an operator inbox, appointment tracking, patient lead capture, staff review controls, and related front-desk workflow tools.
              </p>
              <p>
                The platform is made available to clinic operators — businesses and individuals who create an account to configure and deploy the service for their own clinic operations. Clinic operators are responsible for how they configure and use the platform, including the accuracy of clinic information they provide.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">2. Not medical advice</h2>
            <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 text-sm leading-7 text-[#475569]">
              <p className="font-semibold text-[#0F172A]">
                Clinic AI is strictly an administrative intake and scheduling tool.
              </p>
              <p className="mt-2">
                The platform does not provide medical advice, clinical recommendations, diagnoses, or treatment guidance of any kind. AI-generated responses are limited to appointment scheduling, service FAQs, and general clinic information as configured by the clinic operator.
              </p>
              <p className="mt-2">
                Clinic operators are solely responsible for ensuring that the information they configure in the assistant is accurate, appropriate, and does not constitute or imply clinical guidance. No patient communication through Clinic AI should be treated as a substitute for professional medical assessment.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">3. Account registration and responsibilities</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your login credentials and for all activity that occurs under your account.
              </p>
              <p>
                You agree to notify us promptly if you become aware of any unauthorized use of your account or any other security incident.
              </p>
              <p>
                You represent that you have the authority to operate a Clinic AI account on behalf of the clinic or organization you represent, and that your use of the platform complies with applicable laws and regulations in your jurisdiction.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">4. Acceptable use</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>You agree to use Clinic AI only for its intended purpose as a clinic front-desk operating system. You agree not to:</p>
              <ul className="ml-4 list-disc space-y-1.5">
                <li>Use the platform for purposes unrelated to a legitimate clinic or healthcare practice.</li>
                <li>Configure the assistant to provide medical diagnoses, clinical advice, or prescription guidance.</li>
                <li>Attempt to reverse-engineer, copy, or resell the platform or its underlying systems.</li>
                <li>Circumvent usage limits, access controls, or billing systems.</li>
                <li>Use the platform in ways that violate applicable laws, including data protection regulations.</li>
                <li>Upload or configure content that is false, deceptive, harmful, or offensive.</li>
              </ul>
              <p className="mt-3">
                We reserve the right to suspend or terminate accounts that violate these provisions at our discretion.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">5. Billing and subscriptions</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                Paid plans are billed monthly in advance through Stripe. You authorize recurring charges to your payment method at the frequency and amount applicable to your selected plan.
              </p>
              <p>
                You may cancel your subscription at any time through the billing settings in your workspace. Cancellation takes effect at the end of your current billing period. You retain access to the platform until that date.
              </p>
              <p>
                The Starter Trial is free for 14 days and does not require payment details. After the trial period, continued use of paid features requires upgrading to a paid plan.
              </p>
              <p>
                Refunds are handled on a case-by-case basis. For issues with billing, contact us through the contact page. We do not charge for plan periods after a confirmed cancellation.
              </p>
              <p>
                We reserve the right to update pricing with reasonable advance notice to registered users. Price changes will not apply to you until your next renewal after the notice period.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">6. Intellectual property</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                The Clinic AI platform, its software, design, and documentation are proprietary to us. Use of the service does not transfer any ownership of our intellectual property.
              </p>
              <p>
                You retain ownership of the clinic information, FAQs, and other content you configure in the platform. By inputting content into Clinic AI, you grant us a limited license to use that content solely to operate the service for your account.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">7. Data and privacy</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                Our handling of personal data is described in the{" "}
                <Link href="/privacy" className="font-medium text-[#0F766E] hover:text-[#115E59]">
                  Privacy Policy
                </Link>
                , which is incorporated into these Terms by reference. By using the platform, you consent to the data practices described in the Privacy Policy.
              </p>
              <p>
                As a clinic operator, you are a data controller for the patient information collected through your deployment of Clinic AI. You are responsible for ensuring your use of the platform complies with applicable data protection laws, including those governing patient privacy in your jurisdiction.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">8. Service availability and changes</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                We aim to provide reliable access to the platform but do not guarantee uninterrupted availability. Scheduled maintenance, infrastructure incidents, or third-party service disruptions may temporarily affect access.
              </p>
              <p>
                We may update, modify, or discontinue features of the platform from time to time. We will provide reasonable advance notice of significant changes where possible.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">9. Disclaimer of warranties</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                The Clinic AI platform is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied. We make no warranty that the platform will be error-free, uninterrupted, or meet any specific performance standard.
              </p>
              <p>
                AI-generated responses may not always be accurate, complete, or appropriate for every situation. Clinic operators are responsible for configuring the assistant with accurate information and for reviewing AI behavior in their deployment.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">10. Limitation of liability</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                To the fullest extent permitted by applicable law, Clinic AI and its operators shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of the platform, including but not limited to: missed appointments, miscommunication with patients, reliance on AI-generated responses, or data loss.
              </p>
              <p>
                Our aggregate liability for any claims arising from use of the platform shall not exceed the amount you paid for the platform in the 12 months preceding the claim.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">11. Termination</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[#475569]">
              <p>
                You may close your account at any time. We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or pose a risk to other users or the platform.
              </p>
              <p>
                Upon account termination, your access to the platform ceases. Account data is retained for a grace period following termination to allow for data export requests, after which it may be deleted.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">12. Governing law</h2>
            <div className="mt-3 text-sm leading-7 text-[#475569]">
              <p>
                These Terms are governed by and construed in accordance with applicable law. Any disputes arising from these Terms or your use of the platform shall be resolved through good-faith negotiation before any formal legal proceedings.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">13. Changes to these terms</h2>
            <div className="mt-3 text-sm leading-7 text-[#475569]">
              <p>
                We may update these Terms from time to time. Material changes will be communicated to registered operators via email. Continued use of the platform after the effective date of a change constitutes acceptance of the revised Terms.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A]">14. Contact</h2>
            <div className="mt-3 text-sm leading-7 text-[#475569]">
              <p>
                For questions about these Terms, please use the{" "}
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
            <Link href="/privacy" className="hover:text-[#0F172A]">Privacy Policy</Link>
            <Link href="/trust" className="hover:text-[#0F172A]">Trust &amp; Safety</Link>
            <Link href="/" className="hover:text-[#0F172A]">Back to home</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
