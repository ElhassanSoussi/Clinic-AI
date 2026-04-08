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
  return "bg-[#F1F5F9] text-[#0F172A] border-[#E2E8F0]";
}

function taskStatusClass(status: FollowUpTask["status"]): string {
  if (status === "snoozed") return "bg-blue-50 text-blue-700 border-blue-200";
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-[#CCFBF1] text-[#115E59] border-[#99f6e4]";
}

function recoveryCardClass(isHigh: boolean): string {
  if (isHigh) return "border border-rose-200 bg-rose-50/30 shadow-sm ring-1 ring-rose-100";
  return "border border-[#E2E8F0] bg-white shadow-sm";
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

  if (loading) return <LoadingState message="Loading follow-ups..." detail="Loading triage and queue" />;
  if (error && opportunities.length === 0 && followUps.length === 0) {
    return <ErrorState variant="calm" message={error} onRetry={loadData} />;
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
        title="Follow-up & recovery"
        description="Triage stalled requests and recovery threads before they go cold. Queue work for the team, snooze what can wait, or mark done when handled."
      />

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Partial update issue</p>
          <p className="mt-0.5 text-amber-800/95">{error}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-2 text-xs font-semibold text-[#0F766E] hover:underline"
          >
            Refresh data
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_260px]">
        <div className="order-1 min-w-0 space-y-4 xl:order-none">
          {/* Follow-up queue */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Active recovery queue</p>
                <p className="mt-0.5 text-xs text-[#64748B]">Committed follow-ups with clear due dates and actions.</p>
              </div>
              <span className="rounded-md bg-[#CCFBF1]/90 px-2 py-0.5 text-xs font-semibold text-[#115E59]">{followUps.length} active</span>
            </div>

            {followUps.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-5 h-5 text-[#64748B]" />}
                title="Queue is clear"
                description="When you queue an item from triage below, it lands here with due context. An empty queue either means nothing is committed yet or the team has cleared recent work."
              />
            ) : (
              <div className="space-y-2.5">
                {followUps.map((task) => {
                  const href = followUpHref(task);
                  const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                  return (
                    <div key={task.id} className={`rounded-lg p-3 ${recoveryCardClass(task.priority === "high")}`}>
                      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${priorityClass(task.priority)}`}>
                              {task.priority === "high" ? "High" : "Follow-up"}
                            </span>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${taskStatusClass(task.status)}`}>
                              {task.status === "snoozed" ? "Snoozed" : "Queued"}
                            </span>
                            {task.auto_generated && (
                              <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-xs font-semibold text-[#475569]">Auto</span>
                            )}
                            <span className="text-xs text-[#64748B]">{task.customer_name}</span>
                          </div>
                          <p className="text-sm font-semibold text-[#0F172A]">{task.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-[#475569]">{task.detail}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs text-[#64748B]">
                            {task.due_at && <span>Due {formatDateTime(task.due_at)}</span>}
                            {task.note && <span>{task.note}</span>}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          {href && (
                            <Link href={href} className="rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]">
                              Open
                            </Link>
                          )}
                          {task.lead_id && (
                            <button
                              onClick={() => updateFollowUp(task, { status: "completed", lead_status: "contacted" })}
                              disabled={savingId === task.id}
                              className="rounded-lg border border-[#99f6e4] px-2.5 py-1.5 text-xs font-semibold text-[#115E59] transition-colors hover:bg-[#CCFBF1] disabled:opacity-50"
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
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Needs triage</p>
                <p className="mt-0.5 text-xs text-[#475569]">Rules-based risk items from conversations and requests.</p>
              </div>
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">{triageItems.length} pending</span>
            </div>

            {triageItems.length === 0 ? (
              <EmptyState
                icon={<AlertTriangle className="w-5 h-5 text-[#64748B]" />}
                title="Nothing waiting in triage"
                description="New recovery items appear when conversations stall or requests age. If inbox and leads are quiet, this staying empty is expected."
              />
            ) : (
              <div className="space-y-2.5">
                {triageItems.map((opportunity) => {
                  const href = opportunityHref(opportunity);
                  const busy = savingId === opportunity.id;
                  return (
                    <div key={opportunity.id} className={`rounded-lg p-3 ${recoveryCardClass(opportunity.priority === "high")}`}>
                      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${priorityClass(opportunity.priority)}`}>
                              {opportunity.priority === "high" ? "High" : "Follow-up"}
                            </span>
                            <span className="text-xs text-[#64748B]">{opportunity.customer_name}</span>
                            {opportunity.occurred_at && (
                              <span className="inline-flex items-center gap-1 text-xs text-[#64748B]">
                                <Clock className="w-3 h-3" />
                                <span>{timeAgo(opportunity.occurred_at)}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-[#0F172A]">{opportunity.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-[#475569]">{opportunity.detail}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1.5">
                          {href && (
                            <Link href={href} className="rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]">
                              Open
                            </Link>
                          )}
                          <button
                            onClick={() => queueFollowUp(opportunity, "open")}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F766E] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-50"
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
        <div className="order-2 space-y-3 xl:order-none">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Automation</p>
            <div className="mt-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
              <p className="text-xs font-semibold text-[#0F172A]">Auto follow-up</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#475569]">
                Creates tasks from stalled conversations and aging requests.
              </p>
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-[#0F172A]">
                <input
                  type="checkbox"
                  checked={Boolean(clinic?.follow_up_automation_enabled)}
                  onChange={(event) => toggleAutomation(event.target.checked)}
                  disabled={savingAutomation}
                  className="rounded border-[#CBD5E1] text-[#0F766E] focus:ring-[#CCFBF1]"
                />
                {savingAutomation ? "Saving..." : "Enabled"}
              </label>
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <p className="text-xs text-[#475569]">Queued</p>
                <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{followUps.length}</p>
              </div>
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <p className="text-xs text-[#475569]">Needs triage</p>
                <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{triageItems.length}</p>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
