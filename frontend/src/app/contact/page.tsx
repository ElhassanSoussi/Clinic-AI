"use client";

import { useState } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";
import { api } from "@/lib/api";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    clinic_name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback("");
    setError("");
    try {
      const result = await api.contact.submit(form);
      setFeedback(result.message || "Thanks, we’ll get back to you shortly.");
      setForm({ name: "", clinic_name: "", email: "", phone: "", message: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="public-marketing-root">
      <PublicNav />
      <main>
        <section className="marketing-container grid gap-10 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:py-20">
          <div className="space-y-6">
            <div className="marketing-kicker">
              <Mail className="h-3.5 w-3.5" />
              Contact
            </div>
            <h1 className="text-[clamp(2.4rem,3vw,4.2rem)] font-semibold tracking-[-0.055em] text-foreground">
              Talk to us about your clinic workflow, launch plan, or rollout questions.
            </h1>
            <p className="text-base leading-8 text-muted-foreground">
              We’re happy to help you evaluate fit, understand how the workspace maps to your front-desk flow, and answer trust or implementation questions.
            </p>

            <div className="grid gap-4">
              <div className="bg-card rounded-xl p-5">
                <p className="text-sm font-semibold text-foreground">Email</p>
                <p className="mt-2 text-sm text-muted-foreground">support@clinicai.example</p>
              </div>
              <div className="bg-card rounded-xl p-5">
                <p className="text-sm font-semibold text-foreground">Response style</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Clear answers, product walkthroughs, and implementation guidance without sales-pressure theater.
                </p>
              </div>
              <div className="bg-card rounded-xl p-5">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Trust-first conversations
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  If your questions are about patient-facing behavior, safety, or launch readiness, say so in the message and we’ll route accordingly.
                </p>
              </div>
            </div>
          </div>

          <section className="bg-card rounded-[2rem] p-6 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Send a note</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Share a little context and we’ll follow up with the most relevant answer.
            </p>

            {feedback ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {feedback}
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <form className="mt-6 grid gap-5" onSubmit={(e) => void handleSubmit(e)}>
              <div>
                <label className="app-label" htmlFor="contact-name">
                  Name
                </label>
                <input id="contact-name" className="app-field" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
              </div>
              <div>
                <label className="app-label" htmlFor="contact-clinic">
                  Clinic
                </label>
                <input id="contact-clinic" className="app-field" value={form.clinic_name} onChange={(e) => updateField("clinic_name", e.target.value)} />
              </div>
              <div>
                <label className="app-label" htmlFor="contact-email">
                  Email
                </label>
                <input id="contact-email" type="email" className="app-field" value={form.email} onChange={(e) => updateField("email", e.target.value)} required />
              </div>
              <div>
                <label className="app-label" htmlFor="contact-phone">
                  Phone
                </label>
                <input id="contact-phone" className="app-field" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              </div>
              <div>
                <label className="app-label" htmlFor="contact-message">
                  Message
                </label>
                <textarea id="contact-message" className="app-textarea" value={form.message} onChange={(e) => updateField("message", e.target.value)} required />
              </div>
              <button type="submit" className="app-btn app-btn-primary w-full" disabled={submitting}>
                Send message
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </section>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
