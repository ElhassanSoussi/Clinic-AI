"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Sparkles, Target, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { FollowUpTask, Opportunity } from "@/types";

const PRIORITY_STYLES: Record<string, { pill: string; dot: string }> = {
  high: { pill: "bg-rose-50 text-rose-700", dot: "bg-rose-400" },
  medium: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  low: { pill: "bg-accent text-primary", dot: "bg-emerald-400" },
  default: { pill: "bg-card-alt text-muted-foreground", dot: "bg-slate-300" },
};

function priorityStyles(priority: string | undefined) {
  return PRIORITY_STYLES[priority?.toLowerCase() ?? "default"] ?? PRIORITY_STYLES.default;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOpportunities = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [opportunityData, followUpData] = await Promise.all([
        api.frontdesk.listOpportunities(),
        api.frontdesk.listFollowUps(),
      ]);
      setOpportunities(Array.isArray(opportunityData) ? opportunityData : []);
      setFollowUps(Array.isArray(followUpData) ? followUpData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load opportunities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOpportunities();
  }, [loadOpportunities]);

  const highPriority = useMemo(
    () => opportunities.filter((o) => (o.priority ?? "").toLowerCase() === "high"),
    [opportunities]
  );

  if (loading) return <LoadingState message="Loading opportunities..." detail="Gathering follow-up and recovery signals" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadOpportunities()} />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Opportunities"
        title="Recovery & follow-up"
        description="Opportunities worth revisiting, open follow-up tasks, and threads with recovery potential."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Open opportunities", value: opportunities.length, icon: Target },
          { label: "High priority", value: highPriority.length },
          { label: "Follow-up tasks", value: followUps.length, icon: ArrowUpRight },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card rounded-[1.6rem] p-5">
            <p className="panel-section-head">{label}</p>
            <p className="mt-2.5 text-[1.9rem] font-bold tracking-[-0.055em] text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="workspace-grid workspace-grid--two">
        <section className="bg-card rounded-4xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold text-foreground">Open opportunities</span>
            {opportunities.length > 0 && (
              <span className="ml-auto rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-primary">
                {opportunities.length}
              </span>
            )}
          </div>
          <div className="grid gap-2">
            {opportunities.length > 0 ? (
              opportunities.map((item) => {
                const styles = priorityStyles(item.priority);
                return (
                  <article key={item.id} className="row-card">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${styles.dot}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">{item.title}</p>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${styles.pill}`}>
                            {item.priority ?? "—"}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <EmptyState
                icon={<Sparkles className="h-6 w-6" />}
                title="No open opportunities"
                description="Opportunity recovery will appear here when the front desk has threads worth revisiting."
              />
            )}
          </div>
        </section>

        <section className="bg-card rounded-4xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Follow-up tasks</span>
            {followUps.length > 0 && (
              <span className="ml-auto rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-primary">
                {followUps.length}
              </span>
            )}
          </div>
          <div className="grid gap-2">
            {followUps.length > 0 ? (
              followUps.map((task) => (
                <article key={task.id} className="row-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{task.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{task.detail || "No follow-up note."}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-card/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {task.status}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                icon={<TriangleAlert className="h-6 w-6" />}
                title="No follow-up tasks"
                description="Open follow-up tasks will appear here as recovery workflows accumulate."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
