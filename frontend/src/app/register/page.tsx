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
    <div className="app-shell-bg min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="auth-shell grid w-full max-w-6xl gap-0 overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">

          {/* Left panel — marketing */}
          <div className="hidden flex-col justify-between rounded-l-xl border-r border-[#E2E8F0] bg-[#F8FAFC] p-8 lg:flex xl:p-10">
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] shadow-sm">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none text-[#0F172A]">Clinic AI</p>
                  <p className="mt-0.5 text-[11px] leading-none text-[#64748B]">AI front-desk OS</p>
                </div>
              </Link>

              <div className="mt-10">
                <div className="marketing-kicker mb-5">
                  <ShieldCheck className="h-3 w-3" />
                  14-day free trial
                </div>
                <h1 className="text-2xl font-bold leading-snug tracking-tight text-[#0F172A]">
                  Set up your clinic&apos;s AI front desk in minutes.
                </h1>
                <p className="mt-4 text-sm leading-7 text-[#475569]">
                  Add your clinic details, configure the assistant with your real information, and give your team a single workspace from first inquiry to confirmed booking.
                </p>
              </div>

              <ul className="mt-8 space-y-3">
                {setupSteps.map((step) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-[#475569]">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#CCFBF1] text-[#115E59]">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    {step}
                  </li>
                ))}
              </ul>

              <div className="mt-8 space-y-3">
                {highlights.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#CCFBF1] text-[#115E59]">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm font-semibold text-[#0F172A]">{item.title}</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#64748B]">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-6 text-xs text-[#94A3B8]">
              No credit card required. Cancel anytime.{" "}
              <Link href="/trust" className="font-medium text-[#64748B] hover:text-[#0F172A]">
                How we handle trust
              </Link>
              .
            </p>
          </div>

          {/* Right panel — form */}
          <div className="flex items-center justify-center p-8 xl:p-12">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center">
                {/* Mobile logo */}
                <Link href="/" className="mb-6 inline-flex items-center gap-2.5 lg:hidden">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] shadow-sm">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-[#0F172A]">Clinic AI</span>
                </Link>
                <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
                  Create your clinic workspace
                </h2>
                <p className="mt-2 text-sm text-[#64748B]">
                  Free for 14 days. Set up and into guided onboarding in minutes.
                </p>
              </div>

              <div className="landing-shell p-8">
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
                      className="mb-1.5 block text-sm font-medium text-[#0F172A]"
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
                      className="mb-1.5 block text-sm font-medium text-[#0F172A]"
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
                      className="mb-1.5 block text-sm font-medium text-[#0F172A]"
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
                      className="mb-1.5 block text-sm font-medium text-[#0F172A]"
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
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
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

                <p className="mt-5 text-center text-sm text-[#64748B]">
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
