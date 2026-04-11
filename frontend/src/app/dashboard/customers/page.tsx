"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, MessageSquare, Search, Users } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { CustomerProfileSummary } from "@/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.frontdesk.listCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      if (!query) return true;
      return (
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query)
      );
    });
  }, [customers, search]);

  if (loading) return <LoadingState message="Loading customers..." detail="Restoring customer relationship surfaces" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadCustomers()} />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Customers"
        title="Patient relationships"
        description="Full patient profiles with conversation depth, booking history, and follow-up posture."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total patients", value: customers.length },
          { label: "Active this week", value: customers.filter((c) => c.last_interaction_at && new Date(c.last_interaction_at) > new Date(Date.now() - 7 * 86400000)).length },
          { label: "Total conversations", value: customers.reduce((acc, c) => acc + (c.conversation_count ?? 0), 0) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card rounded-[1.6rem] p-5">
            <p className="panel-section-head">{label}</p>
            <p className="mt-2.5 text-[1.9rem] font-bold tracking-[-0.055em] text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <section className="bg-card rounded-4xl p-5">
        <div className="relative mb-4 w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="app-field pl-10"
            placeholder="Search by name, phone, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredCustomers.length > 0 ? (
          <div className="grid gap-2">
            {filteredCustomers.map((customer) => (
              <Link
                key={customer.key}
                href={`/dashboard/customers/${customer.key}`}
                className="row-card group flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold tracking-tight text-foreground">{customer.name}</p>
                    {(customer.conversation_count ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-accent rounded-full px-2 py-0.5">
                        <MessageSquare className="h-2.5 w-2.5" />
                        {customer.conversation_count}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {customer.latest_note || "No recent note."}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {customer.lead_count} request{customer.lead_count === 1 ? "" : "s"} · Last seen {customer.last_interaction_at ? timeAgo(customer.last_interaction_at) : "—"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No customers yet"
            description="Patient profiles will appear here as conversations and requests accumulate."
          />
        )}
      </section>
    </div>
  );
}
