"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { timeAgo } from "@/lib/utils";
import { EVENT_CONFIG_COMPACT as EVENT_CONFIG } from "@/lib/activity-config";
import type { ActivityEvent } from "@/types";

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
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Activity className="h-3.5 w-3.5" />
            Activity
          </>
        }
        title="Activity feed"
        description="New requests, status changes, and conversations in chronological order."
        actions={
          <button
            onClick={() => loadActivity(true)}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_240px]">
        <div className="order-1 min-w-0 xl:order-none">
          {events.length === 0 ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
              <EmptyState
                icon={<Activity className="w-5 h-5 text-[#64748B]" />}
                title="No activity yet"
                description="Events will appear here once patients begin interacting with the assistant."
              />
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0] rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
              {events.map((event, i) => {
                const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.lead_created;
                const Icon = config.icon;
                const isLead = event.type === "lead_created" || event.type === "lead_status_changed";
                return (
                  <div
                    key={`${event.type}-${event.resource_id}-${i}`}
                    className="flex min-w-0 items-center gap-2 px-3.5 py-2.5"
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${config.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {isLead ? (
                        <Link
                          href={`/dashboard/leads/${event.resource_id}`}
                          className="text-sm font-medium text-[#0F172A] hover:text-[#115E59]"
                        >
                          {event.title}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium text-[#0F172A]">{event.title}</p>
                      )}
                      <p className="mt-0.5 text-xs text-[#475569]">{event.detail}</p>
                    </div>
                    <span className="shrink-0 text-xs text-[#64748B]">{timeAgo(event.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="order-2 space-y-3 xl:order-none">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Feed summary</p>
            <div className="mt-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
              <p className="text-xs text-[#475569]">Events loaded</p>
              <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{events.length}</p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[#475569]">
              Trace what changed without jumping between inbox, leads, and appointments.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
