"use client";

import { useEffect, useState, type ComponentProps } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Bot, Loader2, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
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
    <div className="app-shell-bg relative min-h-screen overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(127,86,217,0.12),transparent_45%)]" />
      <Link
        href="/"
        className="absolute left-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm backdrop-blur transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="hidden lg:flex lg:flex-col lg:justify-center">
            <div className="app-page-kicker mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Premium clinic workspace
            </div>
            <h1 className="max-w-lg text-5xl font-semibold tracking-tight text-slate-950">
              Welcome back to the front desk command center.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-600">
              Review patient conversations, manage booking flow, and keep your clinic responsive without losing the operator oversight your team needs.
            </p>
            <div className="mt-8 grid gap-3">
              {[
                "One inbox for chat and SMS",
                "Manual takeover and human review when needed",
                "Appointments, follow-up, and operations in one workspace",
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
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to your clinic dashboard
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
              Sign in to continue to checkout for the {selectedPlan} plan.
            </div>
          )}

          {visibleError && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {visibleError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email
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
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
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
          </div>

          <button
            type="submit"
            disabled={loading || !!supabaseConfigError}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-teal-500/20 transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          <OAuthButtons
            disabled={loading || !!supabaseConfigError || !queryReady}
            nextPath={selectedPlan ? `/auth/complete?plan=${selectedPlan}` : undefined}
          />

          <p className="text-center text-sm text-slate-500 mt-4">
            Don&apos;t have an account?{" "}
            <Link
              href={selectedPlan ? `/register?plan=${selectedPlan}` : "/register"}
              className="font-semibold text-teal-600 hover:text-teal-700"
            >
              Create one
            </Link>
          </p>
        </form>
          </div>
        </div>
      </div>
    </div>
  );
}
