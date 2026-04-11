"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { getPaidPlanId, startCheckoutForPlan } from "@/lib/billing-checkout";
import { normalizeAuthError } from "@/lib/auth-errors";
import { getSupabasePublicEnvError } from "@/lib/env";

const OAuthButtons = dynamic(() => import("@/components/shared/OAuthButtons"), {
  ssr: false,
});

type LoginFormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

export default function LoginPage() {
  const { login, setAuthenticatedUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const visibleError = normalizeAuthError(error || supabaseConfigError);

  const handleSubmit = async (e: LoginFormSubmitEvent) => {
    e.preventDefault();
    setError("");

    if (supabaseConfigError) {
      setError(supabaseConfigError);
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login({ email, password });

      if (selectedPlan) {
        setAuthenticatedUser(res);
        await startCheckoutForPlan(selectedPlan);
        return;
      }

      login(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

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
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Return to workspace</p>
              </div>
            </Link>
          </div>

          <div className="max-w-xl">
            <h1 className="text-4xl font-bold leading-tight tracking-[-0.05em]">
              Welcome back to Clinic AI.
            </h1>
            <p className="auth-panel-lead mt-6">
              Your front desk workspace is ready with conversations, bookings, follow-up, and clinic operations in one place.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              "Review patient conversations in one inbox.",
              "Track leads, bookings, and operational follow-up.",
              "Manage settings, training, and go-live controls.",
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
              <h2 className="text-3xl font-bold tracking-[-0.05em] text-foreground">Log in to your account</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Enter your credentials to continue into the live product workspace.
              </p>
            </div>

            {selectedPlan ? (
              <div className="mb-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                Sign in to continue checkout for the <span className="font-semibold capitalize">{selectedPlan}</span> plan.
              </div>
            ) : null}

            {visibleError ? (
              <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {visibleError}
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
              <div>
                <label className="app-label" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  className="app-field"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@clinic.com"
                />
              </div>
              <div>
                <label className="app-label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  className="app-field"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="app-btn app-btn-primary w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <OAuthButtons disabled={loading} />

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Do not have an account?{" "}
              <Link href="/register" className="font-semibold text-primary">
                Start free trial
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
