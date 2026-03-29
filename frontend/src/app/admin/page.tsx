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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-8">
            <Shield className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl font-bold text-slate-900">Admin Access</h1>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <label htmlFor="admin-secret" className="block text-sm font-medium text-slate-700 mb-1.5">
                Admin Secret
              </label>
              <input
                id="admin-secret"
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="Enter admin secret"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              onClick={handleLogin}
              disabled={loading || !secret.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Access Admin Panel
            </button>
          </div>
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-3 h-3 inline mr-1" />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
            </Link>
            <span className="text-sm font-medium text-slate-400">/</span>
            <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-teal-600" />
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              {clinics.length} clinics
            </span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">All Clinics</h1>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Clinic</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Leads</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Users</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Onboarded</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clinics.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-400">{c.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 capitalize">{c.plan || "trial"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(c.subscription_status)}`}>
                        {c.subscription_status || "none"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {c.monthly_leads_used ?? 0} / {c.monthly_lead_limit === -1 ? "∞" : (c.monthly_lead_limit ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700 flex items-center justify-end gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {c.user_count}
                    </td>
                    <td className="px-4 py-3">
                      {c.onboarding_completed ? (
                        <span className="text-emerald-600 text-xs font-medium">Yes</span>
                      ) : (
                        <span className="text-amber-600 text-xs font-medium">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {clinics.length === 0 && (
            <div className="py-12 text-center text-slate-400">No clinics found.</div>
          )}
        </div>
      </main>
    </div>
  );
}
