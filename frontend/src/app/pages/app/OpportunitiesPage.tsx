import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Target, TrendingUp, DollarSign, Users, ArrowRight, Clock, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchFrontdeskAnalytics, fetchOpportunities, updateFollowUpTask } from "@/lib/api/services";
import type { FrontdeskAnalytics, Opportunity } from "@/lib/api/types";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { notifyError, notifySuccess } from "@/lib/feedback";

function typeStyle(type: string) {
  const t = type.toLowerCase();
  if (t.includes("upsell")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (t.includes("recover")) {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }
  return "bg-purple-50 text-purple-700 border-purple-200";
}

export function OpportunitiesPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<Opportunity[]>([]);
  const [analytics, setAnalytics] = useState<FrontdeskAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [opps, a] = await Promise.all([
        fetchOpportunities(session.accessToken),
        fetchFrontdeskAnalytics(session.accessToken),
      ]);
      setRows(opps || []);
      setAnalytics(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load opportunities");
      setRows([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const highPriority = useMemo(() => rows.filter((o) => (o.priority || "").toLowerCase() === "high").length, [rows]);

  const patchTask = async (taskId: string, body: { status?: string }) => {
    if (!session?.accessToken) {
      return;
    }
    setBusyId(taskId);
    try {
      await updateFollowUpTask(session.accessToken, taskId, body);
      await load();
      if (body.status === "completed") {
        notifySuccess("Marked complete");
      } else if (body.status === "snoozed") {
        notifySuccess("Snoozed");
      } else {
        notifySuccess("Task updated");
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Update failed";
      setError(msg);
      notifyError(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="border-b border-border bg-white">
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">Opportunities</h1>
            <p className="text-[15px] text-muted-foreground">Front-desk opportunity queue tied to real patient signals</p>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : rows.length}</p>
              <p className="text-sm text-muted-foreground">Open opportunities</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">
                {loading ? "…" : analytics?.estimated_value_recovered_label || "—"}
              </p>
              <p className="text-sm text-muted-foreground">Recovered (period label)</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : highPriority}</p>
              <p className="text-sm text-muted-foreground">High priority</p>
            </div>

            <div className="bg-white rounded-xl p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : analytics?.recovered_opportunities ?? "—"}</p>
              <p className="text-sm text-muted-foreground">Recovered count</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        {loading && <p className="text-sm text-muted-foreground">Loading opportunities…</p>}
        {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No opportunities in queue.</p>}
        <div className="space-y-3">
          {!loading &&
            rows.map((opp) => {
              const pri = (opp.priority || "").toLowerCase();
              return (
                <div
                  key={opp.id}
                  className={`bg-white rounded-xl border border-border hover:border-primary/50 transition-all ${pri === "high" ? "border-l-4 border-l-primary" : ""
                    }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-primary">{(opp.customer_name || "?").charAt(0)}</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-base font-bold text-foreground">{opp.customer_name}</h3>
                            {pri === "high" && (
                              <span className="px-2 py-0.5 bg-accent text-primary text-xs font-semibold rounded flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                High priority
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-foreground font-medium mb-1">{opp.title}</p>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{opp.detail}</p>

                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-md border capitalize ${typeStyle(opp.type)}`}>
                              {opp.type.replace(/_/g, " ")}
                            </span>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-xs font-medium text-slate-700">
                                {formatRelativeTime(opp.occurred_at ?? undefined) || formatDateTime(opp.occurred_at ?? undefined) || "—"}
                              </span>
                            </div>
                            {opp.derived_status ? (
                              <span className="text-xs text-muted-foreground capitalize">{opp.derived_status.replace(/_/g, " ")}</span>
                            ) : null}
                            {opp.follow_up_task_status ? (
                              <span className="text-xs px-2 py-0.5 rounded border border-border bg-muted capitalize">
                                Task: {opp.follow_up_task_status}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 flex-shrink-0">
                        <div className="flex gap-2">
                          {opp.conversation_id ? (
                            <Link
                              to={`/app/inbox/${opp.conversation_id}`}
                              className="h-9 px-3 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-semibold inline-flex items-center gap-1"
                            >
                              Inbox
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : null}
                          {opp.lead_id ? (
                            <Link
                              to={`/app/leads/${opp.lead_id}`}
                              className="h-9 px-3 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-semibold inline-flex items-center gap-1"
                            >
                              Lead </Link>
                          ) : null}
                          {opp.customer_key ? (
                            <Link
                              to={`/app/customers/${encodeURIComponent(opp.customer_key)}`}
                              className="h-9 px-3 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-semibold inline-flex items-center gap-1"
                            >
                              <Users className="w-4 h-4" />
                            </Link>
                          ) : null}
                        </div>
                        {opp.follow_up_task_id ? (
                          <div className="flex gap-2 flex-wrap justify-end">
                            <button
                              type="button"
                              disabled={busyId === opp.follow_up_task_id}
                              onClick={() => void patchTask(opp.follow_up_task_id!, { status: "snoozed" })}
                              className="h-9 px-3 border border-border rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50"
                            >
                              Snooze
                            </button>
                            <button
                              type="button"
                              disabled={busyId === opp.follow_up_task_id}
                              onClick={() => void patchTask(opp.follow_up_task_id!, { status: "completed" })}
                              className="h-9 px-3 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                            >
                              Complete
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground max-w-[220px] text-right">
                            No follow-up task linked; use inbox or leads to progress this opportunity.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
