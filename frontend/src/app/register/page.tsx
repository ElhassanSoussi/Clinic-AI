"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
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
    <div className="auth-page-ambient flex min-h-screen">
      <div className="hidden w-1/2 items-center justify-center p-12 lg:flex">
        <section className="auth-marketing-panel flex h-full w-full max-w-2xl flex-col justify-between p-12 text-white">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card/15 text-sm font-semibold">
                CA
              </div>
              <div>
                <p className="text-sm font-semibold">Clinic AI</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">New workspace</p>
              </div>
            </Link>
          </div>

          <div className="max-w-xl">
            <h1 className="text-4xl font-bold leading-tight tracking-[-0.05em]">
              Start your free trial.
            </h1>
            <p className="auth-panel-lead mt-6">
              Set up your AI-powered front desk in minutes and continue operating from the same workspace as you launch.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              "14-day free trial with the real product.",
              "Guided onboarding into settings and training.",
              "Preview the patient chat before you go live.",
            ].map((item) => (
              <div key={item} className="auth-benefit-item flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-200" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <section className="w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>

          <div className="auth-form-focus p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-[-0.05em] text-foreground">Create your account</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Start with the live Clinic AI product, not a disposable demo environment.
              </p>
            </div>

            {selectedPlan ? (
              <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                You are creating an account for the <span className="font-semibold capitalize">{selectedPlan}</span> plan.
              </div>
            ) : null}

            {error || supabaseConfigError ? (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error || supabaseConfigError}
              </div>
            ) : null}

            <form className="grid gap-5" onSubmit={(e) => void submitRegistration(e)}>
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
                  placeholder="Your Clinic Name"
                />
              </div>
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
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="app-label" htmlFor="reg_email">
                  Email
                </label>
                <input
                  id="reg_email"
                  className="app-field"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@clinic.com"
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
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="app-btn app-btn-primary w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitLabel}
              </button>
            </form>

            <OAuthButtons disabled={loading} />

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
