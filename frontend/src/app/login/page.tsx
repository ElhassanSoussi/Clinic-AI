"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Bot, Loader2, ShieldCheck } from "lucide-react";
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
              <p className="text-xs uppercase tracking-[0.22em] text-white/55">Operating system</p>
            </div>
          </div>

          <div className="max-w-xl">
            <div className="marketing-kicker border-white/15 bg-white/6 text-teal-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Premium entry experience
            </div>
            <h1 className="mt-7 text-[clamp(2.5rem,3vw,4rem)] font-bold leading-[0.98] tracking-[-0.055em]">
              Return to the composed front-desk workspace your team actually operates from.
            </h1>
            <p className="auth-panel-lead mt-6 max-w-lg">
              Inbox, appointments, leads, follow-up, and training all stay inside one calm operating surface built for real clinics.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-200">
            {[
              "Every conversation stays visible to staff.",
              "Go live only when configuration is complete.",
              "The patient-facing assistant stays grounded in clinic information.",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="auth-form-focus px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-8 text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-app-text-muted">
              Sign in
            </p>
            <h2 className="mt-4 text-[clamp(2rem,3vw,3rem)] font-bold tracking-[-0.055em] text-app-text">
              Welcome back
            </h2>
            <p className="mt-3 text-sm leading-7 text-app-text-secondary">
              Sign in to your clinic workspace and pick up where the front desk left off.
            </p>
          </div>

          {selectedPlan ? (
            <div className="mb-5 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
              Sign in to continue to checkout for the <span className="font-semibold capitalize">{selectedPlan}</span> plan.
            </div>
          ) : null}

          {visibleError ? (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
              />
            </div>
            <button type="submit" className="app-btn app-btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <OAuthButtons disabled={loading} />

          <p className="mt-6 text-center text-sm text-app-text-secondary lg:text-left">
            New to Clinic AI?{" "}
            <Link href="/register" className="font-semibold text-app-primary">
              Start free trial
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
