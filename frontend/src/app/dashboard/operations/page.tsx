"use client";

import { useCallback, useEffect, useState } from "react";
import { BriefcaseMedical, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChannelConnectionStatusBadge, CommunicationEventStatusBadge } from "@/components/shared/FrontdeskBadges";
import type { OperationsOverview } from "@/types";

const STATUS_DOT_COLOR: Record<string, string> = {
  ready: "bg-emerald-500",
  configured: "bg-emerald-400",
  partial: "bg-amber-500",
  incomplete: "bg-slate-300",
  unknown: "bg-slate-300",
};

function statusDotClass(status: string): string {
  const normalized = status.toLowerCase().replaceAll("_", "").replaceAll(" ", "");
  if (normalized.includes("ready")) return STATUS_DOT_COLOR.ready;
  if (normalized.includes("configured")) return STATUS_DOT_COLOR.configured;
  if (normalized.includes("partial")) return STATUS_DOT_COLOR.partial;
  return STATUS_DOT_COLOR.incomplete;
}

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
        actions={
          <button
            type="button"
            className="app-btn app-btn-secondary"
            onClick={() => void loadOperations()}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["Reminder candidates", overview.reminder_candidates.length],
          ["Action required", overview.action_required_requests.length],
          ["Review queue", overview.review_queue.length],
          ["Waitlist", overview.waitlist_entries.length],
        ] as [string, number][]).map(([label, count]) => (
          <div key={label} className="bg-card rounded-4xl p-5">
            <p className="panel-section-head">{label}</p>
            <p className="mt-2.5 text-[1.9rem] font-bold tracking-[-0.055em] text-foreground">{count}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="bg-card rounded-4xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">System readiness</span>
          </div>
          <div className="grid gap-2">
            {overview.system_readiness.items.length > 0 ? (
              overview.system_readiness.items.map((item) => (
                <article key={item.key} className="row-card">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${statusDotClass(item.status)}`} />
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                      {item.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{item.detail}</p>
                </article>
              ))
            ) : (
              <EmptyState title="No readiness items returned" description="When the backend exposes readiness detail, it will appear here." />
            )}
          </div>
        </section>

        <section className="bg-card rounded-4xl p-5">
          <div className="mb-4 flex items-center gap-2">
            <BriefcaseMedical className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Channel readiness</span>
          </div>
          <div className="grid gap-2">
            {overview.channel_readiness.length > 0 ? (
              overview.channel_readiness.map((channel) => (
                <article key={channel.channel} className="row-card">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{channel.display_name || channel.channel.replaceAll("_", " ")}</p>
                    <ChannelConnectionStatusBadge status={channel.connection_status} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{channel.detail}</p>
                </article>
              ))
            ) : (
              <EmptyState title="No channels returned" description="Channel setup status will appear here as providers are configured." />
            )}
          </div>
        </section>
      </div>

      <section className="bg-card rounded-4xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Outbound queue</span>
        </div>
        <div className="grid gap-2">
          {overview.recent_outbound_messages.length > 0 ? (
            overview.recent_outbound_messages.map((event) => (
              <article key={event.id} className="row-card">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{event.customer_name || "Unknown contact"}</p>
                  <CommunicationEventStatusBadge status={event.status} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{event.summary || event.content || "No detail available."}</p>
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
