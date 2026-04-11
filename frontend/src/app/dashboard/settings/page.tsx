"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Code, Rocket, Save } from "lucide-react";
import { api } from "@/lib/api";
import { computeSystemStatus } from "@/lib/system-status";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import type { Clinic } from "@/types";

export default function SettingsPage() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    assistant_name: "",
    phone: "",
    email: "",
    address: "",
    services: "",
    faq: "",
    notification_email: "",
    notifications_enabled: false,
    availability_enabled: false,
    reminder_enabled: false,
    primary_color: "#118579",
  });

  const loadClinic = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.clinics.getMyClinic();
      setClinic(data);
      setForm({
        name: data.name ?? "",
        assistant_name: data.assistant_name ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        address: data.address ?? "",
        services: Array.isArray(data.services) ? data.services.join(", ") : "",
        faq: Array.isArray(data.faq)
          ? data.faq.map((item) => `${item.question}: ${item.answer}`).join("\n")
          : "",
        notification_email: data.notification_email ?? "",
        notifications_enabled: !!data.notifications_enabled,
        availability_enabled: !!data.availability_enabled,
        reminder_enabled: !!data.reminder_enabled,
        primary_color: data.primary_color ?? "#118579",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadClinic();
  }, [loadClinic]);

  const readiness = useMemo(
    () => (clinic ? computeSystemStatus(clinic) : null),
    [clinic]
  );

  const save = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await api.clinics.updateMyClinic({
        name: form.name,
        assistant_name: form.assistant_name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        services: form.services.split(",").map((item) => item.trim()).filter(Boolean),
        faq: form.faq
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [question, ...answerParts] = line.split(":");
            return {
              question: question.trim(),
              answer: answerParts.join(":").trim(),
            };
          })
          .filter((item) => item.question && item.answer),
        notification_email: form.notification_email,
        notifications_enabled: form.notifications_enabled,
        availability_enabled: form.availability_enabled,
        reminder_enabled: form.reminder_enabled,
        primary_color: form.primary_color,
      });
      setClinic(updated);
      setNotice("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const goLive = async () => {
    setLaunching(true);
    setError("");
    setNotice("");
    try {
      const result = await api.clinics.goLive();
      setClinic((prev) => (prev ? { ...prev, is_live: result.is_live } : prev));
      setNotice(result.is_live ? "Clinic assistant is now live." : "Go-live request sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to go live.");
    } finally {
      setLaunching(false);
    }
  };

  if (loading) return <LoadingState message="Loading settings..." detail="Restoring clinic control center" />;
  if (error && !clinic) return <ErrorState variant="calm" message={error} onRetry={() => void loadClinic()} />;
  if (!clinic) return <LoadingState message="Loading settings..." />;

  const embedCode = clinic.slug
    ? `<script src="${globalThis.location.origin}/widget.js" data-clinic="${clinic.slug}"></script>`
    : "";

  let goLiveLabel = "Go live";
  if (launching) goLiveLabel = "Going live...";
  else if (clinic.is_live) goLiveLabel = "Live";

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Settings"
        title="Clinic control center"
        description="A premium settings family for clinic information, assistant grounding, notifications, and launch controls."
        actions={
          <div className="flex flex-wrap gap-3">
            <button type="button" className="app-btn app-btn-secondary" onClick={() => void save()} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save settings"}
            </button>
            <button type="button" className="app-btn app-btn-primary" onClick={() => void goLive()} disabled={launching}>
              <Rocket className="h-4 w-4" />
              {goLiveLabel}
            </button>
          </div>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Foundation</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="app-label" htmlFor="s-name">Clinic name</label>
              <input id="s-name" className="app-field" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label className="app-label" htmlFor="s-assistant">Assistant name</label>
              <input id="s-assistant" className="app-field" value={form.assistant_name} onChange={(e) => setForm((prev) => ({ ...prev, assistant_name: e.target.value }))} />
            </div>
            <div>
              <label className="app-label" htmlFor="s-phone">Phone</label>
              <input id="s-phone" className="app-field" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div>
              <label className="app-label" htmlFor="s-email">Email</label>
              <input id="s-email" className="app-field" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="app-label" htmlFor="s-address">Address</label>
              <input id="s-address" className="app-field" value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="app-label" htmlFor="s-services">
                Services <span className="font-normal text-muted-foreground">(comma-separated)</span>
              </label>
              <textarea id="s-services" className="app-textarea" value={form.services} onChange={(e) => setForm((prev) => ({ ...prev, services: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="app-label" htmlFor="s-faq">
                FAQ lines <span className="font-normal text-muted-foreground">(one per line: Q: A)</span>
              </label>
              <textarea id="s-faq" className="app-textarea" value={form.faq} onChange={(e) => setForm((prev) => ({ ...prev, faq: e.target.value }))} />
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Automation and notifications</h2>
            <div className="grid gap-2.5">
              <label className="row-card flex cursor-pointer items-center justify-between" htmlFor="s-notif">
                <span className="text-sm font-medium text-foreground">Notifications enabled</span>
                <input id="s-notif" type="checkbox" title="Notifications enabled" checked={form.notifications_enabled} onChange={(e) => setForm((prev) => ({ ...prev, notifications_enabled: e.target.checked }))} />
              </label>
              <label className="row-card flex cursor-pointer items-center justify-between" htmlFor="s-avail">
                <span className="text-sm font-medium text-foreground">Availability enabled</span>
                <input id="s-avail" type="checkbox" title="Availability enabled" checked={form.availability_enabled} onChange={(e) => setForm((prev) => ({ ...prev, availability_enabled: e.target.checked }))} />
              </label>
              <label className="row-card flex cursor-pointer items-center justify-between" htmlFor="s-remind">
                <span className="text-sm font-medium text-foreground">Reminders enabled</span>
                <input id="s-remind" type="checkbox" title="Reminders enabled" checked={form.reminder_enabled} onChange={(e) => setForm((prev) => ({ ...prev, reminder_enabled: e.target.checked }))} />
              </label>
              <div className="mt-1">
                <label className="app-label" htmlFor="s-notif-email">Notification email</label>
                <input id="s-notif-email" className="app-field" value={form.notification_email} onChange={(e) => setForm((prev) => ({ ...prev, notification_email: e.target.value }))} />
              </div>
              <div>
                <label className="app-label" htmlFor="s-color">Primary brand color</label>
                <input id="s-color" className="app-field" value={form.primary_color} onChange={(e) => setForm((prev) => ({ ...prev, primary_color: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Embed snippet</span>
            </div>
            <pre className="overflow-x-auto rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
              {embedCode || "Chat embed code will appear when the clinic slug is available."}
            </pre>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm font-medium text-muted-foreground">Readiness</p>
            <p className="mt-3 text-xl font-bold tracking-[-0.04em] text-foreground">
              {readiness?.completedCount || 0}/{readiness?.totalCount || 0} configured
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {readiness?.status.replaceAll("_", " ")}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
