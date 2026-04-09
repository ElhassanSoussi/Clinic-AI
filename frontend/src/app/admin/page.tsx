"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, ArrowLeft, Shield, Loader2, Users, Building2 } from "lucide-react";
import { getPublicApiUrl } from "@/lib/api-url";

interface AdminClinic {
  id: string;
  name: string;
  slug: string;
  plan: string;
  subscription_status: string;
  monthly_leads_used: number;
  monthly_lead_limit: number;
  onboarding_completed: boolean;
  created_at: string;
  user_count: number;
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [clinics, setClinics] = useState<AdminClinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);

  const handleLogin = async () => {
    if (!secret.trim()) return;
    setLoading(true);
    setError("");
    try {
      const apiUrl = getPublicApiUrl();
      const res = await fetch(`${apiUrl}/admin/clinics`, {
        headers: { "X-Admin-Secret": secret },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      setClinics(data.clinics);
      setAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-50 text-emerald-700";
      case "trialing": return "bg-blue-50 text-blue-700";
      case "past_due": return "bg-red-50 text-red-700";
      default: return "bg-slate-100 text-slate-600";
    }
  };

  if (!authenticated) {
    return (
      <div className="auth-page-ambient flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-app-primary-hover)] shadow-md shadow-teal-900/20">
              <Shield className="h-5 w-5 text-white" aria-hidden />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-app-text)]">Admin access</h1>
          </div>
          <div className="auth-form-focus space-y-4 p-7">
            <div>
              <label htmlFor="admin-secret" className="mb-1.5 block text-sm font-medium text-[var(--color-app-text)]">
                Admin secret
              </label>
              <input
                id="admin-secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                className="app-input w-full py-2.5 text-sm"
                placeholder="Enter admin secret"
              />
            </div>
            {error && <p className="text-sm text-[var(--color-status-danger)]">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={loading || !secret.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-app-primary-hover)] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-teal-900/15 transition-colors hover:bg-[var(--color-app-primary-deep)] disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Access Admin Panel
            </button>
          </div>
          <div className="mt-5 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-app-text-muted)] transition-colors hover:text-[var(--color-app-text)]"
            >
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-flow-ambient min-h-screen">
      <nav className="flow-sticky-header">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-app-primary-hover)] shadow-sm">
                <Bot className="h-5 w-5 text-white" aria-hidden />
              </div>
            </Link>
            <span className="text-sm font-medium text-[var(--color-app-text-muted)]">/</span>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-app-text)]">
              <Shield className="h-4 w-4 text-[var(--color-app-primary-hover)]" aria-hidden />
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-[var(--color-app-text-muted)]">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 opacity-80" aria-hidden />
              {clinics.length} clinics
            </span>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
        <h1 className="mb-1 text-2xl font-bold tracking-tight text-[var(--color-app-text)]">All clinics</h1>
        <p className="mb-6 text-sm text-[var(--color-app-text-muted)]">Workspace accounts and subscription state.</p>

        <div className="ds-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="ds-card-header border-b border-[var(--color-app-border)]">
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-app-text-secondary)]">Clinic</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-app-text-secondary)]">Plan</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-app-text-secondary)]">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-app-text-secondary)]">Leads</th>
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-app-text-secondary)]">Users</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-app-text-secondary)]">Onboarded</th>
                  <th className="px-4 py-3 text-left font-semibold text-[var(--color-app-text-secondary)]">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-app-border)]">
                {clinics.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-[var(--color-app-canvas)]/80">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[var(--color-app-text)]">{c.name}</p>
                        <p className="text-xs text-[var(--color-app-text-muted)]">{c.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-[var(--color-app-text-secondary)]">{c.plan || "trial"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.subscription_status)}`}>
                        {c.subscription_status || "none"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--color-app-text-secondary)]">
                      {c.monthly_leads_used ?? 0} / {c.monthly_lead_limit === -1 ? "∞" : (c.monthly_lead_limit ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-app-text-secondary)]">
                      <span className="inline-flex items-center justify-end gap-1 tabular-nums">
                        <Users className="h-3.5 w-3.5 text-[var(--color-app-text-muted)]" aria-hidden />
                        {c.user_count}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.onboarding_completed ? (
                        <span className="text-xs font-medium text-[var(--color-status-success)]">Yes</span>
                      ) : (
                        <span className="text-xs font-medium text-[var(--color-status-warning)]">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-app-text-muted)]">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {clinics.length === 0 && (
            <div className="py-12 text-center text-sm text-[var(--color-app-text-muted)]">No clinics found.</div>
          )}
        </div>
      </main>
    </div>
  );
}
