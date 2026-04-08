"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
  Settings,
  ExternalLink,
} from "lucide-react";

import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChannelBadge, FrontdeskStatusBadge, getChannelConfig } from "@/components/shared/FrontdeskBadges";
import type { ChannelType, Clinic, InboxConversation } from "@/types";
import Link from "next/link";

const STATUS_FILTERS: {
  value: "all" | "open" | "needs_follow_up" | "booked" | "handled";
  label: string;
}[] = [
    { value: "all", label: "All" },
    { value: "open", label: "Open" },
    { value: "needs_follow_up", label: "Needs follow-up" },
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
  const [clinic, setClinic] = useState<Clinic | null>(null);

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

  useEffect(() => {
    void api.clinics
      .getMyClinic()
      .then(setClinic)
      .catch(() => setClinic(null));
  }, []);

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

  function threadAccentClass(status: InboxConversation["derived_status"]): string {
    if (status === "needs_follow_up") return "border-l-4 border-l-amber-400";
    if (status === "open") return "border-l-4 border-l-sky-400";
    if (status === "booked") return "border-l-4 border-l-emerald-400";
    return "border-l-4 border-l-transparent";
  }

  if (loading) return <LoadingState message="Loading conversations..." detail="Syncing threads from web chat and linked channels" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={loadInbox} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Inbox className="h-3.5 w-3.5" />
            Conversations
          </>
        }
        title="Inbox"
        description="Every patient conversation in one place — web chat, SMS, and staff notes. Review, respond, or hand off."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[220px_1fr_240px]">
        {/* Left rail — filters */}
        <aside className="hidden space-y-3 xl:block">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Inbox filters</p>
            <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
              Scan volume, then narrow by status or channel — counts stay in sync.
            </p>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-[#64748B]">Volume</p>
            <div className="mt-2 space-y-1.5">
              {[
                { label: "All", value: counts.all, tone: "slate" as const },
                { label: "Open", value: counts.open, tone: "blue" as const },
                { label: "Follow-up", value: counts.needs_follow_up, tone: "amber" as const },
                { label: "Resolved", value: counts.booked + counts.handled, tone: "emerald" as const },
              ].map((card) => (
                <MetricCard key={card.label} label={card.label} value={card.value} icon={MessageSquareMore} tone={card.tone} />
              ))}
            </div>

            <div className="mt-4 border-t border-[#E2E8F0] pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#64748B]">Status</p>
              <div className="mt-2 space-y-1">
                {STATUS_FILTERS.map((filter) => {
                  const count = counts[filter.value];
                  const active = statusFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors ${active
                        ? "bg-[#CCFBF1]/90 text-[#115E59]"
                        : "text-[#475569] hover:bg-[#F8FAFC]"
                        }`}
                    >
                      <span>{filter.label}</span>
                      <span className={`text-xs ${active ? "text-[#0F766E]" : "text-[#64748B]"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Channel filters */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Channels</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                onClick={() => setChannelFilter("all")}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${channelFilter === "all"
                  ? "bg-[#0F172A] text-white"
                  : "border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
                  }`}
              >
                All <span className="ml-1 text-xs opacity-70">{channelCounts.all}</span>
              </button>
              {channelOptions.map((channel) => {
                const active = channelFilter === channel;
                const config = getChannelConfig(channel);
                return (
                  <button
                    key={channel}
                    onClick={() => setChannelFilter(channel)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${active ? config.className : "bg-white text-[#475569] border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      }`}
                  >
                    {config.label}
                    <span className="ml-1 text-xs opacity-70">{channelCounts[channel] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center — thread list */}
        <div className="order-1 min-w-0 space-y-3 xl:order-none">
          {/* Search bar */}
          <div className="flex min-h-10 items-center gap-2.5 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 shadow-sm">
            <Search className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by patient, phone, email, or text..."
              className="min-h-0 min-w-0 flex-1 bg-transparent text-sm text-[#0F172A] placeholder:text-[#64748B] focus:outline-none"
            />
            <span className="shrink-0 text-xs font-semibold text-[#64748B]">{filtered.length}</span>
          </div>

          {/* Mobile filters */}
          <div className="flex flex-wrap gap-2 xl:hidden">
            {STATUS_FILTERS.map((filter) => {
              const active = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  type="button"
                  className={`min-h-10 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${active ? "bg-[#CCFBF1] text-[#0F766E]" : "text-[#64748B] hover:bg-[#F8FAFC]"
                    }`}
                >
                  {filter.label} <span className="text-xs opacity-60">{counts[filter.value]}</span>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (() => {
            let emptyDescription =
              "Web chat creates threads as soon as patients message your public assistant. SMS and other channels appear when they are configured in your environment.";
            let emptyAction: ReactNode | undefined;
            if (threads.length > 0) {
              emptyDescription = channelFilter === "all"
                ? "Try clearing search or widening the status filter."
                : `No threads for ${getChannelConfig(channelFilter).label}. Other channels may still have volume — choose &ldquo;All&rdquo; to compare.`;
            } else {
              emptyAction = (
                <div className="flex flex-wrap justify-center gap-2">
                  <Link
                    href="/dashboard/settings"
                    className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Settings &amp; embed
                  </Link>
                  {clinic?.slug ? (
                    <a
                      href={`/chat/${clinic.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#115E59]"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open patient chat
                    </a>
                  ) : null}
                  <Link
                    href="/dashboard/leads"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#CCFBF1] px-3.5 py-2 text-xs font-semibold text-[#115E59] transition-colors hover:bg-[#CCFBF1]"
                  >
                    Booking pipeline
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            }
            return (
              <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
                <EmptyState
                  icon={<Inbox className="w-5 h-5 text-[#64748B]" />}
                  title={threads.length === 0 ? "No conversations yet" : "No conversations match these filters"}
                  description={emptyDescription}
                  action={emptyAction}
                />
              </div>
            );
          })() : (
            <div className="space-y-2">
              {filtered.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => router.push(`/dashboard/inbox/${thread.id}`)}
                  className={`app-row-hover w-full rounded-lg border border-[#E2E8F0] bg-white pl-3 pr-3.5 py-2.5 text-left shadow-sm transition-all hover:border-[#CBD5E1] hover:shadow-md ${threadAccentClass(thread.derived_status)}`}
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#0F172A]">{thread.customer_name}</p>
                        <ChannelBadge channel={thread.channel} withIcon />
                        <FrontdeskStatusBadge status={thread.derived_status} />
                        {thread.unlinked && (
                          <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">
                            Unlinked
                          </span>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed text-[#475569]">{thread.last_message_preview}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#475569]">
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
                    <div className="flex shrink-0 items-center gap-2 text-xs text-[#64748B]">
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
        <aside className="order-2 space-y-3 xl:order-none">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[#CCFBF1] text-[#0F766E]">
                <Bot className="h-2.5 w-2.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Operating model</p>
                <p className="text-xs text-[#475569]">Review, take over, or move patients forward</p>
              </div>
            </div>
            <div className="mt-2.5 space-y-1.5">
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Review needed</p>
                <p className="mt-0.5 text-2xl font-semibold text-[#0F172A]">{counts.needs_follow_up}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#475569]">
                  Threads waiting for staff review or follow-up.
                </p>
              </div>
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Booked</p>
                <p className="mt-0.5 text-2xl font-semibold text-[#0F172A]">{counts.booked}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#475569]">
                  Conversations that reached a booked outcome.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-[#0F172A]">Focus areas</p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-start gap-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-50">
                  <TriangleAlert className="h-2.5 w-2.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0F172A]">Follow-up pressure</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#475569]">Delayed replies, recovery threads, and unlinked items.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#CCFBF1]">
                  <CalendarDays className="h-2.5 w-2.5 text-[#0F766E]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#0F172A]">Booking handoff</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#475569]">Contact, book, or add notes directly from the thread.</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
