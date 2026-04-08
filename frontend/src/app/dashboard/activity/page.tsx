"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  Loader2,
  Clock3,
} from "lucide-react";
import { api } from "@/lib/api";
import { sanitizeActivityEvents } from "@/lib/activity-sanitize";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { timeAgo } from "@/lib/utils";
import { EVENT_CONFIG_COMPACT as EVENT_CONFIG } from "@/lib/activity-config";
import type { ActivityEvent } from "@/types";

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchNotice, setFetchNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchNotice("");
    try {
      const data = await api.activity.list(50);
      setEvents(sanitizeActivityEvents(data));
      setFetchNotice("");
    } catch (err) {
      setEvents([]);
      setFetchNotice(
        err instanceof Error ? err.message : "The activity feed could not be loaded."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  if (loading) return <LoadingState message="Loading activity..." detail="Recent workspace events" />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Activity className="h-3.5 w-3.5" />
            Activity
          </>
        }
        title="Workspace audit timeline"
        description="Requests, conversations, and status changes in order — useful for tracing what changed without opening every record."
        actions={
          <button
            type="button"
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

      {fetchNotice ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Timeline unavailable right now</p>
          <p className="mt-1 text-amber-800/90 leading-relaxed">
            {fetchNotice} This page will stay empty until the feed loads — your workspace data is unchanged.
          </p>
          <button
            type="button"
            onClick={() => void loadActivity()}
            className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115E59]"
          >
            Try again
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_260px]">
        <div className="order-1 min-w-0 xl:order-none">
          {events.length === 0 && !fetchNotice ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
              <EmptyState
                icon={<Activity className="w-5 h-5 text-[#64748B]" />}
                title="No activity yet"
                description="Events log as patients chat, leads move, and staff act. Right after setup, an empty timeline is normal until the first conversation arrives."
              />
            </div>
          ) : null}
          {events.length === 0 && fetchNotice ? (
            <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC]/80 px-6 py-12 text-center">
              <Clock3 className="mx-auto h-8 w-8 text-[#94A3B8]" aria-hidden />
              <p className="mt-3 text-sm font-medium text-[#475569]">No events to show yet</p>
              <p className="mt-1 text-xs text-[#64748B]">Use <span className="font-semibold text-[#475569]">Try again</span> above to reload the audit feed.</p>
            </div>
          ) : null}
          {events.length > 0 ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
              <div className="border-b border-[#E2E8F0] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">Timeline</p>
                <p className="mt-0.5 text-sm text-[#475569]">{events.length} recent events</p>
              </div>
              <ul className="divide-y divide-[#E2E8F0]">
                {events.map((event, i) => {
                  const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.lead_created;
                  const Icon = config.icon;
                  const isLead = event.type === "lead_created" || event.type === "lead_status_changed";
                  return (
                    <li
                      key={`${event.type}-${event.resource_id}-${i}`}
                      className="flex gap-3 px-4 py-3.5"
                    >
                      <div className="relative flex shrink-0 flex-col items-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.bg}`}
                        >
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        {i < events.length - 1 ? (
                          <span
                            className="mt-1 w-px flex-1 min-h-[1rem] bg-[#E2E8F0]"
                            aria-hidden
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          {isLead ? (
                            <Link
                              href={`/dashboard/leads/${event.resource_id}`}
                              className="text-sm font-semibold text-[#0F172A] hover:text-[#115E59]"
                            >
                              {event.title}
                            </Link>
                          ) : (
                            <p className="text-sm font-semibold text-[#0F172A]">{event.title}</p>
                          )}
                          <time
                            className="text-xs font-medium text-[#64748B]"
                            dateTime={event.timestamp}
                            title={event.timestamp}
                          >
                            {timeAgo(event.timestamp)}
                          </time>
                        </div>
                        {event.detail ? (
                          <p className="mt-1 text-sm leading-relaxed text-[#475569]">{event.detail}</p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="order-2 space-y-3 xl:order-none">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Summary</p>
            <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
              <p className="text-xs text-[#64748B]">Events in view</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums text-[#0F172A]">{events.length}</p>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#475569]">
              Links open the related request when the event is tied to a lead. Chat sessions stay in the inbox thread list.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
