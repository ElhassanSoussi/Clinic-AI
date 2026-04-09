"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Search,
  ArrowRight,
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
import { PageHeader } from "@/components/shared/PageHeader";
import { ChannelBadge, FrontdeskStatusBadge, getChannelConfig } from "@/components/shared/FrontdeskBadges";
import type { ChannelType, Clinic, InboxConversation } from "@/types";
import Link from "next/link";
import { computeSystemStatus } from "@/lib/system-status";

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
    <div className="ds-workspace-main-area space-y-6">
      <PageHeader
        showDivider
        eyebrow={
          <>
            <Inbox className="h-3.5 w-3.5" />
            Conversations
          </>
        }
        title="Inbox"
        description="Queue status, live threads, and operator context — one view for triage."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/settings"
              className="app-btn app-btn-secondary gap-2 text-xs"
            >
              <Settings className="h-3.5 w-3.5" />
              Settings
            </Link>
            {clinic?.slug ? (
              <a
                href={`/chat/${clinic.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="app-btn app-btn-primary gap-2 text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open chat
              </a>
            ) : null}
          </div>
        }
      />

      {/* Pressure counters */}
      <section className="ds-card p-5 sm:p-6">
        <p className="ds-eyebrow">Inbox pressure</p>
        <p className="mt-2 text-sm leading-relaxed text-app-text-muted">
          See who reached out, what channel it came from, and whether staff still need to act.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            { label: "Threads", value: counts.all, tone: "bg-app-surface" },
            { label: "Open", value: counts.open, tone: "bg-sky-50" },
            { label: "Needs review", value: counts.needs_follow_up, tone: "bg-amber-50" },
            { label: "Booked", value: counts.booked, tone: "bg-emerald-50" },
          ].map((item) => (
            <div key={item.label} className={`ds-card flex-1 min-w-28 px-4 py-4 ${item.tone}`}>
              <p className="ds-eyebrow">{item.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-app-text">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workbench */}
      <div className="ds-card overflow-hidden">
        {/* Workbench head */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-5 py-4">
          <div className="min-w-0">
            <p className="ds-eyebrow">Workbench</p>
            <p className="mt-0.5 text-sm font-semibold text-app-text">Conversation triage desk</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-900">
              {counts.open} open
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
              {counts.needs_follow_up} review
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900">
              {counts.booked} booked
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-app-border bg-app-surface px-2.5 py-1 text-xs font-semibold text-app-text-muted">
              {counts.handled} settled
            </span>
          </div>
        </div>

        {/* Workbench body — 3-column layout */}
        <div className="grid gap-0 xl:grid-cols-[13rem_1fr_15rem]">
          {/* Left rail — filters */}
          <aside className="hidden border-r border-app-border xl:block">
            <div className="space-y-4 p-4">
              <div>
                <p className="ds-eyebrow">Filters</p>
                <p className="mt-2 text-xs leading-relaxed text-app-text-muted">
                  Narrow by status or channel. Counts mirror the full inbox.
                </p>
              </div>

              <div>
                <p className="ds-eyebrow">Volume</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {[
                    { label: "All", value: counts.all },
                    { label: "Open", value: counts.open },
                    { label: "Follow-up", value: counts.needs_follow_up },
                    { label: "Settled", value: counts.booked + counts.handled },
                  ].map((row) => (
                    <div key={row.label} className="rounded-lg border border-app-border bg-app-surface-alt px-2.5 py-2 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-muted">{row.label}</p>
                      <p className="mt-0.5 text-lg font-semibold tabular-nums text-app-text">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-app-border pt-4">
                <p className="ds-eyebrow">Status</p>
                <div className="mt-2 space-y-1">
                  {STATUS_FILTERS.map((filter) => {
                    const count = counts[filter.value];
                    const active = statusFilter === filter.value;
                    return (
                      <button
                        key={filter.value}
                        onClick={() => setStatusFilter(filter.value)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors ${active
                          ? "bg-app-accent-wash text-app-accent-dark"
                          : "text-app-text-muted hover:bg-app-surface-alt"
                          }`}
                      >
                        <span>{filter.label}</span>
                        <span className={`text-xs ${active ? "text-app-primary" : "text-app-text-muted"}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Channel filters */}
            <div className="border-t border-app-border p-4">
              <p className="ds-eyebrow">Channels</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setChannelFilter("all")}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${channelFilter === "all"
                    ? "bg-app-text text-white"
                    : "border border-app-border bg-app-surface text-app-text-muted hover:bg-app-surface-alt"
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
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${active ? config.className : "bg-app-surface text-app-text-muted border-app-border hover:bg-app-surface-alt"
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
          <div className="min-w-0 space-y-3 p-4">
            <div>
              <p className="ds-eyebrow">Threads</p>
              <p className="mt-1 text-sm text-app-text-muted">Search and open a conversation.</p>
            </div>
            {/* Search bar */}
            <div className="app-input flex items-center gap-2.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-app-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by patient, phone, email, or text..."
                className="min-h-0 min-w-0 flex-1 bg-transparent text-sm text-app-text placeholder:text-app-text-muted focus:outline-none"
              />
              <span className="shrink-0 text-xs font-semibold text-app-text-muted">{filtered.length}</span>
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
                    className={`min-h-10 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${active ? "bg-app-accent-wash text-app-primary" : "text-app-text-muted hover:bg-app-surface-alt"
                      }`}
                  >
                    {filter.label} <span className="text-xs opacity-60">{counts[filter.value]}</span>
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 ? (() => {
              const activationStatus = clinic ? computeSystemStatus(clinic).status : null;
              let emptyTitle = threads.length === 0 ? "No conversations yet" : "No conversations match these filters";
              let emptyDescription =
                "Web chat creates threads as soon as patients message your public assistant. SMS and other channels appear when they are configured in your environment.";
              let emptyAction: ReactNode | undefined;
              if (threads.length > 0) {
                emptyDescription = channelFilter === "all"
                  ? "Try clearing search or widening the status filter."
                  : `No threads for ${getChannelConfig(channelFilter).label}. Other channels may still have volume — choose &ldquo;All&rdquo; to compare.`;
              } else if (activationStatus && activationStatus !== "LIVE") {
                if (activationStatus === "READY") {
                  emptyTitle = "No threads yet — assistant not published";
                  emptyDescription =
                    "Setup checklist is complete, but patient traffic only creates threads after you use Go live in the top bar. Preview your chat page first, then publish when you are ready.";
                } else {
                  emptyTitle = "Inbox fills after go-live";
                  emptyDescription =
                    "Finish the remaining items in Settings (clinic info, services, spreadsheet, scheduling), then use Go live. Until then an empty inbox is expected — focus on configuration and preview.";
                }
                const firstGap = clinic ? computeSystemStatus(clinic).items.find((i) => !i.completed) : null;
                emptyAction = (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link
                      href={
                        firstGap
                          ? `/dashboard/settings?section=${encodeURIComponent(firstGap.drawerSection)}`
                          : "/dashboard/settings"
                      }
                      className="app-btn app-btn-primary gap-2 text-xs"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Continue setup
                    </Link>
                    {clinic?.slug ? (
                      <a
                        href={`/chat/${clinic.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="app-btn app-btn-secondary gap-2 text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Preview chat
                      </a>
                    ) : null}
                    <Link
                      href="/dashboard/leads"
                      className="app-btn gap-2 bg-app-accent-wash text-app-accent-dark text-xs font-semibold"
                    >
                      Booking pipeline
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                );
              } else {
                emptyAction = (
                  <div className="flex flex-wrap justify-center gap-2">
                    <Link
                      href="/dashboard/settings"
                      className="app-btn app-btn-secondary gap-2 text-xs"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Settings &amp; embed
                    </Link>
                    {clinic?.slug ? (
                      <a
                        href={`/chat/${clinic.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="app-btn app-btn-primary gap-2 text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open patient chat
                      </a>
                    ) : null}
                    <Link
                      href="/dashboard/leads"
                      className="app-btn gap-2 bg-app-accent-wash text-app-accent-dark text-xs font-semibold"
                    >
                      Booking pipeline
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                );
              }
              return (
                <div className="ds-card">
                  <EmptyState
                    icon={<Inbox className="h-5 w-5 text-app-text-muted" />}
                    title={emptyTitle}
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
                    className={`app-list-row w-full px-3.5 py-3 text-left ${threadAccentClass(thread.derived_status)}`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-b from-cyan-50 to-app-surface-alt text-sm font-bold text-app-primary shadow-inner">
                          {(thread.customer_name?.[0] || "P").toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <p className="text-[0.98rem] font-semibold tracking-tight text-app-text">{thread.customer_name}</p>
                            <ChannelBadge channel={thread.channel} withIcon />
                            <FrontdeskStatusBadge status={thread.derived_status} />
                          </div>
                          <p className="line-clamp-2 text-sm leading-relaxed text-app-text-muted">{thread.last_message_preview}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-text-muted">
                            {(thread.customer_phone || thread.customer_email) && (
                              <span>{thread.customer_phone || thread.customer_email}</span>
                            )}
                            <span>{thread.lead_id ? "Linked request" : "No linked request"}</span>
                            {thread.last_message_role && (
                              <span className="capitalize">{thread.last_message_role} replied last</span>
                            )}
                            {thread.thread_type === "event" && <span>Recovery workflow</span>}
                            {thread.unlinked && <span className="font-semibold text-rose-600">Needs linking</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-3 lg:block lg:min-w-34 lg:text-right">
                        <div className="rounded-full border border-app-border bg-app-surface px-2.5 py-1 text-xs font-semibold text-app-text-muted shadow-sm">
                          {thread.last_message_at ? timeAgo(thread.last_message_at) : "Recently"}
                        </div>
                        <div className="mt-0 flex items-center justify-end gap-2 text-xs text-app-text-muted lg:mt-4">
                          <span>Open thread</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right rail — context */}
          <aside className="hidden border-l border-app-border xl:block">
            <div className="space-y-4 p-4">
              <div className="ds-card p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-app-accent-wash text-app-primary">
                    <Bot className="h-2.5 w-2.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-app-text">Operating model</p>
                    <p className="text-xs text-app-text-muted">Review, take over, or move patients forward</p>
                  </div>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  <div className="rounded-md border border-app-border bg-app-surface-alt px-2.5 py-2">
                    <p className="ds-eyebrow">Review needed</p>
                    <p className="mt-0.5 text-2xl font-semibold text-app-text">{counts.needs_follow_up}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-app-text-muted">
                      Threads waiting for staff review or follow-up.
                    </p>
                  </div>
                  <div className="rounded-md border border-app-border bg-app-surface-alt px-2.5 py-2">
                    <p className="ds-eyebrow">Booked</p>
                    <p className="mt-0.5 text-2xl font-semibold text-app-text">{counts.booked}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-app-text-muted">
                      Conversations that reached a booked outcome.
                    </p>
                  </div>
                </div>
              </div>

              <div className="ds-card p-4">
                <p className="ds-eyebrow">Focus</p>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-start gap-2 rounded-md border border-app-border bg-app-surface-alt px-2.5 py-2">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-50">
                      <TriangleAlert className="h-2.5 w-2.5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-app-text">Follow-up pressure</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-app-text-muted">Delayed replies, recovery threads, and unlinked items.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-md border border-app-border bg-app-surface-alt px-2.5 py-2">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-app-accent-wash">
                      <CalendarDays className="h-2.5 w-2.5 text-app-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-app-text">Booking handoff</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-app-text-muted">Contact, book, or add notes directly from the thread.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
