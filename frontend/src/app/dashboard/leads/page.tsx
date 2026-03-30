"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, Search, Loader2, MessageSquare, Code2, ExternalLink, AlertTriangle, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Preferred Time</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                className={`cursor-pointer transition-colors ${lead.status === "new" ? "bg-blue-50/40 hover:bg-blue-50/70 border-l-[3px] border-l-blue-500" : "hover:bg-slate-50 border-l-[3px] border-l-transparent"}`}
              >
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-900">{lead.patient_name}</p>
                  <p className="text-xs text-slate-500">{lead.patient_phone || lead.patient_email || "—"}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-600 max-w-50 truncate">{lead.reason_for_visit || "—"}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-600">{lead.preferred_datetime_text || "—"}</p>
                </td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  {updatingId === lead.id ? (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  ) : (
                    <select
                      aria-label="Change lead status"
                      value={lead.status}
                      onChange={(e) => handleInlineStatus(lead.id, e.target.value as LeadStatus)}
                      className="text-xs font-medium px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    >
                      {INLINE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-500">{timeAgo(lead.created_at)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Appointment Requests
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage and track all patient requests
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder:text-slate-400"
          />
        </div>

        <div className="flex gap-1.5 bg-white border border-slate-200 rounded-lg p-1">
          {STATUS_OPTIONS.map((opt) => {
            const count =
              opt.value === ""
                ? counts.all
                : counts[opt.value as keyof typeof counts] ?? 0;
            return (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  statusFilter === opt.value
                    ? "bg-teal-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt.label}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    statusFilter === opt.value
                      ? "bg-teal-700 text-teal-100"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Usage warning banner */}
      {usageWarningBanner}

      {/* Table */}
      {updateError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>{updateError}</span>
          <button onClick={() => setUpdateError(null)} className="text-red-400 hover:text-red-600 ml-3">&times;</button>
        </div>
      )}
      {content}
    </div>
  );
}
