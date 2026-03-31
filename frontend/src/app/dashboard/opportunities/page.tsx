"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";

import { api } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { FollowUpTask, Opportunity } from "@/types";

function opportunityHref(opportunity: Opportunity): string | null {
  if (opportunity.conversation_id) {
    return `/dashboard/inbox/${opportunity.conversation_id}`;
  }
  if (opportunity.lead_id) {
    return `/dashboard/leads/${opportunity.lead_id}`;
  }
  if (opportunity.customer_key) {
    return `/dashboard/customers/${opportunity.customer_key}`;
  }
  return null;
}

function followUpHref(task: FollowUpTask): string | null {
  if (task.conversation_id) {
    return `/dashboard/inbox/${task.conversation_id}`;
  }
  if (task.lead_id) {
    return `/dashboard/leads/${task.lead_id}`;
  }
  if (task.customer_key) {
    return `/dashboard/customers/${task.customer_key}`;
  }
  return null;
}

function priorityClass(priority: "high" | "medium" | "low"): string {
  if (priority === "high") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (priority === "medium") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function taskStatusClass(status: FollowUpTask["status"]): string {
  if (status === "snoozed") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (status === "completed") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  return "bg-teal-50 text-teal-700 border-teal-200";
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
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

  if (loading) return <LoadingState message="Loading opportunities..." />;
  if (error && opportunities.length === 0 && followUps.length === 0) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Opportunities</h1>
        <p className="text-sm text-slate-500 mt-1">
          Work the follow-up queue, triage stalled requests, and keep abandoned conversations from turning into missed revenue.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Follow-up queue</h2>
            <p className="text-xs text-slate-500 mt-1">
              Manual-first tasks you can complete now, then automate later.
            </p>
          </div>
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            {followUps.length} active
          </span>
        </div>

        {followUps.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-7 h-7 text-slate-400" />}
            title="No queued follow-ups"
            description="Queue any opportunity below when you want it assigned and tracked."
          />
        ) : (
          <div className="space-y-4">
            {followUps.map((task) => {
              const href = followUpHref(task);
              const snoozeUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

              return (
                <div key={task.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${priorityClass(task.priority)}`}>
                          {task.priority === "high" ? "High priority" : "Follow-up"}
                        </span>
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${taskStatusClass(task.status)}`}>
                          {task.status === "snoozed" ? "Snoozed" : "Queued"}
                        </span>
                        <span className="text-xs text-slate-500">{task.customer_name}</span>
                      </div>

                      <h2 className="text-base font-semibold text-slate-900">{task.title}</h2>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{task.detail}</p>

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                        {task.due_at && <span>Due {formatDateTime(task.due_at)}</span>}
                        {task.note && <span>{task.note}</span>}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-wrap gap-2">
                      {href && (
                        <Link
                          href={href}
                          className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Open record
                        </Link>
                      )}
                      {task.lead_id && (
                        <button
                          onClick={() => updateFollowUp(task, { status: "completed", lead_status: "contacted" })}
                          disabled={savingId === task.id}
                          className="px-3 py-2 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors disabled:opacity-50"
                        >
                          {savingId === task.id ? "Saving..." : "Mark contacted"}
                        </button>
                      )}
                      <button
                        onClick={() => updateFollowUp(task, { status: "snoozed", due_at: snoozeUntil })}
                        disabled={savingId === task.id}
                        className="px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        {savingId === task.id ? "Saving..." : "Snooze 1 day"}
                      </button>
                      <button
                        onClick={() => updateFollowUp(task, { status: "completed" })}
                        disabled={savingId === task.id}
                        className="px-3 py-2 text-sm font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      >
                        {savingId === task.id ? "Saving..." : "Complete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Needs triage</h2>
            <p className="text-xs text-slate-500 mt-1">
              Rules-based risk items from real conversation and request data.
            </p>
          </div>
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            {triageItems.length} pending
          </span>
        </div>

        {triageItems.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="w-7 h-7 text-slate-400" />}
            title="No unqueued opportunities"
            description="Everything that needs attention is either handled or already in the follow-up queue."
          />
        ) : (
          <div className="space-y-4">
            {triageItems.map((opportunity) => {
              const href = opportunityHref(opportunity);
              const busy = savingId === opportunity.id;

              return (
                <div key={opportunity.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${priorityClass(opportunity.priority)}`}>
                          {opportunity.priority === "high" ? "High priority" : "Follow-up"}
                        </span>
                        <span className="text-xs text-slate-500">{opportunity.customer_name}</span>
                        {opportunity.occurred_at && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            {timeAgo(opportunity.occurred_at)}
                          </span>
                        )}
                      </div>

                      <h2 className="text-base font-semibold text-slate-900">{opportunity.title}</h2>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">{opportunity.detail}</p>
                    </div>

                    <div className="shrink-0 flex flex-wrap gap-2">
                      {href && (
                        <Link
                          href={href}
                          className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Open record
                        </Link>
                      )}
                      <button
                        onClick={() => queueFollowUp(opportunity, "open")}
                        disabled={busy}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                      >
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        Queue follow-up
                      </button>
                      <button
                        onClick={() => queueFollowUp(opportunity, "completed")}
                        disabled={busy}
                        className="px-3 py-2 text-sm font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      >
                        Mark handled
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
  );
}
