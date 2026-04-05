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
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <Inbox className="h-3.5 w-3.5" />
            Conversations
          </>
        }
        title="Inbox"
        description="Review threads, spot follow-up risk, and open the right conversation."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[240px_1fr_260px]">
        {/* Left rail — filters */}
        <aside className="hidden space-y-3 xl:block">
          {/* Metrics */}
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Conversation mix</p>
            <div className="mt-2.5 space-y-1.5">
              {[
                { label: "All", value: counts.all, tone: "slate" as const },
                { label: "Open", value: counts.open, tone: "blue" as const },
                { label: "Follow-up", value: counts.needs_follow_up, tone: "amber" as const },
                { label: "Resolved", value: counts.booked + counts.handled, tone: "emerald" as const },
              ].map((card) => (
                <MetricCard key={card.label} label={card.label} value={card.value} icon={MessageSquareMore} tone={card.tone} />
              ))}
            </div>
          </div>

          {/* Status filters */}
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Status</p>
            <div className="mt-2.5 space-y-1">
              {STATUS_FILTERS.map((filter) => {
                const count = counts[filter.value];
                const active = statusFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                      active
                        ? "bg-teal-50/60 text-teal-800"
                        : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span>{filter.label}</span>
                    <span className={`text-[10px] ${active ? "text-teal-500" : "text-slate-300"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Channel filters */}
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Channels</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                onClick={() => setChannelFilter("all")}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  channelFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                All <span className="ml-1 text-[10px] opacity-70">{channelCounts.all}</span>
              </button>
              {channelOptions.map((channel) => {
                const active = channelFilter === channel;
                const config = getChannelConfig(channel);
                return (
                  <button
                    key={channel}
                    onClick={() => setChannelFilter(channel)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      active ? config.className : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {config.label}
                    <span className="ml-1 text-[10px] opacity-70">{channelCounts[channel] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center — thread list */}
        <div className="space-y-3">
          {/* Search bar */}
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3.5 py-2 shadow-sm">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by patient, phone, email, or text..."
              className="h-6 flex-1 bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <span className="shrink-0 text-[10px] font-semibold text-slate-300">{filtered.length}</span>
          </div>

          {/* Mobile filters */}
          <div className="flex flex-wrap gap-2 xl:hidden">
            {STATUS_FILTERS.map((filter) => {
              const active = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    active ? "bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {filter.label} <span className="text-[10px] opacity-60">{counts[filter.value]}</span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (() => {
            let emptyDescription = "Threads show up once patients start chatting via web chat or connected channels.";
            if (threads.length > 0) {
              emptyDescription = channelFilter === "all"
                ? "Try adjusting the search or status filter."
                : `No ${getChannelConfig(channelFilter).label.toLowerCase()} threads match.`;
            }
            return (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <EmptyState
                  icon={<Inbox className="w-5 h-5 text-slate-400" />}
                  title={threads.length === 0 ? "No conversations yet" : "No conversations match these filters"}
                  description={emptyDescription}
                />
              </div>
            );
          })() : (
            <div className="space-y-2">
              {filtered.map((thread) => (
                  <button
                  key={thread.id}
                  onClick={() => router.push(`/dashboard/inbox/${thread.id}`)}
                  className="app-row-hover w-full rounded-xl border border-slate-100 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-slate-200"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{thread.customer_name}</p>
                        <ChannelBadge channel={thread.channel} withIcon />
                        <FrontdeskStatusBadge status={thread.derived_status} />
                        {thread.unlinked && (
                          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
                            Unlinked
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] leading-relaxed text-slate-500">{thread.last_message_preview}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        {(thread.customer_phone || thread.customer_email) && (
                          <span>{thread.customer_phone || thread.customer_email}</span>
                        )}
                        {thread.lead_id && (
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="w-3 h-3" />
                            <span>Linked</span>
                          </span>
                        )}
                        {thread.last_message_role && (
                          <span className="capitalize">{thread.last_message_role} replied last</span>
                        )}
                        {thread.thread_type === "event" && <span>Recovery thread</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-300">
                      <span>{thread.last_message_at ? timeAgo(thread.last_message_at) : "Recently"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right rail — context */}
        <aside className="hidden space-y-3 xl:block">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-violet-50 text-violet-700">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-slate-900">Operating model</p>
                <p className="text-[10px] text-slate-400">Review, take over, move patients forward</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Review needed</p>
                <p className="mt-0.5 text-xl font-bold text-slate-900">{counts.needs_follow_up}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                  Threads waiting for follow-up or staff review.
                </p>
              </div>
              <div className="rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Booked</p>
                <p className="mt-0.5 text-xl font-bold text-slate-900">{counts.booked}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">
                  Converted to booked outcomes.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
            <p className="text-[13px] font-semibold text-slate-900">Focus areas</p>
            <div className="mt-2.5 space-y-2">
              <div className="flex items-start gap-2 rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-50">
                  <TriangleAlert className="h-3 w-3 text-amber-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-800">Follow-up pressure</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">Delayed replies, recovery threads, unlinked items.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal-50">
                  <CalendarDays className="h-3 w-3 text-teal-600" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-800">Booking handoff</p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">Convert, contact, book, or leave notes in-thread.</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
