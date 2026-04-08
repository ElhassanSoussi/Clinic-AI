"use client";

import { useState, type ComponentProps } from "react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { getPublicApiUrl } from "@/lib/api-url";
import { isValidEmail } from "@/lib/utils";
import { PublicNav } from "@/components/marketing/PublicNav";
import { PublicFooter } from "@/components/marketing/PublicFooter";

type ContactFormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    clinic_name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: ContactFormSubmitEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Something went wrong. Please try again.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="public-marketing-root flex min-h-screen flex-col">
      <PublicNav />

      <main className="flex-1 marketing-section-tight">
        <div className="marketing-container marketing-container--narrow mx-auto max-w-xl py-12 sm:py-16">
          {submitted ? (
            <div className="ds-card px-8 py-14 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#CCFBF1] text-[#0F766E]">
                <CheckCircle2 className="h-8 w-8" aria-hidden />
              </div>
              <h1 className="text-[clamp(1.5rem,2vw,1.875rem)] font-bold tracking-tight text-[#0F172A]">
                Thank you
              </h1>
              <p className="marketing-body mx-auto mt-3 max-w-md text-[#475569]">
                We&apos;ll be in touch within one business day with next steps tailored to your practice.
              </p>
              <Link
                href="/"
                className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-5 py-3 text-[0.9375rem] font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-[#F8FAFC]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to home
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-10 text-center sm:text-left">
                <div className="mb-4 flex justify-center sm:justify-start">
                  <div className="marketing-kicker">
                    <Send className="h-3 w-3" aria-hidden />
                    Talk to us
                  </div>
                </div>
                <h1 className="marketing-h2 text-balance">
                  Book a walkthrough or ask us anything
                </h1>
                <p className="marketing-lead mx-auto mt-4 max-w-xl text-balance sm:mx-0">
                  We&apos;ll show you how Clinic AI fits your front desk — setup, inbox, and go-live — without pressure.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="ds-card space-y-5 p-6 sm:p-8">
                <div>
                  <label htmlFor="name" className="ds-field-label">
                    Your name <span className="font-normal text-[#DC2626]">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    maxLength={100}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                    placeholder="Dr. Jane Smith"
                  />
                </div>

                <div>
                  <label htmlFor="clinic_name" className="ds-field-label">
                    Clinic name
                  </label>
                  <input
                    id="clinic_name"
                    type="text"
                    value={form.clinic_name}
                    onChange={(e) => update("clinic_name", e.target.value)}
                    maxLength={200}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                    placeholder="Bright Smile Dental"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="ds-field-label">
                    Email <span className="font-normal text-[#DC2626]">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    maxLength={200}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                    placeholder="jane@clinic.com"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="ds-field-label">
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    maxLength={30}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="ds-field-label">
                    Anything we should know?
                  </label>
                  <textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => update("message", e.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2.5 text-sm transition-colors focus:border-[#0F766E] focus:ring-2 focus:ring-[#CCFBF1]"
                    placeholder="Tell us about your clinic, current workflow, or what you're looking for..."
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-[#DC2626]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="marketing-cta-primary !w-full disabled:pointer-events-none disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Request a conversation"}
                  {!submitting && <Send className="h-4 w-4" aria-hidden />}
                </button>
              </form>

              <p className="mt-6 text-center text-[0.9375rem] leading-relaxed text-[#64748B]">
                Prefer to explore on your own?{" "}
                <Link href="/register" className="font-semibold text-[#0F766E] hover:text-[#115E59]">
                  Start a free trial
                </Link>{" "}
                or{" "}
                <Link href="/chat/demo" className="font-semibold text-[#0F766E] hover:text-[#115E59]">
                  try the live demo
                </Link>
                .
              </p>
              <div className="mt-6 flex justify-center sm:justify-start">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 text-[0.9375rem] font-medium text-[#475569] transition-colors hover:text-[#0F172A]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Back to home
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
