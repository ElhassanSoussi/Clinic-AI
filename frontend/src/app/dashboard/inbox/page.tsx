"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Search,
  ArrowRight,
  UserRound,
} from "lucide-react";

import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { ChannelBadge, FrontdeskStatusBadge } from "@/components/shared/FrontdeskBadges";
import type { InboxConversation } from "@/types";

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
      const matchesSearch =
        !needle ||
        thread.customer_name.toLowerCase().includes(needle) ||
        thread.customer_phone.includes(needle) ||
        thread.customer_email.toLowerCase().includes(needle) ||
        thread.last_message_preview.toLowerCase().includes(needle);
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

  if (loading) return <LoadingState message="Loading conversations..." />;
  if (error) return <ErrorState message={error} onRetry={loadInbox} />;

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review recent conversations, spot follow-up risk, and open any thread in one click.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "All conversations",
            value: counts.all,
            tone: "bg-slate-100 text-slate-700",
          },
          {
            label: "Open now",
            value: counts.open,
            tone: "bg-blue-50 text-blue-700",
          },
          {
            label: "Needs follow-up",
            value: counts.needs_follow_up,
            tone: "bg-amber-50 text-amber-700",
          },
          {
            label: "Booked or handled",
            value: counts.booked + counts.handled,
            tone: "bg-emerald-50 text-emerald-700",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white border border-slate-200 rounded-xl p-5"
          >
            <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold ${card.tone}`}>
              {card.label}
            </span>
            <p className="text-3xl font-bold text-slate-900 mt-3">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by patient, phone, email, or conversation text..."
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((filter) => {
            const count = counts[filter.value];
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-teal-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {filter.label}
                <span className={`ml-2 text-xs ${active ? "text-white/90" : "text-slate-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl">
          <EmptyState
            icon={<Inbox className="w-7 h-7 text-slate-400" />}
            title={threads.length === 0 ? "No conversations yet" : "No conversations match these filters"}
            description={
              threads.length === 0
                ? "Once patients start chatting with your assistant, the inbox will show active threads, linked requests, and follow-up risk."
                : "Try adjusting the search or status filter to see more conversations."
            }
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
          {filtered.map((thread) => (
            <button
              key={thread.id}
              onClick={() => router.push(`/dashboard/inbox/${thread.id}`)}
              className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="w-full min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {thread.customer_name}
                    </p>
                    <ChannelBadge channel={thread.channel} />
                    <FrontdeskStatusBadge status={thread.derived_status} />
                    {thread.unlinked && (
                      <span className="inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                        Unlinked
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    {thread.last_message_preview}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                    {(thread.customer_phone || thread.customer_email) && (
                      <span>
                        {thread.customer_phone || thread.customer_email}
                      </span>
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
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2 text-sm text-slate-400">
                  <span>
                    {thread.last_message_at
                      ? timeAgo(thread.last_message_at)
                      : "Recently"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
