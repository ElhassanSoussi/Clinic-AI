import Link from "next/link";
import { Bot, ArrowLeft } from "lucide-react";

export const metadata = { title: "Privacy Policy — Clinic AI" };

export default function PrivacyPage() {
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

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>

        <div className="prose prose-slate prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-slate-900">1. Information We Collect</h2>
            <p className="text-slate-600 leading-relaxed">
              When you use Clinic AI, we collect information you provide directly: your name, email address, clinic details, and configuration preferences.
              When patients interact with your AI chat widget, we collect the information they voluntarily share during the conversation, such as name, phone number, email, and reason for visit.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">2. How We Use Your Information</h2>
            <p className="text-slate-600 leading-relaxed">
              We use collected information to operate the platform, deliver AI chat services, send lead notifications, process billing, and improve our services.
              We do not sell, rent, or share personal information with third parties for marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">3. Data Storage &amp; Security</h2>
            <p className="text-slate-600 leading-relaxed">
              Data is stored securely using industry-standard encryption. We use Supabase for database hosting and authentication, Stripe for payment processing, and Resend for email delivery.
              All data is transmitted over HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">4. Third-Party Services</h2>
            <p className="text-slate-600 leading-relaxed">
              We integrate with third-party services including OpenAI (for AI responses), Google Sheets (optional lead sync), Stripe (billing), and Resend (email notifications).
              Each service has its own privacy policy governing their use of data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">5. Medical Disclaimer</h2>
            <p className="text-slate-600 leading-relaxed font-medium">
              Clinic AI is an intake and scheduling tool only. It does not provide medical advice, diagnosis, or treatment recommendations.
              All AI-generated responses are limited to appointment scheduling, FAQ answers, and general clinic information as configured by the clinic owner.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">6. Data Retention &amp; Deletion</h2>
            <p className="text-slate-600 leading-relaxed">
              You may request deletion of your account and associated data by contacting us. Clinic owners can delete individual leads from the dashboard.
              We retain data only as long as necessary to provide our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">7. Changes to This Policy</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this policy from time to time. We will notify registered users of material changes via email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900">8. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              For questions about this privacy policy, please visit our{" "}
              <Link href="/contact" className="text-teal-600 hover:text-teal-700 underline">contact page</Link>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
