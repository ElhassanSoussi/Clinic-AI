"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity as ActivityIcon, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { ActivityEvent } from "@/types";

function groupByDay(events: ActivityEvent[]): Map<string, ActivityEvent[]> {
  const groups = new Map<string, ActivityEvent[]>();
  for (const event of events) {
    const date = new Date(event.timestamp);
    const key = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const existing = groups.get(key) ?? [];
    existing.push(event);
    groups.set(key, existing);
  }
  return groups;
}

const EVENT_TYPE_DOT: Record<string, string> = {
  booking: "bg-emerald-400",
  lead: "bg-primary",
  sms: "bg-blue-400",
  default: "bg-slate-300",
};

function eventDotClass(type: string | undefined): string {
  return EVENT_TYPE_DOT[type ?? "default"] ?? EVENT_TYPE_DOT.default;
}

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.activity.list(30);
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const grouped = useMemo(() => groupByDay(events), [events]);

  if (loading) return <LoadingState message="Loading activity..." detail="Gathering recent workspace events" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadActivity()} />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Activity"
        title="Operational activity"
        description="A readable timeline of the latest front-desk events, grouped by day."
        actions={
          <button type="button" className="app-btn app-btn-secondary" onClick={() => void loadActivity()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <section className="bg-card rounded-4xl p-5">
        {events.length > 0 ? (
          <div className="grid gap-6">
            {Array.from(grouped.entries()).map(([day, dayEvents]) => (
              <div key={day}>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{day}</p>
                <div className="grid gap-2">
                  {dayEvents.map((event) => (
                    <article key={`${event.resource_id}-${event.timestamp}`} className="row-card">
                      <div className="flex items-start gap-3">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${eventDotClass(event.type)}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">{event.title}</p>
                            <p className="shrink-0 text-xs text-muted-foreground">{timeAgo(event.timestamp)}</p>
                          </div>
                          {event.detail ? (
                            <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ActivityIcon className="h-6 w-6" />}
            title="No activity yet"
            description="Activity will appear here once patients begin using the assistant and staff start processing requests."
          />
        )}
      </section>
    </div>
  );
}
