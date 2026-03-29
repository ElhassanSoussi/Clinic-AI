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
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity</h1>
          <p className="text-slate-500 text-sm mt-1">
            Recent events and changes in your clinic
          </p>
        </div>
        <button
          onClick={() => loadActivity(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<Activity className="w-7 h-7 text-slate-400" />}
          title="No activity yet"
          description="This feed shows real-time events — new patient requests, status changes, and conversations. Activity will appear here once your assistant starts capturing leads."
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {events.map((event, i) => {
            const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.lead_created;
            const Icon = config.icon;
            const isLead =
              event.type === "lead_created" ||
              event.type === "lead_status_changed";

            return (
              <div
                key={`${event.type}-${event.resource_id}-${i}`}
                className="flex items-start gap-3 px-5 py-4"
              >
                <div
                  className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}
                >
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  {isLead ? (
                    <Link
                      href={`/dashboard/leads/${event.resource_id}`}
                      className="text-sm font-medium text-slate-900 hover:text-teal-700 transition-colors"
                    >
                      {event.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-slate-900">
                      {event.title}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-0.5">
                    {event.detail}
                  </p>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                  {timeAgo(event.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
