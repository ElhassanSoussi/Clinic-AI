"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Loader2, AlertTriangle } from "lucide-react";
import { normalizeAuthError } from "@/lib/auth-errors";
import { getSupabasePublicEnvError } from "@/lib/env";
import { createClient } from "@/utils/supabase/client";
import { getPaidPlanId, startCheckoutForPlan } from "@/lib/billing-checkout";
import { useAuth } from "@/lib/auth-context";

async function waitForSession(retries = 5, delay = 500) {
  const supabase = createClient();
  for (let i = 0; i < retries; i++) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) return session;
    await new Promise((r) => setTimeout(r, delay));
  }
  return null;
}

export default function AuthCompletePage() {
  const { login, loginWithOnboarding, setAuthenticatedUser } = useAuth();
  const ran = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function complete() {
      try {
        const configError =
          typeof getSupabasePublicEnvError === "function"
            ? getSupabasePublicEnvError()?.message ?? ""
            : "";

        if (configError) {
          setError(configError);
          return;
        }

        const selectedPlan =
          globalThis.window === undefined
            ? null
            : getPaidPlanId(
              new URLSearchParams(globalThis.location.search).get("plan")
            );

        const session = await waitForSession();

        if (!session?.access_token) {
          setError("No session found after sign-in. Please try again.");
          return;
        }

        const res = await fetch("/api/auth/oauth-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: session.access_token }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(normalizeAuthError(body.detail || `Server error: ${res.status}`));
        }

        const data = await res.json();

        if (selectedPlan) {
          setAuthenticatedUser(data);
          await startCheckoutForPlan(selectedPlan);
          return;
        }

        if (data.is_new) {
          loginWithOnboarding(data);
        } else {
          login(data);
        }
      } catch (err) {
        setError(
          err instanceof Error ? normalizeAuthError(err.message) : "Sign-in failed. Please try again."
        );
      }
    }

    complete();
  }, [login, loginWithOnboarding, setAuthenticatedUser]);

  if (error) {
    return (
      <div className="auth-page-ambient flex min-h-screen items-center justify-center px-4 py-12">
        <div className="auth-form-focus w-full max-w-md px-8 py-10 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100">
            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-app-text">
            Sign-in failed
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-app-text-secondary">{error}</p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-app-primary-hover px-5 py-3 text-sm font-semibold text-white shadow-md shadow-teal-900/15 transition-colors hover:bg-app-primary-deep"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-ambient flex min-h-screen items-center justify-center px-4 py-12">
      <div className="auth-form-focus w-full max-w-sm px-10 py-12 text-center">
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-app-primary-hover shadow-md shadow-teal-900/20">
          <Bot className="h-6 w-6 text-white" aria-hidden />
        </div>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-app-primary-hover" aria-hidden />
        <p className="mt-5 text-sm font-medium text-app-text-muted">Finishing sign in…</p>
        <p className="mt-2 text-xs leading-relaxed text-app-text-muted">
          Securely completing your session. This usually takes a moment.
        </p>
      </div>
    </div>
  );
}
