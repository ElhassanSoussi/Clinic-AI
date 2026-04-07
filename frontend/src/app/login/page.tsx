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
    <div className="app-shell-bg relative min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      {/* Back link */}
      <Link
        href="/"
        className="absolute left-5 top-5 inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2 text-sm font-medium text-[#64748B] shadow-sm transition-colors hover:text-[#0F172A]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="auth-shell grid w-full max-w-6xl gap-0 overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">

          {/* Left panel — marketing */}
          <div className="hidden flex-col justify-between rounded-l-[0.75rem] border-r border-[#E2E8F0] bg-[#F8FAFC] p-8 lg:flex xl:p-10">
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
                  Your workspace is ready
                </div>
                <h1 className="text-2xl font-bold leading-snug tracking-tight text-[#0F172A]">
                  Welcome back. Your front desk is waiting.
                </h1>
                <p className="mt-4 text-sm leading-7 text-[#475569]">
                  Pick up where you left off — conversations, appointment requests, follow-up items, and your AI training workspace are all in one place.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                {trustPoints.map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-3 shadow-sm"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#CCFBF1] text-[#115E59]">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-[#0F172A]">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">
                What stays true
              </p>
              <div className="mt-4 space-y-2.5 text-sm leading-6 text-[#475569]">
                <p>The assistant only uses information you configure.</p>
                <p>Staff can review or take over any conversation at any time.</p>
                <p>Inbox, appointments, and follow-up stay connected in one workspace.</p>
              </div>
              <Link
                href="/trust"
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F766E] hover:text-[#115E59]"
              >
                Read our trust approach
              </Link>
            </div>
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
                  Sign in to your workspace
                </h2>
                <p className="mt-2 text-sm text-[#64748B]">
                  Continue to your inbox, appointments, and AI training panel.
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
                    Sign in to continue to checkout for the{" "}
                    <span className="font-semibold capitalize">{selectedPlan}</span> plan.
                  </div>
                )}

                {visibleError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#DC2626]">
                    {visibleError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
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
                      className="app-input py-2.5"
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
                      className="app-input py-2.5"
                      placeholder="Enter your password"
                      required
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
                        Signing in...
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

                <p className="mt-5 text-center text-sm text-[#64748B]">
                  Don&apos;t have an account?{" "}
                  <Link
                    href={selectedPlan ? `/register?plan=${selectedPlan}` : "/register"}
                    className="font-semibold text-[#0F766E] hover:text-[#115E59]"
                  >
                    Start free trial
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
