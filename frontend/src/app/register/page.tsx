"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Bot, Check, Loader2, Sparkles } from "lucide-react";
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

const onboardingHighlights = [
  "Guided setup focused on clinic basics, training, and launch readiness",
  "Preview the real patient-facing chat before publishing",
  "Shared staff workspace from day one",
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
  const [selectedPlan, setSelectedPlan] = useState<"professional" | "premium" | null>(null);

  const supabaseConfigError =
    typeof getSupabasePublicEnvError === "function"
      ? getSupabasePublicEnvError()?.message ?? ""
      : "";

  useEffect(() => {
    if (globalThis.window === undefined) return;
    const params = new URLSearchParams(globalThis.location.search);
    setSelectedPlan(getPaidPlanId(params.get("plan")));
  }, []);

  const updateField = (field: keyof typeof form, value: string) => {
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

  const submitLabel = loading
    ? selectedPlan
      ? "Preparing checkout..."
      : "Creating account..."
    : selectedPlan
      ? "Continue to checkout"
      : "Create account";

  return (
    <div className="auth-page-ambient px-6 py-8 lg:px-10 lg:py-10">
      <Link href="/" className="app-btn app-btn-secondary mb-8">
        <ArrowLeft className="h-4 w-4" />
        Back home
      </Link>

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="auth-marketing-panel hidden rounded-[2.2rem] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/14">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Clinic AI</p>
              <p className="text-xs uppercase tracking-[0.22em] text-white/55">Premium onboarding</p>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="marketing-kicker border-white/15 bg-white/6 text-teal-200">
              <Sparkles className="h-3.5 w-3.5" />
              14-day free trial
            </div>
            <h1 className="mt-7 text-[clamp(2.5rem,3vw,4rem)] font-bold leading-[0.98] tracking-[-0.055em]">
              Launch a more composed front-desk experience without rebuilding your workflow from scratch.
            </h1>
            <p className="auth-panel-lead mt-6 max-w-lg">
              Set up clinic basics, train the assistant on real information, preview the chat, and go live from the same workspace.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-200">
            {onboardingHighlights.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-200" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="auth-form-focus px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-8 text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-app-text-muted">
              Create workspace
            </p>
            <h2 className="mt-4 text-[clamp(2rem,3vw,3rem)] font-bold tracking-[-0.055em] text-app-text">
              Start Clinic AI
            </h2>
            <p className="mt-3 text-sm leading-7 text-app-text-secondary">
              Get the real product, not a throwaway demo. Configure once, then keep operating in the same environment.
            </p>
          </div>

          {selectedPlan ? (
            <div className="mb-5 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
              You’re creating an account for the <span className="font-semibold capitalize">{selectedPlan}</span> plan.
            </div>
          ) : null}

          {error || supabaseConfigError ? (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error || supabaseConfigError}
            </div>
          ) : null}

          <form className="grid gap-5" onSubmit={(e) => void submitRegistration(e)}>
            <div>
              <label className="app-label" htmlFor="full_name">
                Your name
              </label>
              <input
                id="full_name"
                className="app-field"
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="app-label" htmlFor="clinic_name">
                Clinic name
              </label>
              <input
                id="clinic_name"
                className="app-field"
                value={form.clinic_name}
                onChange={(e) => updateField("clinic_name", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="app-label" htmlFor="reg_email">
                Work email
              </label>
              <input
                id="reg_email"
                className="app-field"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="app-label" htmlFor="reg_password">
                Password
              </label>
              <input
                id="reg_password"
                className="app-field"
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="app-btn app-btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitLabel}
            </button>
          </form>

          <OAuthButtons disabled={loading} />

          <p className="mt-6 text-center text-sm text-app-text-secondary lg:text-left">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-app-primary">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
