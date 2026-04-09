"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Bot,
  Loader2,
  ShieldCheck,
  Check,
  BrainCircuit,
  Users,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { getPaidPlanId, startCheckoutForPlan } from "@/lib/billing-checkout";
import { getSupabasePublicEnvError } from "@/lib/env";
import { isValidEmail } from "@/lib/utils";

const OAuthButtons = dynamic(() => import("@/components/shared/OAuthButtons"), {
  ssr: false,
});

type RegisterFormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

const setupSteps = [
  "Guided setup takes under 15 minutes",
  "Configure services, hours, and FAQs from real clinic data",
  "Test the assistant with a live preview before going live",
  "Your team sees everything from day one",
];

const highlights = [
  {
    icon: ShieldCheck,
    title: "You stay in control",
    body: "Staff can review, edit, or take over any AI conversation at any time.",
  },
  {
    icon: BrainCircuit,
    title: "Grounded in your clinic info",
    body: "The assistant only uses what you configure — no generic answers.",
  },
  {
    icon: Users,
    title: "One workspace for the whole team",
    body: "Inbox, appointments, and follow-up visible to everyone from day one.",
  },
];

export default function RegisterPage() {
  const { loginWithOnboarding, setAuthenticatedUser } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    clinic_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [queryReady, setQueryReady] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"professional" | "premium" | null>(null);

  const supabaseConfigError =
    typeof getSupabasePublicEnvError === "function"
      ? getSupabasePublicEnvError()?.message ?? ""
      : "";

  useEffect(() => {
    if (globalThis.window !== undefined) {
      setSelectedPlan(
        getPaidPlanId(new URLSearchParams(globalThis.location.search).get("plan"))
      );
    }
    setQueryReady(true);
  }, []);

  let submitLabel = "Create account";
  if (loading && selectedPlan) {
    submitLabel = "Preparing checkout...";
  } else if (loading) {
    submitLabel = "Creating account...";
  } else if (selectedPlan) {
    submitLabel = "Continue to checkout";
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  async function submitRegistration(e: RegisterFormSubmitEvent) {
    e.preventDefault();
    setError("");

    if (supabaseConfigError) {
      setError(supabaseConfigError);
      return;
    }

    if (
      !form.full_name.trim() ||
      !form.email.trim() ||
      !form.password.trim() ||
      !form.clinic_name.trim()
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isValidEmail(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.register(form);

      if (!res.access_token) {
        setError(
          res.message ||
          "Account created. Check your email to confirm your address before signing in."
        );
        return;
      }

      if (selectedPlan) {
        setAuthenticatedUser(res);
        await startCheckoutForPlan(selectedPlan);
        return;
      }

      loginWithOnboarding(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = (e: RegisterFormSubmitEvent) => {
    void submitRegistration(e);
  };

  return (
    <div className="auth-page-ambient relative min-h-screen overflow-hidden">
      {/* Floating back navigation */}
      <div className="absolute left-6 top-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-3.5 py-2 text-sm font-medium text-white/80 backdrop-blur-md transition-colors hover:bg-white/14 hover:text-white lg:border-slate-200/80 lg:bg-white/90 lg:text-slate-600 lg:shadow-sm lg:hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>
      </div>

      <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
        {/* ═══ Left — immersive brand panel ═══ */}
        <div className="auth-marketing-panel relative hidden flex-col justify-between overflow-hidden px-10 py-12 lg:flex xl:px-14 xl:py-16">
          {/* Brand mark */}
          <Link href="/" className="relative z-1 inline-flex w-fit items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12 text-white shadow-md shadow-black/15 backdrop-blur-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[0.9375rem] font-semibold text-white">Clinic AI</p>
              <p className="text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400">Operating system</p>
            </div>
          </Link>

          {/* Messaging */}
          <div className="relative z-1 my-auto max-w-lg py-8">
            <div className="marketing-kicker mb-7">
              <ShieldCheck className="h-3.5 w-3.5" />
              14-day free trial
            </div>
            <h1 className="text-[clamp(1.9rem,2vw+0.9rem,3rem)] font-bold leading-[1.06] tracking-[-0.04em] text-white text-balance">
              Launch a calmer, smarter front desk — configured with your real clinic data.
            </h1>
            <p className="auth-panel-lead mt-6 max-w-md">
              Add your details, configure the assistant, and give your team a single workspace from first inquiry to confirmed booking.
            </p>

            {/* Status chips */}
            <div className="mt-8 flex flex-wrap gap-2.5">
              {[
                { label: "Setup", value: "Guided" },
                { label: "Trial", value: "14 days" },
                { label: "Workspace", value: "Shared" },
              ].map((item) => (
                <div key={item.label} className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/6 px-4 py-2 backdrop-blur-sm">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{item.label}</span>
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Setup steps */}
            <ul className="mt-8 space-y-2.5">
              {setupSteps.map((step) => (
                <li key={step} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-[0.875rem] text-slate-200">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300/80" />
                  {step}
                </li>
              ))}
            </ul>

            {/* Highlights */}
            <div className="mt-8 space-y-2.5">
              {highlights.map((item) => (
                <div key={item.title} className="flex items-start gap-3.5 rounded-xl border border-white/8 bg-white/5 px-4 py-3.5">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-300/80" />
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-[0.8125rem] leading-relaxed text-slate-400">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-1">
            <p className="text-[0.8125rem] text-slate-400">
              No credit card required.{" "}
              <Link href="/trust" className="font-semibold text-teal-300/90 transition-colors hover:text-teal-200">
                How we handle trust →
              </Link>
            </p>
          </div>
        </div>

        {/* ═══ Right — registration form ═══ */}
        <div className="auth-form-column flex items-center justify-center px-6 py-16 sm:px-10 lg:px-14">
          <div className="w-full max-w-104">
            {/* Mobile brand mark */}
            <div className="mb-10 flex justify-center lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-primary text-white shadow-sm">
                  <Bot className="h-5 w-5" />
                </div>
                <span className="text-base font-semibold text-app-text">Clinic AI</span>
              </Link>
            </div>

            <div className="mb-8 text-center">
              <h2 className="text-[1.75rem] font-bold tracking-[-0.04em] text-app-text sm:text-[2rem]">
                Create your workspace
              </h2>
              <p className="mt-2 text-[0.9375rem] text-app-text-muted">
                Free for 14 days, no card required
              </p>
            </div>

            <div className="auth-form-focus px-7 py-8 sm:px-8">
              {supabaseConfigError && (
                <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {supabaseConfigError}
                </div>
              )}

              {selectedPlan && (
                <div className="mb-5 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                  Create your account to continue to checkout for the{" "}
                  <span className="font-semibold capitalize">{selectedPlan}</span> plan.
                </div>
              )}

              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-app-text">
                      Full name
                    </label>
                    <input
                      id="full_name"
                      type="text"
                      value={form.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                      className="app-input"
                      placeholder="Dr. Jane Smith"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="clinic_name" className="mb-1.5 block text-sm font-medium text-app-text">
                      Clinic name
                    </label>
                    <input
                      id="clinic_name"
                      type="text"
                      value={form.clinic_name}
                      onChange={(e) => updateField("clinic_name", e.target.value)}
                      className="app-input"
                      placeholder="Sunrise Medical Clinic"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg_email" className="mb-1.5 block text-sm font-medium text-app-text">
                    Email address
                  </label>
                  <input
                    id="reg_email"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="app-input"
                    placeholder="you@clinic.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="reg_password" className="mb-1.5 block text-sm font-medium text-app-text">
                    Password
                  </label>
                  <input
                    id="reg_password"
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className="app-input"
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !!supabaseConfigError}
                  className="app-btn app-btn-primary mt-1 w-full justify-center disabled:pointer-events-none disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {submitLabel}
                    </>
                  ) : (
                    submitLabel
                  )}
                </button>
              </form>

              <OAuthButtons
                disabled={loading || !!supabaseConfigError || !queryReady}
                nextPath={selectedPlan ? `/auth/complete?plan=${selectedPlan}` : undefined}
              />
            </div>

            <p className="mt-6 text-center text-sm text-app-text-muted">
              Already have an account?{" "}
              <Link
                href={selectedPlan ? `/login?plan=${selectedPlan}` : "/login"}
                className="font-semibold text-app-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
