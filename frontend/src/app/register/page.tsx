"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Bot, Loader2, ShieldCheck, Sparkles } from "lucide-react";
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

  async function submitRegistration(
    e: RegisterFormSubmitEvent
  ) {
    e.preventDefault();
    setError("");

    if (supabaseConfigError) {
      setError(supabaseConfigError);
      return;
    }

    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim() || !form.clinic_name.trim()) {
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
          res.message || "Account created. Check your email to confirm your address before signing in."
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

  const handleSubmit = (
    e: RegisterFormSubmitEvent
  ) => {
    void submitRegistration(e);
  };

  return (
    <div className="app-shell-bg min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="auth-shell grid w-full max-w-6xl gap-8 p-5 sm:p-6 lg:grid-cols-[0.96fr_1.04fr] lg:p-8">
          <div className="hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-8 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="app-page-kicker mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                Set up a clinic workspace
              </div>
              <h1 className="max-w-lg text-2xl font-semibold text-[#0F172A]">
                Set up your clinic workspace in minutes.
              </h1>
              <p className="mt-6 max-w-lg text-sm leading-6 text-[#475569]">
                Add your clinic details, configure the assistant with real information, and give your team a single workspace from inquiry to booking.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Guided setup takes under 15 minutes",
                  "Inbox, pipeline, appointments, and operations included",
                  "Staff review and takeover built in from the start",
                ].map((item) => (
                  <div key={item} className="app-card-muted flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#0F172A]">
                    <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="workspace-rail-card p-5">
              <p className="workspace-section-label">You stay in control</p>
              <div className="mt-4 space-y-3 text-sm text-[#475569]">
                <p>You decide what information the assistant uses.</p>
                <p>Configure services, hours, and FAQs from real clinic data.</p>
                <p>Your team sees everything — conversations, bookings, and follow-up — from day one.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <div className="mx-auto w-full max-w-xl">
              <div className="mb-8 text-center">
                <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0F766E] shadow-sm">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-lg font-semibold text-[#0F172A]">
                    Clinic AI
                  </span>
                </Link>
                <h1 className="text-2xl font-semibold text-[#0F172A]">
                  Create your clinic workspace
                </h1>
                <p className="mt-2 text-sm text-[#64748B]">
                  Set up your account and move straight into guided onboarding.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="landing-shell p-8 sm:p-9">
                {supabaseConfigError && (
                  <div className="mb-4 rounded-lg border border-[#FCD34D] bg-amber-50 px-4 py-3 text-sm text-[#D97706]">
                    {supabaseConfigError}
                  </div>
                )}

                {selectedPlan && (
                  <div className="mb-4 rounded-lg border border-[#99f6e4] bg-[#CCFBF1] px-4 py-3 text-sm text-[#115E59]">
                    Create your account to continue to checkout for the {selectedPlan} plan.
                  </div>
                )}

                {error && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#DC2626]">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="full_name"
                      className="mb-1.5 block text-sm font-medium text-[#0F172A]"
                    >
                      Full Name
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
                    <label
                      htmlFor="clinic_name"
                      className="mb-1.5 block text-sm font-medium text-[#0F172A]"
                    >
                      Clinic Name
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
                      className="app-input"
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
                      className="app-input"
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !!supabaseConfigError}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {submitLabel}
                    </>
                  ) : (
                    submitLabel
                  )}
                </button>

                <OAuthButtons
                  disabled={loading || !!supabaseConfigError || !queryReady}
                  nextPath={selectedPlan ? `/auth/complete?plan=${selectedPlan}` : undefined}
                />

                <p className="mt-4 text-center text-sm text-[#64748B]">
                  Already have an account?{" "}
                  <Link
                    href={selectedPlan ? `/login?plan=${selectedPlan}` : "/login"}
                    className="font-semibold text-[#0F766E] hover:text-[#115E59]"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
