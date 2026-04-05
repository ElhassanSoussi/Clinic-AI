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
    <div className={`mb-4 flex items-center gap-3 rounded-2xl border p-3 ${atLimit ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
      <AlertTriangle className={`w-4 h-4 shrink-0 ${atLimit ? "text-red-500" : "text-amber-500"}`} />
      <p className={`flex-1 text-sm ${atLimit ? "text-red-700" : "text-amber-700"}`}>
        {atLimit ? "Monthly lead limit reached — new conversations are paused." : `${limit - used} of ${limit} leads remaining this month.`}
      </p>
      {clinic.plan !== "premium" && (
        <Link
          href="/dashboard/billing"
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-teal-700"
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

  const isLive = clinic ? computeSystemStatus(clinic).status === "LIVE" : true;
  if (isLive === false) {
    return {
      title: "System not live yet",
      description: "Complete your setup to start receiving patient requests automatically.",
      action: (
        <button
          onClick={() => router.push(settingsHref())}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
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
        <div className="flex flex-wrap justify-center gap-2">
          <a
            href={`/chat/${clinic.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
          >
            <MessageSquare className="w-3.5 h-3.5" /> <span>Test assistant</span>
          </a>
          <button
            onClick={() => {
              const code = `<script src="${globalThis.location.origin}/widget.js" data-clinic="${clinic.slug}"></script>`;
              navigator.clipboard.writeText(code);
              setEmbedCopied(true);
              setTimeout(() => setEmbedCopied(false), 2000);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
          >
            <Code2 className="w-3.5 h-3.5" /> <span>{embedCopied ? "Copied!" : "Copy embed"}</span>
          </button>
          <Link
            href={`/chat/${clinic.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
          >
            <ExternalLink className="w-3.5 h-3.5" /> <span>Chat page</span>
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
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <EmptyState
          icon={<Users className="w-5 h-5 text-slate-400" />}
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((lead) => (
        <div key={lead.id} className="relative rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:border-slate-200">
          <button
            onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
            className="w-full px-4 py-3 text-left"
          >
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-slate-900">{lead.patient_name}</p>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                  </span>
                  {lead.appointment_status ? (
                    <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                      {lead.appointment_status.replaceAll("_", " ")}
                    </span>
                  ) : null}
                </div>
                <p className="text-[13px] leading-relaxed text-slate-500">
                  {lead.reason_for_visit || "No visit reason recorded yet."}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                  <span>{lead.patient_phone || lead.patient_email || "No contact saved"}</span>
                  <span>{lead.preferred_datetime_text || "Time open"}</span>
                  <span>Received {timeAgo(lead.created_at)}</span>
                </div>
              </div>
            </div>
          </button>
          <div className="flex shrink-0 flex-col gap-2 px-4 pb-3 xl:absolute xl:right-4 xl:top-3 xl:min-w-40">
            {updatingId === lead.id ? (
              <div className="flex h-8 items-center justify-center rounded-lg border border-slate-100 bg-white">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
              </div>
            ) : (
              <select
                aria-label="Change lead status"
                value={lead.status}
                onChange={(event) => handleInlineStatus(lead.id, event.target.value as LeadStatus)}
                className="h-8 rounded-lg border border-slate-100 bg-white px-2.5 text-[12px] font-semibold text-slate-700 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
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
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <Users className="h-3.5 w-3.5" />
            Requests
          </>
        }
        title="Booking pipeline"
        description="See every request, update status in-line, and keep the handoff visible."
      />

      {usageWarningBanner}

      {updateError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700">
          <span>{updateError}</span>
          <button onClick={() => setUpdateError(null)} className="ml-3 text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[230px_1fr_260px]">
        {/* Left rail — filters */}
        <aside className="hidden space-y-3 xl:block">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Request mix</p>
            <div className="mt-2.5 space-y-1.5">
              <MetricCard label="All requests" value={counts.all} icon={Users} tone="slate" />
              <MetricCard label="New" value={counts.new} icon={AlertTriangle} tone="amber" />
              <MetricCard label="Contacted" value={counts.contacted} icon={ContactRound} tone="blue" />
              <MetricCard label="Booked" value={counts.booked} icon={CalendarDays} tone="emerald" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Status</p>
            <div className="mt-2.5 space-y-1">
              {STATUS_OPTIONS.map((opt) => {
                const count = opt.value === "" ? counts.all : counts[opt.value as keyof typeof counts] ?? 0;
                const active = statusFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                      active ? "bg-teal-50/60 text-teal-800" : "text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[10px] ${active ? "text-teal-500" : "text-slate-300"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Center — list */}
        <div className="space-y-3">
          {/* Mobile filters */}
          <div className="flex flex-wrap gap-2 xl:hidden">
            {STATUS_OPTIONS.map((opt) => {
              const active = statusFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                    active ? "bg-teal-50/60 text-teal-800" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white px-3.5 py-2 shadow-sm">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, phone, email, or visit reason..."
              className="h-6 flex-1 bg-transparent text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            <span className="shrink-0 text-[10px] font-semibold text-slate-300">{filtered.length}</span>
          </div>

          {content}
        </div>

        {/* Right rail — context */}
        <aside className="hidden space-y-3 xl:block">
          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Pipeline snapshot</p>
            <div className="mt-2.5 space-y-2">
              <div className="rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Open work</p>
                <p className="mt-0.5 text-xl font-bold text-slate-900">{counts.new + counts.contacted}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">Waiting on booking, follow-up, or closure.</p>
              </div>
              <div className="rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">Closed</p>
                <p className="mt-0.5 text-xl font-bold text-slate-900">{counts.closed}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">No longer needing front-desk attention.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">How to use</p>
            <div className="mt-2.5 space-y-1.5">
              {[
                "New requests land from chat, SMS, and follow-up capture.",
                "Update status in-line when team contacts patient or confirms booking.",
                "Open any request for full workflow context.",
              ].map((text) => (
                <p key={text} className="text-[10px] leading-relaxed text-slate-400">{text}</p>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
