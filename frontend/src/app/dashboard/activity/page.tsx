"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  UserPlus,
  ArrowRightLeft,
  MessageSquare,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { timeAgo } from "@/lib/utils";
import type { ActivityEvent } from "@/types";

const EVENT_CONFIG: Record<
  ActivityEvent["type"],
  { icon: typeof UserPlus; color: string; bg: string }
> = {
  lead_created: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50" },
  lead_status_changed: {
    icon: ArrowRightLeft,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  conversation_started: {
    icon: MessageSquare,
    color: "text-teal-600",
    bg: "bg-teal-50",
  },
};

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const data = await api.activity.list(50);
      setEvents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  if (loading) return <LoadingState message="Loading activity..." />;
  if (error) return <ErrorState message={error} onRetry={() => loadActivity()} />;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <Activity className="h-3.5 w-3.5" />
            Activity feed
          </>
        }
        title="What changed today"
        description="New requests, status changes, and conversation events in one feed."
        actions={
          <button
            onClick={() => loadActivity(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_260px]">
        <div>
          {events.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
              <EmptyState
                icon={<Activity className="w-5 h-5 text-slate-400" />}
                title="No activity yet"
                description="Events will appear here once your assistant starts capturing leads."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-50 rounded-2xl border border-slate-100 bg-white shadow-sm">
              {events.map((event, i) => {
                const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.lead_created;
                const Icon = config.icon;
                const isLead = event.type === "lead_created" || event.type === "lead_status_changed";
                return (
                  <div
                    key={`${event.type}-${event.resource_id}-${i}`}
                    className="flex items-center gap-2.5 px-4 py-3"
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${config.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {isLead ? (
                        <Link
                          href={`/dashboard/leads/${event.resource_id}`}
                          className="text-[13px] font-medium text-slate-900 hover:text-teal-700"
                        >
                          {event.title}
                        </Link>
                      ) : (
                        <p className="text-[13px] font-medium text-slate-900">{event.title}</p>
                      )}
                      <p className="mt-0.5 text-[10px] text-slate-400">{event.detail}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-300">{timeAgo(event.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden space-y-3 xl:block">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Feed summary</p>
            <div className="mt-2.5 rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
              <p className="text-[10px] text-slate-400">Events loaded</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">{events.length}</p>
            </div>
            <p className="mt-2.5 text-[10px] leading-relaxed text-slate-400">
              Trace what changed without jumping between inbox, leads, and appointments.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Best use</p>
            <p className="mt-2.5 text-[10px] leading-relaxed text-slate-400">
              Use the feed for the cross-workspace story. Especially useful for new capture, status changes, and operator actions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
