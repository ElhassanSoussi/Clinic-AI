"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Bot,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Eye,
  Users,
  LayoutGrid,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { getPaidPlanId, startCheckoutForPlan } from "@/lib/billing-checkout";
import { normalizeAuthError } from "@/lib/auth-errors";
import { getSupabasePublicEnvError } from "@/lib/env";
import { OAUTH_PROVIDERS } from "@/lib/oauth-providers";

const OAuthButtons = dynamic(() => import("@/components/shared/OAuthButtons"), {
  ssr: false,
});

const AUTH_ERROR_COOKIE = "clinic_ai_auth_error";

type LoginFormSubmitEvent = Parameters<
  NonNullable<ComponentProps<"form">["onSubmit"]>
>[0];

function formatOAuthError(raw: string | null): string {
  return normalizeAuthError(raw);
}

function readCookie(name: string): string | null {
  if (globalThis.document === undefined) return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix));
  if (!match) return null;
  return match.slice(prefix.length);
}

function clearCookie(name: string) {
  if (globalThis.document === undefined) return;
  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
}

const trustPoints = [
  {
    icon: Eye,
    text: "Every conversation is visible to your team",
  },
  {
    icon: Users,
    text: "Staff can review or take over any thread",
  },
  {
    icon: ShieldCheck,
    text: "Grounded in your clinic information only",
  },
  {
    icon: LayoutGrid,
    text: "Inbox, appointments, and follow-up in one place",
  },
];

export default function LoginPage() {
  const { login, setAuthenticatedUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthError, setOauthError] = useState("");
  const [queryReady, setQueryReady] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"professional" | "premium" | null>(null);

  const supabaseConfigError =
    typeof getSupabasePublicEnvError === "function"
      ? getSupabasePublicEnvError()?.message ?? ""
      : "";

  const microsoftEnabled = OAUTH_PROVIDERS.some(
    (provider) => provider.id === "azure" && provider.enabled !== false
  );

  useEffect(() => {
    const searchParams =
      globalThis.window === undefined
        ? new URLSearchParams()
        : new URLSearchParams(globalThis.location.search);

    setSelectedPlan(getPaidPlanId(searchParams.get("plan")));

    const authError =
      readCookie(AUTH_ERROR_COOKIE) ?? searchParams.get("auth_error");
    const formatted = formatOAuthError(authError);
    setOauthError(formatted);
    clearCookie(AUTH_ERROR_COOKIE);

    if (searchParams.get("auth_error") && globalThis.window !== undefined) {
      const params = new URLSearchParams(globalThis.location.search);
      params.delete("auth_error");
      const nextUrl = params.size
        ? `${globalThis.location.pathname}?${params.toString()}`
        : globalThis.location.pathname;
      globalThis.history.replaceState(null, "", nextUrl);
    }

    setQueryReady(true);
  }, [microsoftEnabled]);

  const visibleError = error || oauthError;

  const handleSubmit = async (e: LoginFormSubmitEvent) => {
    e.preventDefault();
    setError("");

    if (supabaseConfigError) {
      setError(supabaseConfigError);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
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

      <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
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
          <div className="relative z-1 my-auto max-w-lg py-10">
            <div className="marketing-kicker mb-7">
              <ShieldCheck className="h-3.5 w-3.5" />
              Your workspace is waiting
            </div>
            <h1 className="text-[clamp(2rem,2vw+1rem,3.2rem)] font-bold leading-[1.04] tracking-[-0.04em] text-white text-balance">
              Pick up where your team left off, in one composed workspace.
            </h1>
            <p className="auth-panel-lead mt-6 max-w-md">
              Conversations, booking pressure, follow-up load, and AI training — all from a single operating surface instead of disconnected tools.
            </p>

            {/* Live status chips */}
            <div className="mt-9 flex flex-wrap gap-2.5">
              {[
                { label: "Inbox", value: "Live" },
                { label: "Bookings", value: "Ready" },
                { label: "Team view", value: "Shared" },
              ].map((item) => (
                <div key={item.label} className="inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/6 px-4 py-2 backdrop-blur-sm">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{item.label}</span>
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Trust guarantees */}
            <div className="mt-10 space-y-2.5">
              {trustPoints.map((item) => (
                <div key={item.text} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 px-4 py-3">
                  <item.icon className="h-4 w-4 shrink-0 text-teal-300/80" />
                  <span className="text-[0.875rem] text-slate-200">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer promise */}
          <div className="relative z-1">
            <Link href="/trust" className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-teal-300/90 transition-colors hover:text-teal-200">
              Read our trust approach →
            </Link>
          </div>
        </div>

        {/* ═══ Right — sign-in form ═══ */}
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
                Welcome back
              </h2>
              <p className="mt-2 text-[0.9375rem] text-app-text-muted">
                Sign in to your clinic workspace
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
                  Sign in to continue to checkout for the{" "}
                  <span className="font-semibold capitalize">{selectedPlan}</span> plan.
                </div>
              )}

              {visibleError && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {visibleError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-app-text">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="app-input"
                    placeholder="you@clinic.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-app-text">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="app-input"
                    placeholder="Enter your password"
                    required
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
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>

              <OAuthButtons
                disabled={loading || !!supabaseConfigError || !queryReady}
                nextPath={selectedPlan ? `/auth/complete?plan=${selectedPlan}` : undefined}
              />
            </div>

            <p className="mt-6 text-center text-sm text-app-text-muted">
              Don&apos;t have an account?{" "}
              <Link
                href={selectedPlan ? `/register?plan=${selectedPlan}` : "/register"}
                className="font-semibold text-app-primary hover:underline"
              >
                Start free trial
              </Link>
              {" · "}
              <Link href="/product" className="font-semibold text-app-text hover:underline">
                Product map
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}