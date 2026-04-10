"use client";

import { useCallback, useEffect, useState } from "react";
import { BriefcaseMedical, Send, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChannelConnectionStatusBadge, CommunicationEventStatusBadge } from "@/components/shared/FrontdeskBadges";
import type { OperationsOverview } from "@/types";

export default function OperationsPage() {
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOperations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.frontdesk.getOperations();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOperations();
  }, [loadOperations]);

  if (loading) return <LoadingState message="Loading operations..." detail="Gathering readiness, reminders, and outbound workflow state" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadOperations()} />;
  if (!overview) return <LoadingState message="Loading operations..." />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Operations"
        title="Operational command surface"
        description="A structured view of readiness, reminders, queue health, channel setup, and outbound communication state."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["Reminder candidates", overview.reminder_candidates.length],
          ["Action required", overview.action_required_requests.length],
          ["Review queue", overview.review_queue.length],
          ["Waitlist", overview.waitlist_entries.length],
        ] as [string, number][]).map(([label, count]) => (
          <div key={label} className="panel-surface rounded-[1.6rem] p-5">
            <p className="panel-section-head">{label}</p>
            <p className="mt-2.5 text-[1.9rem] font-bold tracking-[-0.055em] text-app-text">{count}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel-surface rounded-4xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-app-primary" />
            <span className="text-sm font-bold text-app-text">System readiness</span>
          </div>
          <div className="grid gap-2">
            {overview.system_readiness.items.length > 0 ? (
              overview.system_readiness.items.map((item) => (
                <article key={item.key} className="row-card">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-app-text">{item.label}</p>
                    <span className="shrink-0 rounded-full bg-app-accent-wash px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-app-primary-deep">
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-app-text-muted">{item.detail}</p>
                </article>
              ))
            ) : (
              <EmptyState title="No readiness items returned" description="When the backend exposes readiness detail, it will appear here." />
            )}
          </div>
        </section>

        <section className="panel-surface rounded-4xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <BriefcaseMedical className="h-4 w-4 text-app-primary" />
            <span className="text-sm font-bold text-app-text">Channel readiness</span>
          </div>
          <div className="grid gap-2">
            {overview.channel_readiness.length > 0 ? (
              overview.channel_readiness.map((channel) => (
                <article key={channel.channel} className="row-card">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-app-text">{channel.display_name || channel.channel.replaceAll("_", " ")}</p>
                    <ChannelConnectionStatusBadge status={channel.connection_status} />
                  </div>
                  <p className="mt-1.5 text-xs text-app-text-muted">{channel.detail}</p>
                </article>
              ))
            ) : (
              <EmptyState title="No channels returned" description="Channel setup status will appear here as providers are configured." />
            )}
          </div>
        </section>
      </div>

      <section className="panel-surface rounded-4xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <Send className="h-4 w-4 text-app-primary" />
          <span className="text-sm font-bold text-app-text">Outbound queue</span>
        </div>
        <div className="grid gap-2">
          {overview.recent_outbound_messages.length > 0 ? (
            overview.recent_outbound_messages.map((event) => (
              <article key={event.id} className="row-card">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-app-text">{event.customer_name || "Unknown contact"}</p>
                  <CommunicationEventStatusBadge status={event.status} />
                </div>
                <p className="mt-1.5 text-xs text-app-text-muted">{event.summary || event.content || "No detail available."}</p>
              </article>
            ))
          ) : (
            <EmptyState title="No outbound activity yet" description="Reminder sends and outbound communication state will appear here." />
          )}
        </div>
      </section>
    </div>
  );
}
