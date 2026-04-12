import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";
import { MessageSquare, Calendar, Users, Brain, BarChart3, Zap, Link as LinkIcon, Bell } from "lucide-react";

export function ProductPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">Front Desk OS for Modern Clinics</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              A complete operating system for clinic operations, combining AI automation with powerful staff tools.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-20">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">AI-Powered Inbox</h3>
                  <p className="text-muted-foreground">
                    Every patient conversation flows into one unified inbox. AI handles routine questions while your team manages complex cases.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
                  <p className="text-muted-foreground">
                    Book appointments through chat or SMS. Handle confirmations, reminders, and rescheduling automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Lead Pipeline</h3>
                  <p className="text-muted-foreground">
                    Track every inquiry from first contact to booked appointment. Never lose a potential patient.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Custom Training</h3>
                  <p className="text-muted-foreground">
                    Teach your AI assistant about your services, policies, insurance, and procedures for accurate patient interactions.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Analytics Dashboard</h3>
                  <p className="text-muted-foreground">
                    Monitor inquiry volume, response times, booking rates, and AI performance in real-time.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Operations Control</h3>
                  <p className="text-muted-foreground">
                    Manage availability, channels, automated reminders, and communication settings from one control center.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <LinkIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Easy Integration</h3>
                  <p className="text-muted-foreground">
                    Embed chat on your website or send your custom SMS number. Patients reach you where they are.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Activity Tracking</h3>
                  <p className="text-muted-foreground">
                    Complete audit trail of all patient interactions, bookings, and system events for compliance and review.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl p-12 border border-border text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">See it in action</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Schedule a demo to see how Clinic AI transforms your front desk operations
            </p>
            <a
              href="/contact"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Request Demo
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
