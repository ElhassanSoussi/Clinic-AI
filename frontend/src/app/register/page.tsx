"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { getPaidPlanId, startCheckoutForPlan } from "@/lib/billing-checkout";
import { getSupabasePublicEnvError } from "@/lib/env";
import { createClient } from "@/utils/supabase/client";
import OAuthButtons from "@/components/shared/OAuthButtons";

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
  const [queryReady, setQueryReady] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"professional" | "premium" | null>(null);
  const supabaseConfigError =
    typeof getSupabasePublicEnvError === "function"
      ? getSupabasePublicEnvError()?.message ?? ""
      : "";

  useEffect(() => {
    if (globalThis.window !== undefined) {
      setSelectedPlan(
        getPaidPlanId(new URLSearchParams(globalThis.location.search).get("plan"))
      );
    }

    setQueryReady(true);
  }, []);

  let submitLabel = "Create Account";
  if (loading && selectedPlan) {
    submitLabel = "Preparing checkout...";
  } else if (loading) {
    submitLabel = "Creating account...";
  } else if (selectedPlan) {
    submitLabel = "Continue to Checkout";
  }

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  async function submitRegistration(
    e: Parameters<NonNullable<React.ComponentProps<"form">["onSubmit"]>>[0]
  ) {
    e.preventDefault();
    setError("");

    if (supabaseConfigError) {
      setError(supabaseConfigError);
      return;
    }

    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim() || !form.clinic_name.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.register(form);
      
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      });
      if (authError) throw authError;

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

  const handleSubmit = (
    e: Parameters<NonNullable<React.ComponentProps<"form">["onSubmit"]>>[0]
  ) => {
    void submitRegistration(e);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold text-slate-900">
              Clinic AI
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            Create your account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Set up your clinic in minutes
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm"
        >
          {supabaseConfigError && (
            <div className="mb-4 p-3 bg-amber-50 text-amber-800 text-sm rounded-lg border border-amber-200">
              {supabaseConfigError}
            </div>
          )}

          {selectedPlan && (
            <div className="mb-4 p-3 bg-teal-50 text-teal-800 text-sm rounded-lg border border-teal-100">
              Create your account to continue to checkout for the {selectedPlan} plan.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Full Name
              </label>
              <input
                id="full_name"
                type="text"
                value={form.full_name}
                onChange={(e) => updateField("full_name", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-slate-400"
                placeholder="Dr. Jane Smith"
                required
              />
            </div>

            <div>
              <label
                htmlFor="clinic_name"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Clinic Name
              </label>
              <input
                id="clinic_name"
                type="text"
                value={form.clinic_name}
                onChange={(e) => updateField("clinic_name", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-slate-400"
                placeholder="Sunrise Medical Clinic"
                required
              />
            </div>

            <div>
              <label
                htmlFor="reg_email"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="reg_email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-slate-400"
                placeholder="you@clinic.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="reg_password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="reg_password"
                type="password"
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-slate-400"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !!supabaseConfigError}
            className="w-full mt-6 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {submitLabel}
              </>
            ) : (
              submitLabel
            )}
          </button>

          <OAuthButtons
            disabled={loading || !!supabaseConfigError || !queryReady}
            nextPath={selectedPlan ? `/auth/complete?plan=${selectedPlan}` : undefined}
          />

          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{" "}
            <Link
              href={selectedPlan ? `/login?plan=${selectedPlan}` : "/login"}
              className="text-teal-600 font-medium hover:text-teal-700"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
