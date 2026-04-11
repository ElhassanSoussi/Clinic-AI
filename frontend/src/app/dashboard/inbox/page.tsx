"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Globe, Inbox as InboxIcon, Search, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChannelBadge, FrontdeskStatusBadge } from "@/components/shared/FrontdeskBadges";
import type { InboxConversation } from "@/types";

const STATUS_FILTERS = [
  { value: "all", label: "All conversations" },
  { value: "open", label: "Open" },
  { value: "needs_follow_up", label: "Needs follow-up" },
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
      all: threads.length,
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
        title="Conversation workbench"
        description="Patient conversations, follow-up signals, and booking context in one readable team inbox."
      />

      <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-sm font-medium text-foreground">Filters</h2>
          <div className="mt-4 grid gap-1.5">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`filter-btn text-left ${statusFilter === option.value ? "filter-btn-active" : "filter-btn-idle"}`}
                onClick={() => setStatusFilter(option.value)}
              >
                <span>{option.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {counts[option.value]}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-border/60 pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Channel</p>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website chat
              </div>
              <div className="inline-flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                SMS
              </div>
            </div>
          </div>
        </aside>

        <section className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="border-b border-border/60 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-[-0.04em] text-foreground">Inbox</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {counts.open} open · {counts.needs_follow_up} follow-up · {threads.length} total
                </p>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="app-field pl-10"
                  placeholder="Search conversations"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-border">
            {filteredThreads.length > 0 ? (
              filteredThreads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/dashboard/inbox/${thread.id}`}
                  className="block bg-card p-5 transition-colors hover:bg-muted"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-primary">
                      {(thread.customer_name || "?").charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {thread.customer_name || "Unknown patient"}
                            </p>
                            <FrontdeskStatusBadge status={thread.derived_status} />
                            <ChannelBadge channel={thread.channel} withIcon />
                          </div>
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          {thread.updated_at ? timeAgo(thread.updated_at) : "Just now"}
                        </p>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {thread.last_message_preview || "No preview available."}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-5">
                <EmptyState
                  icon={<InboxIcon className="h-6 w-6" />}
                  title="No conversations match this filter"
                  description="New patient conversations will land here once the assistant is live."
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
