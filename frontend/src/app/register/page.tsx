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
    <div className="auth-page-ambient relative min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white/95 px-4 py-2.5 text-[0.9375rem] font-medium text-slate-600 shadow-sm backdrop-blur-sm transition-colors hover:border-slate-300 hover:text-[#0F172A]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center">
        <div className="auth-shell auth-stage-shell grid w-full max-w-7xl gap-0 overflow-hidden lg:grid-cols-[1fr_1.02fr]">

          {/* Left panel — marketing */}
          <div className="auth-marketing-panel hidden flex-col justify-between rounded-l-[2rem] border-r border-slate-700/70 p-8 lg:flex xl:p-12">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F766E] shadow-md shadow-teal-900/30">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-base font-semibold leading-none text-white">Clinic AI</p>
                  <p className="auth-panel-footnote mt-1 leading-none">AI front-desk OS</p>
                </div>
              </Link>

              <div className="mt-12">
                <div className="marketing-kicker mb-6">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  14-day free trial
                </div>
                <h1 className="text-[clamp(2.15rem,1.5vw+1.4rem,3.55rem)] font-bold leading-[1.02] tracking-[-0.05em]">
                  Launch a calmer, smarter front desk without rebuilding your clinic around new software.
                </h1>
                <p className="auth-panel-lead mt-5">
                  Add your clinic details, configure the assistant with your real information, and give your team a single workspace from first inquiry to confirmed booking.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Setup", value: "Guided", hint: "Onboarding keeps the launch path clear" },
                  { label: "Trial", value: "14 days", hint: "No card required to configure and test" },
                  { label: "Workspace", value: "Shared", hint: "Inbox, leads, and bookings together" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">{item.value}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.hint}</p>
                  </div>
                ))}
              </div>

              <ul className="mt-10 space-y-3.5">
                {setupSteps.map((step) => (
                  <li key={step} className="flex items-start gap-3.5 text-[0.9375rem] text-slate-300">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-200">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    {step}
                  </li>
                ))}
              </ul>

              <div className="mt-10 space-y-3">
                {highlights.map((item) => (
                  <div key={item.title} className="auth-panel-card p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-200">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <p className="auth-panel-card-title">{item.title}</p>
                    </div>
                    <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-slate-400">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p className="auth-panel-footnote mt-8 border-t border-slate-700/80 pt-6">
              No credit card required. Cancel anytime.{" "}
              <Link href="/trust" className="font-semibold text-slate-300 hover:text-white">
                How we handle trust
              </Link>
              .
            </p>
          </div>

          {/* Right panel — form */}
          <div className="auth-form-column flex items-center justify-center p-8 xl:p-12">
            <div className="w-full max-w-md">
              <div className="mb-10 text-center">
                {/* Mobile logo */}
                <Link href="/" className="mb-6 inline-flex items-center gap-2.5 lg:hidden">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] shadow-sm">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-base font-semibold text-[#0F172A]">Clinic AI</span>
                </Link>
                <h2 className="text-[2.3rem] font-bold tracking-[-0.05em] text-[#0F172A] sm:text-[2.7rem]">
                  Create your clinic workspace
                </h2>
                <p className="marketing-body mx-auto mt-3 max-w-md text-center text-slate-600">
                  Free for 14 days, no card. After you submit this form you&apos;ll sign in and land in guided onboarding — then configure clinic facts, preview chat, and use the real Inbox, Leads, and Appointments routes in the same app trial and paid teams share.
                </p>
              </div>

              <div className="auth-form-focus p-8 shadow-[0_40px_78px_-42px_rgb(12_18_32/0.34)]">
                <div className="mb-5 rounded-[1rem] border border-[#DDE5EE] bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.92))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Before you start</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#475569]">
                    This creates the real workspace your clinic will keep using after onboarding. The flow changes visually here, not the underlying product behavior.
                  </p>
                </div>
                {supabaseConfigError && (
                  <div className="mb-4 rounded-lg border border-[#FCD34D] bg-amber-50 px-4 py-3 text-sm text-[#D97706]">
                    {supabaseConfigError}
                  </div>
                )}

                {selectedPlan && (
                  <div className="mb-4 rounded-lg border border-[#99f6e4] bg-[#CCFBF1] px-4 py-3 text-sm text-[#115E59]">
                    Create your account to continue to checkout for the{" "}
                    <span className="font-semibold capitalize">{selectedPlan}</span> plan.
                  </div>
                )}

                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#DC2626]">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="full_name"
                      className="mb-2 block text-[0.9375rem] font-medium text-[#0F172A]"
                    >
                      Full name
                    </label>
                    <input
                      id="full_name"
                      type="text"
                      value={form.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                      className="app-input py-2.5"
                      placeholder="Dr. Jane Smith"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="clinic_name"
                      className="mb-2 block text-[0.9375rem] font-medium text-[#0F172A]"
                    >
                      Clinic name
                    </label>
                    <input
                      id="clinic_name"
                      type="text"
                      value={form.clinic_name}
                      onChange={(e) => updateField("clinic_name", e.target.value)}
                      className="app-input py-2.5"
                      placeholder="Sunrise Medical Clinic"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg_email"
                      className="mb-2 block text-[0.9375rem] font-medium text-[#0F172A]"
                    >
                      Email
                    </label>
                    <input
                      id="reg_email"
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      className="app-input py-2.5"
                      placeholder="you@clinic.com"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg_password"
                      className="mb-2 block text-[0.9375rem] font-medium text-[#0F172A]"
                    >
                      Password
                    </label>
                    <input
                      id="reg_password"
                      type="password"
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      className="app-input py-2.5"
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !!supabaseConfigError}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-teal-900/15 transition-colors hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
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

                <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
                  After sign-in, you&apos;ll finish guided onboarding first (or land on the dashboard if you already
                  did), then use Patient Chat, Settings, and Go live in one continuous flow.
                </p>

                <OAuthButtons
                  disabled={loading || !!supabaseConfigError || !queryReady}
                  nextPath={selectedPlan ? `/auth/complete?plan=${selectedPlan}` : undefined}
                />

                <p className="mt-6 text-center text-[0.9375rem] text-slate-600">
                  Already have an account?{" "}
                  <Link
                    href={selectedPlan ? `/login?plan=${selectedPlan}` : "/login"}
                    className="font-semibold text-[#0F766E] hover:text-[#115E59]"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
