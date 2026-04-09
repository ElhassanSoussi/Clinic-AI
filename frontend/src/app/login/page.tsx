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
    <div className="auth-page-ambient relative min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      {/* Back link */}
      <Link
        href="/"
        className="absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white/95 px-4 py-2.5 text-[0.9375rem] font-medium text-slate-600 shadow-sm backdrop-blur-sm transition-colors hover:border-slate-300 hover:text-[#0F172A]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center">
        <div className="auth-shell auth-stage-shell grid w-full max-w-7xl gap-0 overflow-hidden lg:grid-cols-[1fr_1.02fr]">

          {/* Left panel — marketing */}
          <div className="auth-marketing-panel hidden flex-col justify-between rounded-l-[2rem] border-r border-slate-700/70 p-8 lg:flex xl:p-12">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F766E] shadow-md shadow-teal-900/30">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-base font-semibold leading-none text-white">Clinic AI</p>
                  <p className="auth-panel-footnote mt-1 leading-none">AI front-desk OS</p>
                </div>
              </Link>

              <div className="mt-12">
                <div className="marketing-kicker mb-6">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Your workspace is ready
                </div>
                <h1 className="text-[clamp(2.15rem,1.5vw+1.4rem,3.55rem)] font-bold leading-[1.02] tracking-[-0.05em]">
                  Re-enter the clinic operating system your team already works from.
                </h1>
                <p className="auth-panel-lead mt-5">
                  Pick up conversations, booking pressure, follow-up load, and AI training from one composed workspace instead of bouncing between disconnected front-desk tools.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Inbox", value: "Live", hint: "Web chat and SMS threads" },
                  { label: "Bookings", value: "Ready", hint: "Requests, deposits, reminders" },
                  { label: "Team view", value: "Shared", hint: "Human review stays visible" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">{item.value}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.hint}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-3">
                {trustPoints.map((item) => (
                  <div
                    key={item.text}
                    className="auth-panel-card flex items-center gap-3.5 px-4 py-3.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-200">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="text-[0.9375rem] font-medium text-slate-100">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="auth-panel-card mt-10 p-6 xl:mt-12">
              <p className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-400">Operator promise</p>
              <div className="mt-4 grid gap-3 text-[0.9375rem] leading-relaxed text-slate-300">
                <div className="rounded-xl border border-white/10 bg-white/6 px-4 py-3">
                  Built for real clinic operations, not generic chatbot management.
                </div>
                <div className="rounded-xl border border-white/10 bg-white/6 px-4 py-3">
                  Grounded in configured clinic facts, with human takeover available any time.
                </div>
              </div>
              <Link href="/trust" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-300 hover:text-teal-200">
                Read our trust approach
              </Link>
            </div>
          </div>

          {/* Right panel — form */}
          <div className="auth-form-column flex items-center justify-center p-8 xl:p-12">
            <div className="w-full max-w-md">
              <div className="mb-10 text-center">
                {/* Mobile logo */}
                <Link href="/" className="mb-6 inline-flex items-center gap-2.5 lg:hidden">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] shadow-sm">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-base font-semibold text-[#0F172A]">Clinic AI</span>
                </Link>
                <h2 className="text-[2.3rem] font-bold tracking-[-0.05em] text-[#0F172A] sm:text-[2.7rem]">
                  Sign in to Clinic AI
                </h2>
                <p className="marketing-body mx-auto mt-3 max-w-sm text-center text-slate-600">
                  Continue to the workspace that runs conversations, requests, appointments, and assistant quality in one system.
                </p>
                <p className="marketing-body mx-auto mt-4 max-w-sm text-center text-sm text-slate-600">
                  New to Clinic AI?{" "}
                  <Link href="/register" className="font-semibold text-[#0F766E] hover:text-[#115E59]">
                    Create a workspace
                  </Link>
                  {" · "}
                  <Link href="/product" className="font-semibold text-slate-800 hover:text-[#0F172A]">
                    Product map
                  </Link>
                </p>
              </div>

              <div className="auth-form-focus p-8 shadow-[0_40px_78px_-42px_rgb(12_18_32/0.34)]">
                <div className="mb-5 rounded-[1rem] border border-[#DDE5EE] bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.92))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Workspace access</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#475569]">
                    Your dashboard keeps the same routes and behavior. This entry surface is new, not the product logic behind it.
                  </p>
                </div>
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
                      className="mb-2 block text-[0.9375rem] font-medium text-[#0F172A]"
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
                      className="mb-2 block text-[0.9375rem] font-medium text-[#0F172A]"
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
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F766E] px-4 py-3.5 text-base font-semibold text-white shadow-md shadow-teal-900/15 transition-colors hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
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

                <p className="mt-6 text-center text-[0.9375rem] text-slate-600">
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
