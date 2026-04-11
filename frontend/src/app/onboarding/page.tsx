"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Rocket, Save, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { computeSystemStatus } from "@/lib/system-status";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import type { Clinic } from "@/types";

export default function OnboardingPage() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    services: "",
    address: "",
  });

  const loadClinic = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.clinics.getMyClinic();
      setClinic(data);
      setForm({
        name: data.name ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        services: Array.isArray(data.services) ? data.services.join(", ") : "",
        address: data.address ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load onboarding.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClinic();
  }, [loadClinic]);

  const status = useMemo(() => (clinic ? computeSystemStatus(clinic) : null), [clinic]);

  const save = async () => {
    setSaving(true);
    setNotice("");
    setError("");
    try {
      const updated = await api.clinics.updateMyClinic({
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        services: form.services.split(",").map((item) => item.trim()).filter(Boolean),
      });
      setClinic(updated);
      setNotice("Clinic onboarding details saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save onboarding.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading onboarding..." detail="Preparing your clinic workspace" />;
  if (error && !clinic) return <ErrorState message={error} onRetry={() => void loadClinic()} />;
  if (!clinic || !status) return <LoadingState message="Loading onboarding..." />;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="bg-card rounded-[2.2rem] px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="marketing-kicker">
              <Sparkles className="h-3.5 w-3.5" />
              Guided activation
            </div>
            <h1 className="mt-6 text-[clamp(2.2rem,3vw,3.8rem)] font-semibold tracking-[-0.055em] text-foreground">
              Finish the clinic setup with clear launch steps.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              Onboarding now shares the same premium control-center family as the rest of the app. Configure the essentials here, then continue in Settings for the deeper controls.
            </p>
          </div>
          <Link href="/dashboard/settings" className="app-btn app-btn-secondary">
            Open full settings
          </Link>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="bg-card rounded-[1.8rem] p-6">
            <h2 className="text-xl font-semibold tracking-[-0.04em] text-foreground">Clinic essentials</h2>
            {notice ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {notice}
              </div>
            ) : null}
            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="app-label">Clinic name</label>
                <input className="app-field" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div>
                <label className="app-label">Phone</label>
                <input className="app-field" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div>
                <label className="app-label">Email</label>
                <input className="app-field" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div>
                <label className="app-label">Address</label>
                <input className="app-field" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="app-label">Services</label>
                <textarea className="app-textarea" value={form.services} onChange={(e) => setForm((prev) => ({ ...prev, services: e.target.value }))} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="app-btn app-btn-primary" onClick={() => void save()} disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save essentials"}
              </button>
              <Link href={clinic.slug ? `/chat/${clinic.slug}` : "/dashboard"} className="app-btn app-btn-secondary">
                Preview chat
              </Link>
            </div>
          </section>

          <section className="grid gap-5">
            <div className="bg-card rounded-[1.8rem] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Readiness</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">{status.status.replaceAll("_", " ")}</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                {status.completedCount} of {status.totalCount} core launch areas complete.
              </p>
            </div>
            <div className="bg-card rounded-[1.8rem] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Next steps</p>
              <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
                {status.items.map((item) => (
                  <li key={item.key} className="flex items-start gap-3">
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${item.completed ? "text-emerald-500" : "text-muted-foreground"}`} />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-[1.8rem] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Launch</p>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                When the clinic is configured, use the Settings go-live controls to publish the assistant intentionally.
              </p>
              <Link href="/dashboard/settings" className="app-btn app-btn-primary mt-4">
                <Rocket className="h-4 w-4" />
                Continue in settings
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
