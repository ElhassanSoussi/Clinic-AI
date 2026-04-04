"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Search,
  ArrowRight,
  UserRound,
  MessageSquareMore,
  Bot,
  TriangleAlert,
  CalendarDays,
} from "lucide-react";

import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChannelBadge, FrontdeskStatusBadge, getChannelConfig } from "@/components/shared/FrontdeskBadges";
import type { ChannelType, InboxConversation } from "@/types";

const STATUS_FILTERS: {
  value: "all" | "open" | "needs_follow_up" | "booked" | "handled";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "needs_follow_up", label: "Needs Follow-Up" },
  { value: "booked", label: "Booked" },
  { value: "handled", label: "Handled" },
];

export default function InboxPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<InboxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("all");
  const [channelFilter, setChannelFilter] = useState<"all" | ChannelType>("all");

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.frontdesk.listConversations();
      setThreads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inbox");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return threads.filter((thread) => {
      const matchesStatus =
        statusFilter === "all" || thread.derived_status === statusFilter;
      const matchesChannel =
        channelFilter === "all" || thread.channel === channelFilter;
      const matchesSearch =
        !needle ||
        thread.customer_name.toLowerCase().includes(needle) ||
        thread.customer_phone.includes(needle) ||
        thread.customer_email.toLowerCase().includes(needle) ||
        thread.last_message_preview.toLowerCase().includes(needle);
      return matchesStatus && matchesChannel && matchesSearch;
    });
  }, [channelFilter, search, statusFilter, threads]);

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

  const channelCounts = useMemo(() => {
    const values: Record<string, number> = { all: threads.length };
    for (const thread of threads) {
      values[thread.channel] = (values[thread.channel] ?? 0) + 1;
    }
    return values;
  }, [threads]);

  const channelOptions = useMemo(() => {
    const channels = Array.from(new Set(threads.map((thread) => thread.channel))) as ChannelType[];
    channels.sort((left, right) => getChannelConfig(left).label.localeCompare(getChannelConfig(right).label));
    return channels;
  }, [threads]);

  if (loading) return <LoadingState message="Loading conversations..." />;
  if (error) return <ErrorState message={error} onRetry={loadInbox} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Inbox className="h-3.5 w-3.5" />
            Conversations workspace
          </>
        }
        title="Work every patient conversation from one premium inbox."
        description="Review threads, spot follow-up risk, and open the right conversation without losing source, status, or operator context."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "All conversations",
            value: counts.all,
            tone: "slate" as const,
          },
          {
            label: "Open now",
            value: counts.open,
            tone: "blue" as const,
          },
          {
            label: "Needs follow-up",
            value: counts.needs_follow_up,
            tone: "amber" as const,
          },
          {
            label: "Booked or handled",
            value: counts.booked + counts.handled,
            tone: "emerald" as const,
          },
        ].map((card) => (
          <MetricCard
            key={card.label}
            label={card.label}
            value={card.value}
            icon={MessageSquareMore}
            tone={card.tone}
          />
        ))}
      </div>

      <div className="app-card p-4 sm:p-5">
        <div className="workspace-toolbar">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by patient, phone, email, or conversation text..."
              className="app-input pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <div className="app-segmented">
              {STATUS_FILTERS.map((filter) => {
                const count = counts[filter.value];
                const active = statusFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className="app-segmented-item"
                    data-active={active}
                  >
                    {filter.label}
                    <span className={`text-[10px] ${active ? "text-white/85" : "text-slate-400"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setChannelFilter("all")}
          className={`rounded-2xl px-3 py-2 text-sm font-semibold transition-colors ${
            channelFilter === "all"
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          All channels
          <span className={`ml-2 text-xs ${channelFilter === "all" ? "text-white/80" : "text-slate-400"}`}>
            {channelCounts.all}
          </span>
        </button>
        {channelOptions.map((channel) => {
          const active = channelFilter === channel;
          const config = getChannelConfig(channel);
          return (
            <button
              key={channel}
              onClick={() => setChannelFilter(channel)}
              className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? config.className
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {config.label}
              <span className={`ml-2 text-xs ${active ? "opacity-80" : "text-slate-400"}`}>
                {channelCounts[channel] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <div className="workspace-split">
        <div>
          {filtered.length === 0 ? (
            <div className="app-card">
              <EmptyState
                icon={<Inbox className="w-7 h-7 text-slate-400" />}
                title={threads.length === 0 ? "No conversations yet" : "No conversations match these filters"}
                description={
                  threads.length === 0
                    ? "Once patient threads start coming in, the inbox will show web chat today and other channels as they are connected."
                    : channelFilter === "all"
                      ? "Try adjusting the search or status filter to see more conversations."
                      : `No ${getChannelConfig(channelFilter).label.toLowerCase()} threads match the current filters.`
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => router.push(`/dashboard/inbox/${thread.id}`)}
                  className="app-list-row w-full px-5 py-4 text-left"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {thread.customer_name}
                        </p>
                        <ChannelBadge channel={thread.channel} withIcon />
                        <FrontdeskStatusBadge status={thread.derived_status} />
                        {thread.unlinked && (
                          <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                            Unlinked
                          </span>
                        )}
                      </div>

                      <p className="text-sm leading-relaxed text-slate-700">
                        {thread.last_message_preview}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {(thread.customer_phone || thread.customer_email) && (
                          <span>{thread.customer_phone || thread.customer_email}</span>
                        )}
                        {thread.lead_id && (
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="w-3.5 h-3.5" />
                            Linked request
                          </span>
                        )}
                        {thread.last_message_role && (
                          <span className="capitalize">{thread.last_message_role} replied last</span>
                        )}
                        {thread.thread_type === "event" && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            Recovery thread
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 text-sm text-slate-400">
                      <span>{thread.last_message_at ? timeAgo(thread.last_message_at) : "Recently"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="workspace-side-rail">
          <div className="app-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-violet-50 text-violet-700">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Inbox operating model</p>
                <p className="text-xs text-slate-500">Review, take over, and move patients to the right next action.</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="app-card-muted px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Review needed</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{counts.needs_follow_up}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Threads waiting for follow-up, approval, or staff review before they can move forward.</p>
              </div>
              <div className="app-card-muted px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Booked threads</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{counts.booked}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Conversations already converted into booked outcomes or active appointment work.</p>
              </div>
            </div>
          </div>

          <div className="app-card p-5">
            <p className="text-sm font-semibold text-slate-900">Focus areas</p>
            <div className="mt-4 space-y-3">
              <div className="app-card-muted flex items-start gap-3 px-4 py-4">
                <div className="mt-0.5 rounded-[0.9rem] bg-amber-50 p-2 text-amber-600">
                  <TriangleAlert className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Follow-up pressure</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Stay on top of delayed replies, recovery threads, and anything still unlinked to a request.</p>
                </div>
              </div>
              <div className="app-card-muted flex items-start gap-3 px-4 py-4">
                <div className="mt-0.5 rounded-[0.9rem] bg-teal-50 p-2 text-teal-600">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Booking handoff</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Open a thread to convert, contact, book, or leave an internal note without leaving the workspace.</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
