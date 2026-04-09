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
    <div className="ds-workspace-main-area space-y-6">
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
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm font-semibold text-app-text-muted transition-colors hover:bg-app-surface-alt disabled:opacity-50"
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
            className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-app-primary px-4 py-2 text-sm font-semibold text-white hover:bg-app-primary-hover"
          >
            Try again
          </button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="order-1 min-w-0 xl:order-0">
          {events.length > 0 ? (
            <div className="ds-card mb-4 py-4!">
              <p className="ds-eyebrow">Feed snapshot</p>
              <p className="mt-1 text-sm text-app-text-muted">
                Mix of event types in this window — use it to sanity-check volume before drilling into inbox or leads.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {eventMix.map(({ type, count }) => (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1.5 rounded-full border border-app-border bg-app-surface px-2.5 py-1 text-xs font-semibold text-app-text-muted shadow-sm"
                  >
                    <span className="text-app-text">{EVENT_TYPE_LABELS[type]?.label ?? type}</span>
                    <span className="tabular-nums text-app-text-muted">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {events.length === 0 && !fetchNotice ? (
            <div className="rounded-xl border border-app-border bg-app-surface shadow-sm">
              <EmptyState
                icon={<Activity className="w-5 h-5 text-app-text-muted" />}
                title="No activity yet"
                description="Events log as patients chat, leads move, and staff act. Right after setup, an empty timeline is normal until the first conversation arrives."
              />
            </div>
          ) : null}
          {events.length === 0 && fetchNotice ? (
            <div className="rounded-xl border border-dashed border-app-border bg-app-surface-alt/80 px-6 py-12 text-center">
              <Clock3 className="mx-auto h-8 w-8 text-app-text-muted" aria-hidden />
              <p className="mt-3 text-sm font-medium text-app-text-muted">No events to show yet</p>
              <p className="mt-1 text-xs text-app-text-muted">Use <span className="font-semibold text-app-text-muted">Try again</span> above to reload the audit feed.</p>
            </div>
          ) : null}
          {events.length > 0 ? (
            <div className="wave-workbench workspace-workbench-premium">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[0.65rem] font-bold uppercase tracking-widest text-app-text-muted">Audit workbench</p>
                  <p className="mt-0.5 text-sm font-semibold text-app-text">Day-grouped timeline</p>
                </div>
                <span className="rounded-full border border-teal-200 bg-app-accent-wash px-2.5 py-1 text-xs font-semibold text-app-accent-dark">
                  {events.length} events · newest first
                </span>
              </div>
              <div className="p-0">
                <div className="overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-(--ds-shadow-md)">
                  <div className="border-b border-app-border bg-app-canvas/60 px-4 py-3 sm:px-5">
                    <p className="ds-eyebrow">Timeline</p>
                    <p className="mt-1 text-sm text-app-text-muted">Each row is a single audit event; day headers break the scroll into reviewable chunks.</p>
                  </div>
                  <ul className="divide-y divide-app-border">
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
                            <li className="border-b border-app-border bg-linear-to-r from-app-surface-alt to-app-surface px-4 py-2.5 sm:px-5">
                              <p className="ds-eyebrow">{dayLabel}</p>
                            </li>
                          ) : null}
                          <li
                            className="flex gap-3 bg-app-surface/50 px-4 py-3.5 sm:px-5"
                          >
                            <div className="relative flex shrink-0 flex-col items-center">
                              <div
                                className={`flex h-9 w-9 items-center justify-center rounded-lg ${config.bg}`}
                              >
                                <Icon className={`h-4 w-4 ${config.color}`} />
                              </div>
                              {i < events.length - 1 ? (
                                <span
                                  className="mt-1 w-px flex-1 min-h-4 bg-app-border"
                                  aria-hidden
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1 pt-0.5">
                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                {isLead ? (
                                  <Link
                                    href={`/dashboard/leads/${event.resource_id}`}
                                    className="text-sm font-semibold text-app-text hover:text-app-accent-dark"
                                  >
                                    {event.title}
                                  </Link>
                                ) : (
                                  <p className="text-sm font-semibold text-app-text">{event.title}</p>
                                )}
                                <time
                                  className="text-xs font-medium text-app-text-muted"
                                  dateTime={event.timestamp}
                                  title={event.timestamp}
                                >
                                  {timeAgo(event.timestamp)}
                                </time>
                              </div>
                              {event.detail ? (
                                <p className="mt-1 text-sm leading-relaxed text-app-text-muted">{event.detail}</p>
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

        <aside className="space-y-3 order-2 xl:order-0">
          <div className="ds-card py-4! xl:sticky xl:top-6">
            <p className="ds-eyebrow">Audit rail</p>
            <p className="ds-eyebrow mt-2">At a glance</p>
            <div className="mt-3 rounded-lg border border-app-border bg-app-surface/90 px-3 py-2.5 shadow-sm">
              <p className="text-xs text-app-text-muted">Events in view</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums text-app-text">{events.length}</p>
            </div>
            {eventMix.length > 0 ? (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-muted">Top types</p>
                {eventMix.slice(0, 3).map(({ type, count }) => (
                  <div key={type} className="flex items-center justify-between rounded-lg border border-app-border bg-app-surface-alt px-2.5 py-1.5 text-xs">
                    <span className="font-medium text-app-text">{EVENT_TYPE_LABELS[type]?.label ?? type}</span>
                    <span className="tabular-nums font-semibold text-app-text-muted">{count}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="mt-3 text-xs leading-relaxed text-app-text-muted">
              Lead events link to the request record. Conversation events are best traced from the inbox thread list.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
