"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import type { Clinic, FollowUpTask, Opportunity } from "@/types";

function opportunityHref(opportunity: Opportunity): string | null {
  if (opportunity.conversation_id) return `/dashboard/inbox/${opportunity.conversation_id}`;
  if (opportunity.lead_id) return `/dashboard/leads/${opportunity.lead_id}`;
  if (opportunity.customer_key) return `/dashboard/customers/${opportunity.customer_key}`;
  return null;
}

function followUpHref(task: FollowUpTask): string | null {
  if (task.conversation_id) return `/dashboard/inbox/${task.conversation_id}`;
  if (task.lead_id) return `/dashboard/leads/${task.lead_id}`;
  if (task.customer_key) return `/dashboard/customers/${task.customer_key}`;
  return null;
}

function priorityClass(priority: "high" | "medium" | "low"): string {
  if (priority === "high") return "bg-rose-50 text-rose-700 border-rose-200";
  if (priority === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function taskStatusClass(status: FollowUpTask["status"]): string {
  if (status === "snoozed") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-teal-50 text-teal-700 border-teal-200";
}

export default function OpportunitiesPage() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [savingAutomation, setSavingAutomation] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const clinicData = await api.clinics.getMyClinic();
      setClinic(clinicData);
      if (clinicData.follow_up_automation_enabled) {
        await api.frontdesk.runAutoFollowUps();
      }
      const [opportunityData, followUpData] = await Promise.all([
        api.frontdesk.listOpportunities(),
        api.frontdesk.listFollowUps(),
      ]);
      setOpportunities(opportunityData);
      setFollowUps(followUpData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const queuedOpportunityIds = useMemo(
    () => new Set(followUps.map((task) => task.source_key)),
    [followUps]
  );

  const triageItems = useMemo(
    () => opportunities.filter((opportunity) => !queuedOpportunityIds.has(opportunity.id)),
    [opportunities, queuedOpportunityIds]
  );

  const queueFollowUp = async (
    opportunity: Opportunity,
    status: FollowUpTask["status"] = "open"
  ) => {
    setSavingId(opportunity.id);
    try {
      await api.frontdesk.createFollowUp({
        source_key: opportunity.id,
        task_type: opportunity.type,
        priority: opportunity.priority,
        title: opportunity.title,
        detail: opportunity.detail,
        customer_key: opportunity.customer_key ?? null,
        customer_name: opportunity.customer_name,
        lead_id: opportunity.lead_id ?? null,
        conversation_id: opportunity.conversation_id ?? null,
        status,
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue follow-up");
    } finally {
      setSavingId("");
    }
  };

  const updateFollowUp = async (
    task: FollowUpTask,
    updates: Parameters<typeof api.frontdesk.updateFollowUp>[1]
  ) => {
    setSavingId(task.id);
    try {
      await api.frontdesk.updateFollowUp(task.id, updates);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update follow-up");
    } finally {
      setSavingId("");
    }
  };

  const toggleAutomation = async (enabled: boolean) => {
    setSavingAutomation(true);
    try {
      const updatedClinic = await api.clinics.updateMyClinic({
        follow_up_automation_enabled: enabled,
      });
      setClinic(updatedClinic);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update automation settings");
    } finally {
      setSavingAutomation(false);
    }
  };

  if (loading) return <LoadingState message="Loading opportunities..." />;
  if (error && opportunities.length === 0 && followUps.length === 0) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <AlertTriangle className="h-3.5 w-3.5" />
            Follow-ups
          </>
        }
        title="Follow-up queue"
        description="Triage stalled requests and keep missed-call recovery moving."
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          {/* Follow-up queue */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Active queue</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Tasks you can complete now, automate later.</p>
              </div>
              <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700">{followUps.length} active</span>
            </div>

            {followUps.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-5 h-5 text-slate-400" />}
                title="No queued follow-ups"
                description="Queue any opportunity below to assign and track."
              />
            ) : (
              <div className="space-y-3">
                {followUps.map((task) => {
                  const href = followUpHref(task);
                  const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                  return (
                    <div key={task.id} className="rounded-xl border border-slate-100 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${priorityClass(task.priority)}`}>
                              {task.priority === "high" ? "High" : "Follow-up"}
                            </span>
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${taskStatusClass(task.status)}`}>
                              {task.status === "snoozed" ? "Snoozed" : "Queued"}
                            </span>
                            {task.auto_generated && (
                              <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">Auto</span>
                            )}
                            <span className="text-[11px] text-slate-400">{task.customer_name}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{task.detail}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                            {task.due_at && <span>Due {formatDateTime(task.due_at)}</span>}
                            {task.note && <span>{task.note}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          {href && (
                            <Link href={href} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                              Open
                            </Link>
                          )}
                          {task.lead_id && (
                            <button
                              onClick={() => updateFollowUp(task, { status: "completed", lead_status: "contacted" })}
                              disabled={savingId === task.id}
                              className="rounded-lg border border-teal-200 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-50 disabled:opacity-50"
                            >
                              {savingId === task.id ? "..." : "Contacted"}
                            </button>
                          )}
                          <button
                            onClick={() => updateFollowUp(task, { status: "snoozed", due_at: snoozeUntil })}
                            disabled={savingId === task.id}
                            className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
                          >
                            {savingId === task.id ? "..." : "Snooze"}
                          </button>
                          <button
                            onClick={() => updateFollowUp(task, { status: "completed" })}
                            disabled={savingId === task.id}
                            className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                          >
                            {savingId === task.id ? "..." : "Done"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Triage */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">Needs triage</p>
                <p className="mt-0.5 text-[11px] text-slate-400">Rules-based risk items from conversations and requests.</p>
              </div>
              <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">{triageItems.length} pending</span>
            </div>

            {triageItems.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="w-5 h-5 text-slate-400" />}
                title="No unqueued opportunities"
                description="Everything is handled or already in the follow-up queue."
              />
            ) : (
              <div className="space-y-3">
                {triageItems.map((opportunity) => {
                  const href = opportunityHref(opportunity);
                  const busy = savingId === opportunity.id;
                  return (
                    <div key={opportunity.id} className="rounded-xl border border-slate-100 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${priorityClass(opportunity.priority)}`}>
                              {opportunity.priority === "high" ? "High" : "Follow-up"}
                            </span>
                            <span className="text-[11px] text-slate-400">{opportunity.customer_name}</span>
                            {opportunity.occurred_at && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-300">
                                <Clock className="w-3 h-3" />
                                <span>{timeAgo(opportunity.occurred_at)}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{opportunity.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{opportunity.detail}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          {href && (
                            <Link href={href} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                              Open
                            </Link>
                          )}
                          <button
                            onClick={() => queueFollowUp(opportunity, "open")}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                          >
                            {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                            <span>Queue</span>
                          </button>
                          <button
                            onClick={() => queueFollowUp(opportunity, "completed")}
                            disabled={busy}
                            className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                          >
                            Handled
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right rail */}
        <div className="hidden space-y-4 xl:block">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Automation</p>
            <div className="mt-3 rounded-xl border border-slate-50 bg-slate-50/50 px-3.5 py-3">
              <p className="text-xs font-semibold text-slate-900">Auto follow-up</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Creates tasks from stalled conversations and aging requests.
              </p>
              <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(clinic?.follow_up_automation_enabled)}
                  onChange={(event) => toggleAutomation(event.target.checked)}
                  disabled={savingAutomation}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                {savingAutomation ? "Saving..." : "Enabled"}
              </label>
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-slate-50 bg-slate-50/50 px-3.5 py-3">
                <p className="text-[11px] text-slate-400">Queued</p>
                <p className="mt-0.5 text-2xl font-bold text-slate-900">{followUps.length}</p>
              </div>
              <div className="rounded-xl border border-slate-50 bg-slate-50/50 px-3.5 py-3">
                <p className="text-[11px] text-slate-400">Needs triage</p>
                <p className="mt-0.5 text-2xl font-bold text-slate-900">{triageItems.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">How to use</p>
            <div className="mt-3 space-y-2">
              <p className="text-[11px] leading-relaxed text-slate-400">Keep stalled requests visible before they turn into lost bookings.</p>
              <p className="text-[11px] leading-relaxed text-slate-400">Use queued follow-ups for manual ownership, then automate when ready.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
