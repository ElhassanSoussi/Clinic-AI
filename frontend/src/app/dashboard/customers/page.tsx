"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
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
        title="Customer relationship workspace"
        description="A clear list-to-detail surface for conversation depth, booking history, and follow-up posture."
      />

      <section className="panel-surface rounded-4xl p-5">
        <div className="relative mb-4 w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
          <input
            className="app-field pl-10"
            placeholder="Search customers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <Link
                key={customer.key}
                href={`/dashboard/customers/${customer.key}`}
                className="row-card block"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold tracking-tight text-app-text">{customer.name}</p>
                    <p className="mt-1.5 truncate text-sm text-app-text-secondary">{customer.latest_note || "No recent note."}</p>
                    <p className="mt-1 text-xs text-app-text-muted">
                      {customer.conversation_count} conversations · {customer.lead_count} requests
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-app-text-muted">
                    {customer.last_interaction_at ? timeAgo(customer.last_interaction_at) : "—"}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No customers yet"
              description="Customer profiles will appear here as conversations and requests accumulate."
            />
          )}
        </div>
      </section>
    </div>
  );
}
