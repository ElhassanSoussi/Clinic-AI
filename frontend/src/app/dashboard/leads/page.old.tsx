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
  CalendarDays,
  ContactRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { timeAgo } from "@/lib/utils";
import { computeSystemStatus } from "@/lib/system-status";
import type { Lead, LeadStatus, Clinic } from "@/types";

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
    <div className={`mb-4 p-3 rounded-xl border flex items-center gap-3 ${atLimit ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
      <AlertTriangle className={`w-4 h-4 shrink-0 ${atLimit ? "text-red-500" : "text-amber-500"}`} />
      <p className={`text-sm flex-1 ${atLimit ? "text-red-700" : "text-amber-700"}`}>
        {atLimit ? "Monthly lead limit reached — new conversations are paused." : `${limit - used} of ${limit} leads remaining this month.`}
      </p>
      {clinic.plan !== "premium" && (
        <Link
          href="/dashboard/billing"
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors"
        >
          <Zap className="w-3 h-3" /> Upgrade
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

  const isLive = clinic ? computeSystemStatus(clinic).status === "LIVE" : true;
  if (isLive === false) {
    return {
      title: "System not live yet",
      description: "Complete your setup to start receiving patient requests automatically.",
      action: (
        <button
          onClick={() => router.push(settingsHref())}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
        >
          Complete setup
        </button>
      ),
    };
  }

  if (clinic?.slug) {
    return {
      title: "No requests yet",
      description: "Your system is live. Patient requests will appear here as they come in.",
      action: (
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href={`/chat/${clinic.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> Test your assistant
          </a>
          <button
            onClick={() => {
              const code = `<script src="${globalThis.location.origin}/widget.js" data-clinic="${clinic.slug}"></script>`;
              navigator.clipboard.writeText(code);
              setEmbedCopied(true);
              setTimeout(() => setEmbedCopied(false), 2000);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
          >
            <Code2 className="w-4 h-4" /> {embedCopied ? "Copied!" : "Copy embed code"}
          </button>
          <Link
            href={`/chat/${clinic.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Open chat page
          </Link>
        </div>
      ),
    };
  }

  return {
    title: "No requests yet",
    description: "Your system is live. Patient requests will appear here as they come in.",
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
    return <LoadingState message="Loading requests..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadLeads} />;
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon={<Users className="w-7 h-7 text-slate-400" />}
        title={emptyState.title}
        description={emptyState.description}
        action={emptyState.action}
      />
    );
  }

  return (
    <div className="app-card p-3">
      <div className="space-y-3">
        {filtered.map((lead) => (
          <button
            key={lead.id}
            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
            className="app-list-row w-full px-5 py-4 text-left"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{lead.patient_name}</p>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                    {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                  </span>
                  {lead.appointment_status ? (
                    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                      {lead.appointment_status.replaceAll("_", " ")}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-6 text-slate-700">
                  {lead.reason_for_visit || "No visit reason recorded yet."}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{lead.patient_phone || lead.patient_email || "No direct contact saved"}</span>
                  <span>{lead.preferred_datetime_text || "Preferred time still open"}</span>
                  <span>Received {timeAgo(lead.created_at)}</span>
                </div>
              </div>
              <div
                className="flex shrink-0 flex-col gap-2 xl:min-w-[11rem]"
                onClick={(event) => event.stopPropagation()}
              >
                {updatingId === lead.id ? (
                  <div className="flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                ) : (
                  <select
                    aria-label="Change lead status"
                    value={lead.status}
                    onChange={(event) => handleInlineStatus(lead.id, event.target.value as LeadStatus)}
                    className="app-input py-3 text-sm font-semibold"
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
          </button>
        ))}
      </div>
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
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Users className="h-3.5 w-3.5" />
            Requests workspace
          </>
        }
        title="Move captured patient demand into a cleaner booking pipeline."
        description="See every request, update status in-line, and keep the handoff between conversation, customer, and appointment work visible."
      />

      {usageWarningBanner}

      {updateError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{updateError}</span>
          <button onClick={() => setUpdateError(null)} className="text-red-400 hover:text-red-600 ml-3">&times;</button>
        </div>
      )}

      <div className="workspace-column-layout">
        <aside className="workspace-side-rail">
          <div className="app-card p-5">
            <p className="workspace-rail-title">Request mix</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <MetricCard label="All requests" value={counts.all} icon={Users} tone="slate" />
              <MetricCard label="New" value={counts.new} icon={AlertTriangle} tone="amber" />
              <MetricCard label="Contacted" value={counts.contacted} icon={ContactRound} tone="blue" />
              <MetricCard label="Booked" value={counts.booked} icon={CalendarDays} tone="emerald" />
            </div>
          </div>

          <div className="app-card p-5">
            <p className="workspace-rail-title">Status filters</p>
            <div className="mt-4 flex flex-wrap gap-2 xl:flex-col">
              {STATUS_OPTIONS.map((opt) => {
                const count =
                  opt.value === ""
                    ? counts.all
                    : counts[opt.value as keyof typeof counts] ?? 0;
                const active = statusFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`flex items-center justify-between rounded-[1.15rem] border px-3.5 py-3 text-sm font-semibold transition-colors xl:w-full ${
                      active
                        ? "border-violet-200 bg-violet-50 text-violet-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[11px] ${active ? "text-violet-600" : "text-slate-400"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="app-card p-5">
            <div className="workspace-toolbar">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, phone, email, or visit reason..."
                  className="app-input pl-9"
                />
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {filtered.length} visible
              </div>
            </div>
          </div>

          {content}
        </div>

        <aside className="workspace-side-rail">
          <div className="app-card p-5">
            <p className="text-sm font-semibold text-slate-900">Pipeline snapshot</p>
            <div className="mt-4 space-y-3">
              <div className="app-card-muted px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Open work</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                  {counts.new + counts.contacted}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Requests still waiting on booking progress, follow-up, or closure.</p>
              </div>
              <div className="app-card-muted px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Closed out</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                  {counts.closed}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Completed or closed requests no longer needing front-desk attention.</p>
              </div>
            </div>
          </div>

          <div className="app-card p-5">
            <p className="text-sm font-semibold text-slate-900">How to use this workspace</p>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="app-card-muted px-4 py-4">
                New requests land here from chat, SMS, and follow-up capture.
              </div>
              <div className="app-card-muted px-4 py-4">
                Update status in-line when the team contacts the patient or confirms a booking.
              </div>
              <div className="app-card-muted px-4 py-4">
                Open any request to see the full workflow context in inbox, customers, and appointments.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
