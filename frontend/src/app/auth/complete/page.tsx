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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Sign-in failed
          </h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <Link
            href="/login"
            className="inline-flex px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center mx-auto mb-4">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-teal-600 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Finishing sign in...</p>
      </div>
    </div>
  );
}
