"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Inbox as InboxIcon, Search } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChannelBadge, FrontdeskStatusBadge } from "@/components/shared/FrontdeskBadges";
import type { InboxConversation } from "@/types";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "needs_follow_up", label: "Follow-up" },
  { value: "booked", label: "Booked" },
  { value: "handled", label: "Handled" },
] as const;

export default function InboxPage() {
  const [threads, setThreads] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("all");

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.frontdesk.listConversations();
      setThreads(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      const matchesStatus =
        statusFilter === "all" || thread.derived_status === statusFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        thread.customer_name.toLowerCase().includes(query) ||
        thread.last_message_preview.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, threads]);

  const counts = useMemo(
    () => ({
      open: threads.filter((thread) => thread.derived_status === "open").length,
      needs_follow_up: threads.filter((thread) => thread.derived_status === "needs_follow_up").length,
      booked: threads.filter((thread) => thread.derived_status === "booked").length,
      handled: threads.filter((thread) => thread.derived_status === "handled").length,
    }),
    [threads]
  );

  if (loading) return <LoadingState message="Loading inbox..." detail="Restoring conversation workbench" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadThreads()} />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Inbox"
        title="Inbox workbench"
        description="Patient conversations, follow-up signals, and booking-related context in one team view."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["Open", counts.open],
          ["Follow-up", counts.needs_follow_up],
          ["Booked", counts.booked],
          ["Handled", counts.handled],
        ] as [string, number][]).map(([label, count]) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              const map: Record<string, typeof statusFilter> = {
                Open: "open",
                "Follow-up": "needs_follow_up",
                Booked: "booked",
                Handled: "handled",
              };
              setStatusFilter(map[label] ?? "all");
            }}
            className={`panel-surface rounded-[1.6rem] p-5 text-left transition-shadow hover:shadow-[var(--shadow-raised)] ${statusFilter === (label === "Follow-up" ? "needs_follow_up" : label.toLowerCase()) ? "ring-1 ring-app-primary/20" : ""}`}
          >
            <p className="panel-section-head">{label}</p>
            <p className="mt-2.5 text-[1.9rem] font-bold tracking-[-0.055em] text-app-text">{count}</p>
          </button>
        ))}
      </div>

      <div className="workspace-grid workspace-grid--two">
        <section className="panel-surface rounded-[2rem] p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
              <input
                className="app-field pl-10"
                placeholder="Search conversations"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {statusFilter !== "all" && (
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="text-sm font-semibold text-app-primary hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          <div className="grid gap-2">
            {filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/dashboard/inbox/${thread.id}`}
                  className="row-card block"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold tracking-tight text-app-text">
                          {thread.customer_name || "Unknown patient"}
                        </p>
                        <FrontdeskStatusBadge status={thread.derived_status} />
                        <ChannelBadge channel={thread.channel} withIcon />
                      </div>
                      <p className="mt-2 truncate text-sm text-app-text-muted">
                        {thread.last_message_preview || "No preview available."}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-app-text-muted">
                      {thread.updated_at ? timeAgo(thread.updated_at) : "Just now"}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                icon={<InboxIcon className="h-6 w-6" />}
                title="No conversations match this filter"
                description="New patient conversations will land here once the assistant is live."
              />
            )}
          </div>
        </section>

        <aside className="panel-surface rounded-[2rem] p-5">
          <h2 className="panel-section-head mb-4">Filter by status</h2>
          <div className="grid gap-1.5">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`filter-btn text-left ${statusFilter === option.value ? "filter-btn-active" : "filter-btn-idle"}`}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
