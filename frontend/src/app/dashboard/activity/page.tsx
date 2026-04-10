"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity as ActivityIcon } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { ActivityEvent } from "@/types";

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

  if (loading) return <LoadingState message="Loading activity..." detail="Gathering recent workspace events" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadActivity()} />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Activity"
        title="Operational activity stream"
        description="A readable timeline of the latest front-desk events without overwhelming the page."
      />

      <section className="panel-surface rounded-4xl p-5">
        {events.length > 0 ? (
          <div className="grid gap-2">
            {events.map((event) => (
              <article key={`${event.resource_id}-${event.timestamp}`} className="row-card">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-semibold text-app-text">{event.title}</p>
                  <p className="shrink-0 panel-section-head text-[0.65rem]">{timeAgo(event.timestamp)}</p>
                </div>
                <p className="mt-1.5 text-xs text-app-text-muted">{event.detail}</p>
              </article>
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
