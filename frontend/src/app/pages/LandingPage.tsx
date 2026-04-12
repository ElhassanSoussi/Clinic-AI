import { Link } from "react-router";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { CheckCircle, MessageSquare, Calendar, Users, Brain, Shield, ArrowRight, BarChart3, Settings, Eye, CheckCircle2, Target } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 leading-tight px-1">
              Front desk operating system for modern clinics
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 px-1">
              AI-powered patient conversations, appointment booking, and clinic operations — unified in one platform your team will trust.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 mb-8 max-w-md sm:max-w-none mx-auto">
              <Link
                to="/register"
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold"
              >
                Start Free Trial
              </Link>
              <Link
                to="/product"
                className="px-6 py-3 border border-border bg-white rounded-lg hover:bg-muted transition-colors font-semibold"
              >
                See How It Works
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground px-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                <span>Setup in under 1 hour</span>
              </div>
            </div>
          </div>

          {/* Product Screenshot */}
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-xl shadow-2xl border border-border overflow-hidden">
              <div className="bg-muted/50 border-b border-border px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-muted-foreground">Dashboard — Bright Smile Dental</span>
                </div>
              </div>
              <div className="p-6 bg-background">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4">
                  <div className="bg-white rounded-lg p-4 border border-border">
                    <p className="text-2xl font-bold mb-1">24</p>
                    <p className="text-xs text-muted-foreground">New conversations</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-border">
                    <p className="text-2xl font-bold mb-1">8</p>
                    <p className="text-xs text-muted-foreground">Booked today</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-border">
                    <p className="text-2xl font-bold mb-1">12</p>
                    <p className="text-xs text-muted-foreground">Active leads</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-border">
                    <p className="text-2xl font-bold mb-1">94%</p>
                    <p className="text-xs text-muted-foreground">AI accuracy</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold">Recent Activity</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      <span className="text-muted-foreground">New appointment: Sarah J. — Thu 2:00 PM</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      <span className="text-muted-foreground">Lead captured: Michael B. — Teeth whitening</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                      <span className="text-muted-foreground">Reminder sent: Lisa A. — Appointment tomorrow</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What It Does */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">What Clinic AI does</h2>
            <p className="text-lg text-muted-foreground">A complete system for patient communication and clinic operations</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">AI-powered patient conversations</h3>
                  <p className="text-sm text-muted-foreground">Answer questions, collect information, and qualify leads automatically through web chat and SMS</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Smart appointment booking</h3>
                  <p className="text-sm text-muted-foreground">Check availability, book appointments, send reminders, and handle rescheduling requests</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Lead pipeline & conversion</h3>
                  <p className="text-sm text-muted-foreground">Track every inquiry, follow up on prospects, and recover inactive patients</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Complete team visibility</h3>
                  <p className="text-sm text-muted-foreground">Staff reviews all conversations, approves AI responses, and steps in when needed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-white border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">How it works</h2>
            <p className="text-lg text-muted-foreground">Simple setup, powerful automation, complete control</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 font-bold text-xl">1</div>
              <h3 className="font-semibold mb-2">Configure your clinic</h3>
              <p className="text-sm text-muted-foreground">Add your services, hours, policies, and insurance information in under an hour</p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 font-bold text-xl">2</div>
              <h3 className="font-semibold mb-2">Connect your channels</h3>
              <p className="text-sm text-muted-foreground">Embed chat on your website and get a dedicated SMS number for text messaging</p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 font-bold text-xl">3</div>
              <h3 className="font-semibold mb-2">Go live with oversight</h3>
              <p className="text-sm text-muted-foreground">AI handles routine questions while your team manages complex cases and monitors everything</p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Modules */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Built for clinic operations</h2>
            <p className="text-lg text-muted-foreground">Everything you need in one unified platform</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Dashboard</h3>
              </div>
              <p className="text-sm text-muted-foreground">Operational overview and key metrics</p>
            </div>

            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Inbox</h3>
              </div>
              <p className="text-sm text-muted-foreground">Unified conversation workspace</p>
            </div>

            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Leads</h3>
              </div>
              <p className="text-sm text-muted-foreground">Pipeline and conversion tracking</p>
            </div>

            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Appointments</h3>
              </div>
              <p className="text-sm text-muted-foreground">Schedule management and confirmations</p>
            </div>

            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">AI Training</h3>
              </div>
              <p className="text-sm text-muted-foreground">Knowledge base and response control</p>
            </div>

            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Operations</h3>
              </div>
              <p className="text-sm text-muted-foreground">System status and channel readiness</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Oversight */}
      <section className="py-20 px-6 bg-white border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-4">You stay in control</h2>
              <p className="text-lg text-muted-foreground mb-8">
                AI accelerates your team, but your clinic always has the final say on patient interactions.
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Full visibility</h3>
                    <p className="text-sm text-muted-foreground">Review every conversation, see what AI suggested, and monitor performance</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Human oversight</h3>
                    <p className="text-sm text-muted-foreground">Staff can step in, override responses, or handle complex cases manually</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Trained on your clinic</h3>
                    <p className="text-sm text-muted-foreground">AI learns your services, policies, and procedures — not generic healthcare advice</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">HIPAA compliant & secure</h3>
                    <p className="text-sm text-muted-foreground">Healthcare-grade encryption, compliance, and data protection built in</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-8 border border-border">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-sm font-medium">AI Response Accuracy</span>
                  </div>
                  <span className="text-lg font-bold">94%</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-sm font-medium">Staff Review Time</span>
                  </div>
                  <span className="text-lg font-bold">~30 sec</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-sm font-medium">Questions Handled by AI</span>
                  </div>
                  <span className="text-lg font-bold">78%</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span className="text-sm font-medium">Complex Cases to Staff</span>
                  </div>
                  <span className="text-lg font-bold">22%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Simple, transparent pricing</h2>
            <p className="text-lg text-muted-foreground">Start free, scale as you grow</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 border border-border">
              <h3 className="text-xl font-bold mb-2">Starter</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold">$99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>500 conversations/month</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>2 staff seats</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Web chat & SMS</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                Most Popular
              </div>
              <h3 className="text-xl font-bold mb-2">Professional</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold">$249</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>1,000 conversations/month</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>5 staff seats</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Advanced analytics</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 border border-border">
              <h3 className="text-xl font-bold mb-2">Enterprise</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold">Custom</span>
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Unlimited conversations</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Unlimited staff seats</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Custom integrations</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/pricing" className="text-primary hover:underline font-medium">
              See full pricing details →
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Preview */}
      <section className="py-20 px-6 bg-white border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-3">Common questions</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">How does the AI assistant work?</h3>
              <p className="text-sm text-muted-foreground">
                Your AI assistant is trained on your clinic's specific information. When patients reach out, it can answer questions, book appointments, and collect information. Complex cases are escalated to your staff.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Can patients book appointments directly?</h3>
              <p className="text-sm text-muted-foreground">
                Yes. The AI checks your availability and books appointments in real-time. Staff can review and adjust bookings through the dashboard.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">How long does setup take?</h3>
              <p className="text-sm text-muted-foreground">
                Most clinics are up and running in under an hour. You'll provide information about your services and policies, customize your availability, and embed the chat widget.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Is my data secure?</h3>
              <p className="text-sm text-muted-foreground">
                Absolutely. We're HIPAA compliant, SOC 2 Type II certified, and use enterprise-grade encryption. All patient data is encrypted in transit and at rest.
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/faq" className="text-primary hover:underline font-medium">
              View all questions →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-foreground mb-4">Ready to get started?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start your free trial today. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold text-lg"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-8 py-4 border border-border bg-white rounded-lg hover:bg-muted transition-colors font-semibold text-lg"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
