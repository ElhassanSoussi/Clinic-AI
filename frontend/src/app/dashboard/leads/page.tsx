"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Search,
  Loader2,
  MessageSquare,
  Code2,
  ExternalLink,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { getPublicSiteUrl } from "@/lib/env";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { timeAgo } from "@/lib/utils";
import { computeSystemStatus } from "@/lib/system-status";
import type { Lead, LeadStatus, Clinic } from "@/types";
import { leadNextStepHint } from "@/lib/operational-hints";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "booked", label: "Booked" },
  { value: "closed", label: "Closed" },
];

const INLINE_STATUSES: LeadStatus[] = ["new", "contacted", "booked", "closed"];

type EmptyStateConfig = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

type LeadsContentProps = {
  loading: boolean;
  error: string;
  filtered: Lead[];
  emptyState: EmptyStateConfig;
  loadLeads: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
  updatingId: string | null;
  handleInlineStatus: (leadId: string, newStatus: LeadStatus) => Promise<void>;
};

function getInitialStatusFilter(): string {
  if (globalThis.window === undefined) return "";
  return new URLSearchParams(globalThis.location.search).get("status") || "";
}

function settingsHref(section?: string | null): string {
  if (!section) return "/dashboard/settings";
  return `/dashboard/settings?section=${encodeURIComponent(section)}`;
}

function buildUsageWarningBanner(clinic: Clinic | null): React.ReactNode {
  if (!clinic?.monthly_lead_limit || clinic.monthly_lead_limit === -1) return null;

  const used = clinic.monthly_leads_used ?? 0;
  const limit = clinic.monthly_lead_limit;
  const pct = used / limit;
  if (pct < 0.8) return null;

  const atLimit = used >= limit;
  return (
    <div className={`mb-4 flex items-center gap-3 rounded-xl border p-3 ${atLimit ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
      <AlertTriangle className={`w-4 h-4 shrink-0 ${atLimit ? "text-red-500" : "text-amber-500"}`} />
      <p className={`flex-1 text-sm ${atLimit ? "text-red-700" : "text-amber-700"}`}>
        {atLimit ? "Monthly lead limit reached — new conversations are paused." : `${limit - used} of ${limit} leads remaining this month.`}
      </p>
      {clinic.plan !== "premium" && (
        <Link
          href="/dashboard/billing"
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-app-primary px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-app-primary-hover"
        >
          <Zap className="w-3 h-3" /> <span>Upgrade</span>
        </Link>
      )}
    </div>
  );
}

function buildEmptyStateConfig(
  search: string,
  statusFilter: string,
  clinic: Clinic | null,
  embedCopied: boolean,
  router: ReturnType<typeof useRouter>,
  setEmbedCopied: React.Dispatch<React.SetStateAction<boolean>>
): EmptyStateConfig {
  if (search) {
    return {
      title: "No matching requests",
      description: "Try adjusting your search terms.",
    };
  }

  if (statusFilter) {
    return {
      title: `No ${statusFilter} requests`,
      description: "Requests with this status will appear here.",
    };
  }

  const isLive = clinic ? computeSystemStatus(clinic).status === "LIVE" : false;
  if (isLive === false) {
    const status = clinic ? computeSystemStatus(clinic).status : null;
    const desc =
      status === "READY"
        ? "Setup checklist is done, but the assistant is not published yet. Go live from Settings or the dashboard header to start capturing real patient requests here."
        : "Finish clinic setup and connect a spreadsheet (Settings), then go live. Until then, new booking requests will not appear in this list.";
    return {
      title: "Assistant not live for patients yet",
      description: desc,
      action: (
        <button
          type="button"
          onClick={() => router.push(settingsHref())}
          className="inline-flex items-center gap-2 rounded-lg bg-app-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-app-primary-hover"
        >
          Open settings
        </button>
      ),
    };
  }

  if (clinic?.slug) {
    return {
      title: "No requests yet",
      description:
        "With the assistant live, new appointment and intake requests land here after patients complete a booking flow in chat. Test below or share your embed when you are ready for real traffic.",
      action: (
        <div className="flex flex-wrap justify-center gap-2">
          <a
            href={`/chat/${clinic.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-app-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-app-primary-hover"
          >
            <MessageSquare className="w-3.5 h-3.5" /> <span>Test assistant</span>
          </a>
          <button
            onClick={() => {
              const code = `<script src="${getPublicSiteUrl()}/widget.js" data-clinic="${clinic.slug}"></script>`;
              navigator.clipboard.writeText(code);
              setEmbedCopied(true);
              setTimeout(() => setEmbedCopied(false), 2000);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-app-accent-wash px-3.5 py-2 text-xs font-semibold text-app-accent-dark transition-colors hover:bg-app-accent-wash"
          >
            <Code2 className="w-3.5 h-3.5" /> <span>{embedCopied ? "Copied!" : "Copy embed"}</span>
          </button>
          <Link
            href={`/chat/${clinic.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg bg-app-surface-alt px-3.5 py-2 text-xs font-semibold text-app-text-muted transition-colors hover:bg-app-surface-alt"
          >
            <ExternalLink className="w-3.5 h-3.5" /> <span>Chat page</span>
          </Link>
        </div>
      ),
    };
  }

  return {
    title: "No requests yet",
    description: "Your assistant is active. Patient requests will appear here as conversations come in.",
  };
}

function renderLeadsContent({
  loading,
  error,
  filtered,
  emptyState,
  loadLeads,
  router,
  updatingId,
  handleInlineStatus,
}: LeadsContentProps): React.ReactNode {
  if (loading) {
    return <LoadingState message="Loading requests..." detail="Pipeline and status" />;
  }

  if (error) {
    return <ErrorState variant="calm" message={error} onRetry={loadLeads} />;
  }

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-app-border bg-app-surface shadow-sm">
        <EmptyState
          icon={<Users className="w-5 h-5 text-app-text-muted" />}
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {filtered.map((lead) => (
        <div key={lead.id} className="app-list-row relative transition-all hover:border-app-border hover:shadow-md">
          <button
            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
            className="w-full px-4 py-3.5 text-left"
          >
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-b from-cyan-50 to-app-surface-alt text-sm font-bold text-app-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  {(lead.patient_name?.[0] || "P").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="text-[0.98rem] font-semibold tracking-tight text-app-text">{lead.patient_name}</p>
                  <span className="rounded-md bg-app-surface-alt px-2 py-0.5 text-xs font-semibold text-app-text-muted">
                    {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                  </span>
                  {lead.appointment_status ? (
                    <span className="rounded-md bg-app-accent-wash px-2 py-0.5 text-xs font-semibold text-app-accent-dark">
                      {lead.appointment_status.replaceAll("_", " ")}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-app-text-muted">
                  {lead.reason_for_visit || "No visit reason provided yet — patient may not have shared details."}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-app-text-muted">
                  <span>{lead.patient_phone || lead.patient_email || "No contact info saved"}</span>
                  <span>{lead.preferred_datetime_text || "No time preference"}</span>
                  <span>Received {timeAgo(lead.created_at)}</span>
                </div>
                <p className="mt-2 rounded-md border border-app-border bg-app-surface-alt px-2.5 py-1.5 text-xs font-medium text-app-accent-dark">
                  {leadNextStepHint(lead.status)}
                </p>
              </div>
              </div>
            </div>
          </button>
          <div className="flex shrink-0 flex-col gap-2 px-4 pb-3 xl:absolute xl:right-4 xl:top-3 xl:min-w-40">
            {updatingId === lead.id ? (
              <div className="flex h-8 items-center justify-center rounded-lg border border-app-border bg-app-surface">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-app-text-muted" />
              </div>
            ) : (
              <select
                aria-label="Change lead status"
                value={lead.status}
                onChange={(event) => handleInlineStatus(lead.id, event.target.value as LeadStatus)}
                className="h-8 rounded-lg border border-app-border bg-app-surface px-2.5 text-sm font-semibold text-app-text focus:border-app-primary focus:outline-none focus:ring-2 focus:ring-app-accent-wash"
              >
                {INLINE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LeadsPage() {
  const router = useRouter();
  const initialStatusFilter = getInitialStatusFilter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [filtered, all, clinicData] = await Promise.all([
        api.leads.list(statusFilter || undefined),
        statusFilter ? api.leads.list() : Promise.resolve([]),
        api.clinics.getMyClinic(),
      ]);
      setLeads(filtered);
      setAllLeads(statusFilter ? all : filtered);
      setClinic(clinicData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleInlineStatus = async (leadId: string, newStatus: LeadStatus) => {
    setUpdatingId(leadId);
    setUpdateError(null);
    try {
      const updated = await api.leads.update(leadId, { status: newStatus });
      setLeads((prev) =>
        statusFilter && newStatus !== statusFilter
          ? prev.filter((l) => l.id !== leadId)
          : prev.map((l) => (l.id === leadId ? updated : l))
      );
      setAllLeads((prev) =>
        prev.map((l) => (l.id === leadId ? updated : l))
      );
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = {
    all: allLeads.length,
    new: allLeads.filter((l) => l.status === "new").length,
    contacted: allLeads.filter((l) => l.status === "contacted").length,
    booked: allLeads.filter((l) => l.status === "booked").length,
    closed: allLeads.filter((l) => l.status === "closed").length,
  };

  const filtered = search
    ? leads.filter(
      (l) =>
        l.patient_name.toLowerCase().includes(search.toLowerCase()) ||
        l.patient_phone.includes(search) ||
        l.patient_email.toLowerCase().includes(search.toLowerCase()) ||
        l.reason_for_visit.toLowerCase().includes(search.toLowerCase())
    )
    : leads;

  const usageWarningBanner = buildUsageWarningBanner(clinic);
  const emptyState = buildEmptyStateConfig(search, statusFilter, clinic, embedCopied, router, setEmbedCopied);
  const content = renderLeadsContent({ loading, error, filtered, emptyState, loadLeads, router, updatingId, handleInlineStatus });

  return (
    <div className="ds-workspace-main-area space-y-6">
      <PageHeader
        showDivider
        eyebrow={
          <>
            <Users className="h-3.5 w-3.5" />
            Requests
          </>
        }
        title="Booking pipeline"
        description="A live intake pipeline where patient identity, request context, stage, and next staff move stay connected."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/appointments"
              className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-3.5 py-2 text-xs font-semibold text-app-text-muted shadow-sm transition-colors hover:bg-app-surface-alt"
            >
              Appointments
            </Link>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-app-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-app-primary-hover"
            >
              Settings
            </Link>
          </div>
        }
      />

      <section className="ds-card p-5 sm:p-6">
        <p className="ds-eyebrow">Pipeline overview</p>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-app-text">
          Requests move from new to booked with stage, timing, and next action visible in one board.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-app-text-muted">
          This is the handoff queue for your clinic, not a report. Staff can scan patient details, reason for visit, contact status, and suggested next step before opening a single record.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {[
            { label: "New", value: counts.new, tone: "bg-sky-50 border-sky-200" },
            { label: "Contacted", value: counts.contacted, tone: "bg-violet-50 border-violet-200" },
            { label: "Booked", value: counts.booked, tone: "bg-emerald-50 border-emerald-200" },
            { label: "Closed", value: counts.closed, tone: "bg-app-surface border-app-border" },
          ].map((item) => (
            <div key={item.label} className={`ds-card min-w-21 flex-1 px-4 py-3 text-center sm:flex-none ${item.tone}`}>
              <p className="text-xs font-semibold uppercase tracking-widest text-app-text-muted">{item.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-app-text">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-app-border pt-4">
          <p className="ds-eyebrow">How requests move</p>
          <p className="mt-2 text-sm leading-relaxed text-app-text-muted">
            <span className="font-semibold text-app-text">New</span>
            <span className="mx-1.5 text-app-text-muted">→</span>
            <span className="font-semibold text-app-text">Contacted</span>
            <span className="mx-1.5 text-app-text-muted">→</span>
            <span className="font-semibold text-app-text">Booked</span>
            <span className="mx-1.5 text-app-text-muted">→</span>
            <span className="font-semibold text-app-text">Closed</span>
            <span className="ml-2 text-app-text-muted">Advance with the inline status control; Appointments picks up timing, reminders, and deposits.</span>
          </p>
        </div>
      </section>

      {usageWarningBanner}

      {updateError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          <span>{updateError}</span>
          <button onClick={() => setUpdateError(null)} className="ml-3 text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      <div className="ds-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-5 py-4">
          <div className="min-w-0">
            <p className="ds-eyebrow">Pipeline desk</p>
            <p className="mt-0.5 text-sm font-semibold text-app-text">Request queue &amp; context</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-app-border bg-app-surface px-2.5 py-1 text-app-text-muted">
              {counts.new + counts.contacted} in flight
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-900">
              {counts.booked} booked
            </span>
            <span className="rounded-full border border-app-border bg-app-surface-alt px-2.5 py-1 text-app-text-muted">
              {filtered.length} in view
            </span>
          </div>
        </div>
        <div className="p-5">
          <div className="grid gap-6 xl:grid-cols-[13rem_1fr_15rem]">
            {/* Left rail — filters */}
            <aside className="hidden space-y-3 xl:block">
              <div className="ds-card p-4">
                <p className="ds-eyebrow">Request mix</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {(
                    [
                      { label: "All", value: counts.all },
                      { label: "New", value: counts.new },
                      { label: "Contacted", value: counts.contacted },
                      { label: "Booked", value: counts.booked },
                    ] as const
                  ).map((row) => (
                    <div key={row.label} className="rounded-lg border border-app-border bg-app-surface-alt px-2 py-2 text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-app-text-muted">{row.label}</p>
                      <p className="mt-0.5 text-base font-semibold tabular-nums text-app-text">{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ds-card p-4">
                <p className="ds-eyebrow">Filter by status</p>
                <div className="mt-2.5 space-y-1">
                  {STATUS_OPTIONS.map((opt) => {
                    const count = opt.value === "" ? counts.all : counts[opt.value as keyof typeof counts] ?? 0;
                    const active = statusFilter === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setStatusFilter(opt.value)}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors ${active ? "bg-app-accent-wash/90 text-app-accent-dark" : "text-app-text-muted hover:bg-app-surface-alt"
                          }`}
                      >
                        <span>{opt.label}</span>
                        <span className={`text-xs ${active ? "text-teal-500" : "text-app-text-muted"}`}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Center — list */}
            <div className="order-1 min-w-0 space-y-3 xl:order-0">
              <div>
                <p className="ds-eyebrow">Open requests</p>
                <p className="mt-1 text-sm text-app-text-muted">Each row carries the suggested next step for that stage.</p>
              </div>
              {/* Mobile filters */}
              <div className="flex flex-wrap gap-2 xl:hidden">
                {STATUS_OPTIONS.map((opt) => {
                  const active = statusFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setStatusFilter(opt.value)}
                      type="button"
                      className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? "bg-app-accent-wash/90 text-app-accent-dark" : "text-app-text-muted hover:bg-app-surface-alt"
                        }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div className="flex min-h-10 items-center gap-2.5 rounded-lg border border-app-border bg-app-surface px-3.5 py-2 shadow-sm">
                <Search className="h-3.5 w-3.5 shrink-0 text-app-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, phone, email, or visit reason..."
                  className="min-h-0 min-w-0 flex-1 bg-transparent text-sm text-app-text placeholder:text-app-text-muted focus:outline-none"
                />
                <span className="shrink-0 text-xs font-semibold text-app-text-muted">{filtered.length}</span>
              </div>

              {content}
            </div>

            {/* Right rail — context */}
            <aside className="space-y-3 order-2 xl:order-0">
              <div className="ds-card p-4">
                <p className="ds-eyebrow">Pipeline snapshot</p>
                <p className="mt-1 text-xs leading-relaxed text-app-text-muted">
                  Open work is everything before a booking is confirmed or explicitly closed.
                </p>
                <div className="mt-2 space-y-1.5">
                  <div className="rounded-md border border-app-border bg-app-surface-alt px-2.5 py-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-app-text-muted">Open work</p>
                    <p className="mt-0.5 text-lg font-bold text-app-text">{counts.new + counts.contacted}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-app-text-muted">Waiting on booking, follow-up, or closure.</p>
                  </div>
                  <div className="rounded-md border border-app-border bg-app-surface-alt px-2.5 py-2">
                    <p className="text-xs font-semibold uppercase tracking-widest text-app-text-muted">Closed</p>
                    <p className="mt-0.5 text-lg font-bold text-app-text">{counts.closed}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-app-text-muted">No longer needing front-desk attention.</p>
                  </div>
                </div>
              </div>


            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
