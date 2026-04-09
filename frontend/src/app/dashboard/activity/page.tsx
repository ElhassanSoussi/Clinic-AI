"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
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
import {
  EVENT_CONFIG_COMPACT as EVENT_CONFIG,
  EVENT_CONFIG as EVENT_TYPE_LABELS,
} from "@/lib/activity-config";
import type { ActivityEvent } from "@/types";

function timelineDayHeading(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const key = d.toDateString();
  if (key === today.toDateString()) return "Today";
  if (key === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

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

  const eventMix = useMemo(() => {
    const counts: Partial<Record<ActivityEvent["type"], number>> = {};
    for (const e of events) {
      counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    return (Object.keys(counts) as ActivityEvent["type"][])
      .map((type) => ({ type, count: counts[type] ?? 0 }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  if (loading) return <LoadingState message="Loading activity..." detail="Recent workspace events" />;

  return (
    <div className="workspace-page">
      <PageHeader
        showDivider
        eyebrow={
          <>
            <Activity className="h-3.5 w-3.5" />
            Activity
          </>
        }
        title="Audit timeline"
        description="Chronological workspace events grouped by day—trace motion across leads and chat without opening every underlying record."
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

      <div className="workspace-split">
        <div className="order-1 min-w-0 xl:order-none">
          {events.length > 0 ? (
            <div className="wave-command-slab workspace-command-hero mb-4 !py-4">
              <p className="workspace-section-label">Feed snapshot</p>
              <p className="mt-1 text-sm text-[#475569]">
                Mix of event types in this window — use it to sanity-check volume before drilling into inbox or leads.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {eventMix.map(({ type, count }) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-semibold text-[#475569] shadow-sm"
                  >
                    <span className="text-[#0F172A]">{EVENT_TYPE_LABELS[type]?.label ?? type}</span>
                    <span className="tabular-nums text-[#64748B]">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

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
            <div className="wave-workbench workspace-workbench-premium">
              <div className="wave-workbench-head">
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#64748B]">Audit workbench</p>
                  <p className="mt-0.5 text-sm font-semibold text-[#0F172A]">Day-grouped timeline</p>
                </div>
                <span className="rounded-full border border-[#99f6e4] bg-[#CCFBF1] px-2.5 py-1 text-xs font-semibold text-[#115E59]">
                  {events.length} events · newest first
                </span>
              </div>
              <div className="wave-workbench-body !p-0">
                <div className="overflow-hidden rounded-[1rem] border border-[var(--color-app-border)] bg-[var(--color-app-surface)] shadow-[var(--ds-shadow-md)]">
                  <div className="border-b border-[#E2E8F0] bg-[var(--color-app-canvas)]/60 px-4 py-3 sm:px-5">
                    <p className="workspace-section-label">Timeline</p>
                    <p className="mt-1 text-sm text-[#475569]">Each row is a single audit event; day headers break the scroll into reviewable chunks.</p>
                  </div>
                  <ul className="divide-y divide-[#E2E8F0]">
                    {events.map((event, i) => {
                      const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.lead_created;
                      const Icon = config.icon;
                      const isLead = event.type === "lead_created" || event.type === "lead_status_changed";
                      const dayLabel = timelineDayHeading(event.timestamp);
                      const prevDay =
                        i > 0 ? timelineDayHeading(events[i - 1]?.timestamp ?? "") : "";
                      const showDay = i === 0 || prevDay !== dayLabel;
                      return (
                        <Fragment key={`${event.type}-${event.resource_id}-${i}`}>
                          {showDay ? (
                            <li className="border-b border-[#E2E8F0] bg-gradient-to-r from-[#F8FAFC] to-white px-4 py-2.5 sm:px-5">
                              <p className="workspace-section-label">{dayLabel}</p>
                            </li>
                          ) : null}
                          <li
                            className="flex gap-3 bg-white/50 px-4 py-3.5 sm:px-5"
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
                        </Fragment>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="workspace-side-rail order-2 xl:order-none">
          <div className="wave-command-slab workspace-command-hero !py-4 xl:sticky xl:top-6">
            <p className="workspace-section-label">Audit rail</p>
            <p className="workspace-rail-title mt-2">At a glance</p>
            <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-white/90 px-3 py-2.5 shadow-sm">
              <p className="text-xs text-[#64748B]">Events in view</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums text-[#0F172A]">{events.length}</p>
            </div>
            {eventMix.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">Top types</p>
                {eventMix.slice(0, 3).map(({ type, count }) => (
                  <div key={type} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1.5 text-xs">
                    <span className="font-medium text-[#0F172A]">{EVENT_TYPE_LABELS[type]?.label ?? type}</span>
                    <span className="tabular-nums font-semibold text-[#475569]">{count}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="mt-3 text-xs leading-relaxed text-[#475569]">
              Lead events link to the request record. Conversation events are best traced from the inbox thread list.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
