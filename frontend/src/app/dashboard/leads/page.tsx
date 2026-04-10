"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import type { Lead } from "@/types";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "booked", label: "Booked" },
  { value: "closed", label: "Closed" },
] as const;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("all");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.leads.list(statusFilter === "all" ? undefined : statusFilter);
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    return leads.filter((lead) => {
      if (!query) return true;
      return (
        lead.patient_name.toLowerCase().includes(query) ||
        lead.reason_for_visit.toLowerCase().includes(query) ||
        lead.patient_phone.toLowerCase().includes(query)
      );
    });
  }, [leads, search]);

  const counts = useMemo(
    () => ({
      new: leads.filter((lead) => lead.status === "new").length,
      contacted: leads.filter((lead) => lead.status === "contacted").length,
      booked: leads.filter((lead) => lead.status === "booked").length,
      closed: leads.filter((lead) => lead.status === "closed").length,
    }),
    [leads]
  );

  if (loading) return <LoadingState message="Loading leads..." detail="Restoring the booking pipeline" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadLeads()} />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Leads"
        title="Booking pipeline"
        description="Captured requests, status movement, and booking follow-through in one workbench."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["New", counts.new],
          ["Contacted", counts.contacted],
          ["Booked", counts.booked],
          ["Closed", counts.closed],
        ] as [string, number][]).map(([label, count]) => (
          <div key={label} className="panel-surface rounded-[1.6rem] p-5">
            <p className="panel-section-head">{label}</p>
            <p className="mt-2.5 text-[1.9rem] font-bold tracking-[-0.055em] text-app-text">{count}</p>
          </div>
        ))}
      </div>

      <div className="workspace-grid workspace-grid--two">
        <section className="panel-surface rounded-[2rem] p-5">
          <div className="mb-4 relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
            <input
              className="app-field pl-10"
              placeholder="Search requests"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads/${lead.id}`}
                  className="row-card block"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold tracking-tight text-app-text">
                          {lead.patient_name || "Unknown patient"}
                        </p>
                        <LeadStatusBadge status={lead.status} />
                      </div>
                      <p className="mt-1.5 text-sm text-app-text-secondary">{lead.reason_for_visit || "No reason captured."}</p>
                      <p className="mt-1 text-xs text-app-text-muted">{lead.preferred_datetime_text || "No preferred time captured."}</p>
                    </div>
                    <p className="shrink-0 text-xs text-app-text-muted">{lead.patient_phone || lead.patient_email}</p>
                  </div>
                </Link>
              ))
            ) : (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="No requests match this view"
                description="New booking requests will appear here as the assistant captures them."
              />
            )}
          </div>
        </section>

        <aside className="panel-surface rounded-[2rem] p-5">
          <h2 className="panel-section-head mb-4">Request mix</h2>
          <div className="grid gap-1.5">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`filter-btn text-left ${statusFilter === option.value ? "filter-btn-active" : "filter-btn-idle"}`}
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
