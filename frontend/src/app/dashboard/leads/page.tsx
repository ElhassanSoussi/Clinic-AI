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
  { value: "all", label: "All requests" },
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
      all: leads.length,
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
        description="Captured requests, booking follow-up, and status movement in one clear workbench."
      />

      <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-sm font-medium text-foreground">Request mix</h2>
          <div className="mt-4 grid gap-1.5">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`filter-btn text-left ${statusFilter === option.value ? "filter-btn-active" : "filter-btn-idle"}`}
                onClick={() => setStatusFilter(option.value)}
              >
                <span>{option.value === "all" ? "All" : option.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">{counts[option.value]}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
          <div className="border-b border-border/60 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-foreground">Booking requests</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {counts.new} new · {counts.booked} booked · {leads.length} total
                </p>
              </div>
              <div className="relative w-full max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="app-field pl-10"
                  placeholder="Search requests"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-px bg-border">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads/${lead.id}`}
                  className="block bg-card p-5 transition-colors hover:bg-muted"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-primary">
                      {(lead.patient_name || "?").charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {lead.patient_name || "Unknown patient"}
                            </p>
                            <LeadStatusBadge status={lead.status} />
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {lead.reason_for_visit || "No reason captured."}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {lead.preferred_datetime_text || "No preferred time captured."}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          {lead.patient_phone || lead.patient_email}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-5">
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title="No requests match this view"
                  description="New booking requests will appear here as the assistant captures them."
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
