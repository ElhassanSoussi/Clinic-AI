"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { FollowUpTask, Opportunity } from "@/types";

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

  if (loading) return <LoadingState message="Loading opportunities..." detail="Gathering follow-up and recovery signals" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadOpportunities()} />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Opportunities"
        title="Recovery and follow-up"
        description="A clearer surface for opportunities, open follow-up work, and threads that might otherwise slip through."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel-surface rounded-4xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold text-app-text">Opportunities</span>
            {opportunities.length > 0 && (
              <span className="ml-auto rounded-full bg-app-accent-wash px-2.5 py-0.5 text-xs font-bold text-app-primary-deep">
                {opportunities.length}
              </span>
            )}
          </div>
          <div className="grid gap-2">
            {opportunities.length > 0 ? (
              opportunities.map((item) => (
                <article key={item.id} className="row-card">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-app-text">{item.title}</p>
                    <span className="shrink-0 rounded-full bg-app-accent-wash px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-app-primary-deep">
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-app-text-muted">{item.detail}</p>
                </article>
              ))
            ) : (
              <EmptyState
                icon={<Sparkles className="h-6 w-6" />}
                title="No open opportunities"
                description="Opportunity recovery will appear here when the front desk has threads worth revisiting."
              />
            )}
          </div>
        </section>

        <section className="panel-surface rounded-4xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-app-primary" />
            <span className="text-sm font-bold text-app-text">Follow-up tasks</span>
            {followUps.length > 0 && (
              <span className="ml-auto rounded-full bg-app-accent-wash px-2.5 py-0.5 text-xs font-bold text-app-primary-deep">
                {followUps.length}
              </span>
            )}
          </div>
          <div className="grid gap-2">
            {followUps.length > 0 ? (
              followUps.map((task) => (
                <article key={task.id} className="row-card">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-app-text">{task.title}</p>
                    <span className="shrink-0 rounded-full border border-app-border bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-app-text-muted">
                      {task.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-app-text-muted">{task.detail || "No follow-up note provided."}</p>
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
