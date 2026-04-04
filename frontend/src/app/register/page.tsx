"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Bot, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { getPaidPlanId, startCheckoutForPlan } from "@/lib/billing-checkout";
import { getSupabasePublicEnvError } from "@/lib/env";

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

  let submitLabel = "Create Account";
  if (loading && selectedPlan) {
    submitLabel = "Preparing checkout...";
  } else if (loading) {
    submitLabel = "Creating account...";
  } else if (selectedPlan) {
    submitLabel = "Continue to Checkout";
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
    <div className="app-shell-bg min-h-screen overflow-hidden px-4 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="hidden lg:flex lg:flex-col lg:justify-center">
            <div className="app-page-kicker mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Set up a clinic workspace
            </div>
            <h1 className="max-w-lg text-5xl font-semibold tracking-tight text-slate-950">
              Launch a calmer, more reliable front desk in minutes.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-600">
              Start with your clinic basics, train the assistant on real information, and keep your operators in control from inquiry to booking.
            </p>
            <div className="mt-8 grid gap-3">
              {[
                "Guided onboarding and training",
                "Inbox, leads, appointments, and operations included",
                "Operator review and takeover stay honest by design",
              ].map((item) => (
                <div key={item} className="app-card-muted flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-md justify-self-center lg:max-w-none">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 shadow-sm shadow-teal-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900">
              Clinic AI
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            Create your account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Set up your clinic in minutes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="app-card app-gradient-border p-8 sm:p-9">
          {supabaseConfigError && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {supabaseConfigError}
            </div>
          )}

          {selectedPlan && (
            <div className="mb-4 rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm text-teal-800">
              Create your account to continue to checkout for the {selectedPlan} plan.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-slate-700 mb-1.5"
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
                className="block text-sm font-medium text-slate-700 mb-1.5"
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
                className="block text-sm font-medium text-slate-700 mb-1.5"
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
                className="block text-sm font-medium text-slate-700 mb-1.5"
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
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-teal-500/20 transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
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

          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{" "}
            <Link
              href={selectedPlan ? `/login?plan=${selectedPlan}` : "/login"}
              className="font-semibold text-teal-600 hover:text-teal-700"
            >
              Sign in
            </Link>
          </p>
        </form>
          </div>
        </div>
      </div>
    </div>
  );
}
