import { Navigation } from "../components/Navigation";
import { Footer } from "../components/Footer";
import {
  Shield,
  Lock,
  Eye,
  CheckCircle2,
  AlertCircle,
  User,
  Brain,
  Settings,
  MessageSquare,
  FileCheck,
  Server,
} from "lucide-react";

export function TrustPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            Built for trust
          </h1>
          <p className="text-xl text-muted-foreground">
            AI automation with human oversight, operational
            control, and healthcare-grade security
          </p>
        </div>
      </section>

      {/* Clinic Control */}
      <section className="py-16 px-6 bg-white border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              You stay in control
            </h2>
            <p className="text-lg text-muted-foreground">
              Your clinic has full authority over every patient
              interaction
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-background rounded-lg p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <Eye className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Review every conversation
                  </h3>
                  <p className="text-muted-foreground">
                    Staff can see all patient messages, AI
                    suggestions, and booking details in a
                    unified inbox. Nothing is hidden.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-background rounded-lg p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Step in anytime
                  </h3>
                  <p className="text-muted-foreground">
                    Your team can take over any conversation,
                    override AI responses, or handle complex
                    cases manually.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-background rounded-lg p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <Settings className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Configure AI behavior
                  </h3>
                  <p className="text-muted-foreground">
                    Control what the AI can do: book
                    appointments, answer specific questions, or
                    only collect information.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-background rounded-lg p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Train on your policies
                  </h3>
                  <p className="text-muted-foreground">
                    AI learns your services, insurance, and
                    procedures — not generic advice. You control
                    the knowledge base.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grounded Behavior */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Grounded, reliable responses
            </h2>
            <p className="text-lg text-muted-foreground">
              AI only answers what it knows about your clinic
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">
                Trained on your clinic
              </h3>
              <p className="text-sm text-muted-foreground">
                AI responds based on your services, policies,
                hours, and insurance — not generic healthcare
                information.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">
                Escalates when uncertain
              </h3>
              <p className="text-sm text-muted-foreground">
                Complex medical questions, emergencies, or
                unusual requests are flagged for staff review.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">
                Clear about limitations
              </h3>
              <p className="text-sm text-muted-foreground">
                AI doesn't pretend to be a doctor or give
                medical advice — it books appointments and
                answers policy questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Visibility */}
      <section className="py-16 px-6 bg-white border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Complete team visibility
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Every member of your staff can see what's
                happening and how the AI is performing.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    Unified inbox shows all conversations in one
                    place
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    Activity feed logs every action and system
                    event
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    AI/manual indicators show who handled each
                    message
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">
                    Performance metrics track accuracy and
                    response times
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6 border border-border">
              <h3 className="font-semibold mb-4">
                Example: Inbox View
              </h3>
              <div className="space-y-3">
                <div className="bg-white rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                      <Brain className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-primary">
                      AI Handled
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1">
                    Sarah J. — Appointment booked
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Thursday 2:00 PM • Cleaning
                  </p>
                </div>

                <div className="bg-white rounded-lg p-4 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-medium">
                      Staff Review
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1">
                    Michael B. — Insurance question
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Needs clarification on coverage
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Healthcare-grade security
            </h2>
            <p className="text-lg text-muted-foreground">
              Built for patient data protection and regulatory
              compliance
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">
                HIPAA Compliant
              </h3>
              <p className="text-sm text-muted-foreground">
                Full HIPAA compliance with Business Associate
                Agreements available for all customers.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">
                End-to-end encryption
              </h3>
              <p className="text-sm text-muted-foreground">
                All patient data encrypted in transit and at
                rest using industry-standard AES-256.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <Server className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">
                SOC 2 Type II
              </h3>
              <p className="text-sm text-muted-foreground">
                Independently audited for security,
                availability, and confidentiality controls.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <FileCheck className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">
                Role-based access
              </h3>
              <p className="text-sm text-muted-foreground">
                Control who can view conversations, manage
                settings, and access patient information.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Audit logs</h3>
              <p className="text-sm text-muted-foreground">
                Complete activity trail of all actions, logins,
                and data access for compliance.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">
                Data ownership
              </h3>
              <p className="text-sm text-muted-foreground">
                Your data is yours. Export anytime, delete
                anytime. Never sold or shared.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-white border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Questions about security or compliance?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Our team is happy to discuss our practices in detail
          </p>
          <a
            href="/contact"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold"
          >
            Contact Us
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}