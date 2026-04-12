import { Navigation } from "../components/Navigation";
import { Footer } from "../components/Footer";

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-foreground mb-6">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-12">Last updated: April 11, 2026</p>

          <div className="prose prose-slate max-w-none">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
                <p className="text-muted-foreground">
                  By accessing or using Clinic AI, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">Use License</h2>
                <p className="text-muted-foreground">
                  We grant you a limited, non-exclusive, non-transferable license to use Clinic AI for your clinic's operations in accordance with these Terms. This license does not include any resale or commercial use of the service.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">User Responsibilities</h2>
                <p className="text-muted-foreground mb-4">
                  You are responsible for:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Maintaining the security of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Ensuring your use complies with applicable laws and regulations</li>
                  <li>The accuracy of information you provide to train the AI</li>
                  <li>Monitoring AI interactions with patients</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">Prohibited Uses</h2>
                <p className="text-muted-foreground mb-4">
                  You may not use Clinic AI to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Transmit harmful or malicious code</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Use the service for any unlawful purpose</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">Payment Terms</h2>
                <p className="text-muted-foreground">
                  Subscription fees are billed in advance on a monthly basis. You authorize us to charge your payment method for all fees. All fees are non-refundable except as required by law.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">Termination</h2>
                <p className="text-muted-foreground">
                  We may terminate or suspend your access immediately, without prior notice, for any breach of these Terms. Upon termination, your right to use the service will immediately cease.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
                <p className="text-muted-foreground">
                  Clinic AI is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">Changes to Terms</h2>
                <p className="text-muted-foreground">
                  We reserve the right to modify these terms at any time. We will notify you of any changes by posting the new Terms of Service on this page.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
                <p className="text-muted-foreground">
                  Questions about the Terms of Service should be sent to legal@clinicai.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
