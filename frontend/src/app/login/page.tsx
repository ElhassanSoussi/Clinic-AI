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
    <div className="app-shell-bg relative min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-sm font-semibold text-[#64748B] shadow-sm transition-colors hover:text-[#0F172A]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="auth-shell grid w-full max-w-6xl gap-8 p-5 sm:p-6 lg:grid-cols-[0.96fr_1.04fr] lg:p-8">
          <div className="hidden rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-8 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="app-page-kicker mb-6">
                <Sparkles className="h-3.5 w-3.5" />
                Premium clinic workspace
              </div>
              <h1 className="max-w-lg text-2xl font-semibold text-[#0F172A]">
                Welcome back. Your front desk is waiting.
              </h1>
              <p className="mt-6 max-w-lg text-sm leading-6 text-[#475569]">
                Pick up where you left off — conversations, bookings, and follow-up items are all in one place.
              </p>
              <div className="mt-8 grid gap-3">
                {[
                  "Web chat and SMS in one inbox",
                  "Staff can review or take over any thread",
                  "Appointments, follow-up, and operations together",
                ].map((item) => (
                  <div key={item} className="app-card-muted flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#0F172A]">
                    <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="workspace-rail-card p-5">
              <p className="workspace-section-label">What stays true</p>
              <div className="mt-4 space-y-3 text-sm text-[#475569]">
                <p>The assistant only uses information you configure.</p>
                <p>Staff can review or take over any conversation at any time.</p>
                <p>Inbox, appointments, and follow-up stay connected in one workspace.</p>
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
                  <span className="text-lg font-semibold text-[#0F172A]">Clinic AI</span>
                </Link>
                <h1 className="text-2xl font-semibold text-[#0F172A]">Sign in to your clinic workspace</h1>
                <p className="mt-2 text-sm text-[#64748B]">
                  Continue into your inbox, appointments, follow-up queue, and training workspace.
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
                    Sign in to continue to checkout for the {selectedPlan} plan.
                  </div>
                )}

                {visibleError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#DC2626]">
                    {visibleError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-[#0F172A]"
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
                      className="mb-1.5 block text-sm font-medium text-[#0F172A]"
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
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F766E] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
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

                <p className="mt-4 text-center text-sm text-[#64748B]">
                  Don&apos;t have an account?{" "}
                  <Link
                    href={selectedPlan ? `/register?plan=${selectedPlan}` : "/register"}
                    className="font-semibold text-[#0F766E] hover:text-[#115E59]"
                  >
                    Create one
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
