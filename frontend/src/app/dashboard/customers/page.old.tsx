"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserRound, ArrowRight, ContactRound } from "lucide-react";

import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
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
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customer profiles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((customer) => {
      return (
        customer.name.toLowerCase().includes(needle) ||
        customer.phone.includes(needle) ||
        customer.email.toLowerCase().includes(needle)
      );
    });
  }, [customers, search]);

  if (loading) return <LoadingState message="Loading customer profiles..." />;
  if (error) return <ErrorState message={error} onRetry={loadCustomers} />;

  const customersWithBookings = customers.filter((customer) => customer.booked_count > 0).length;
  const customersNeedingAttention = customers.filter((customer) => customer.open_request_count > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <ContactRound className="h-3.5 w-3.5" />
            Customer workspace
          </>
        }
        title="See every patient relationship in one place."
        description="Track conversation history, request counts, booking outcomes, and the latest internal context for each contact."
      />

      <div className="workspace-stage">
        <div className="workspace-side-rail">
          <div className="workspace-rail-card p-5">
            <p className="workspace-section-label">Customer view</p>
            <div className="mt-4 space-y-3">
              <div className="app-card-muted px-4 py-4">
                <p className="text-xs text-slate-500">Profiles tracked</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{customers.length}</p>
              </div>
              <div className="app-card-muted px-4 py-4">
                <p className="text-xs text-slate-500">Booked relationships</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{customersWithBookings}</p>
              </div>
              <div className="app-card-muted px-4 py-4">
                <p className="text-xs text-slate-500">Open request pressure</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{customersNeedingAttention}</p>
              </div>
            </div>
          </div>

          <div className="workspace-rail-card p-5">
            <p className="workspace-section-label">What this page shows</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>Each patient record ties conversations, requests, bookings, and internal notes back to one profile.</p>
              <p>Use it to spot repeat contacts, booking outcomes, and where staff context still matters.</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="workspace-hero-panel p-5 sm:p-6">
            <div className="workspace-toolbar">
              <div className="relative max-w-lg flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by patient, phone, or email..."
                  className="app-input pl-9"
                />
              </div>
              <div className="app-pill border-violet-200 bg-violet-50 text-violet-700">
                {customers.length} customer profiles tracked
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="app-card">
              <EmptyState
                icon={<UserRound className="w-7 h-7 text-slate-400" />}
                title={customers.length === 0 ? "No customer profiles yet" : "No customers match this search"}
                description={
                  customers.length === 0
                    ? "Customer profiles appear automatically once the assistant captures patient details through a request."
                    : "Try a different name, phone number, or email."
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filtered.map((customer) => (
                <Link
                  key={customer.key}
                  href={`/dashboard/customers/${customer.key}`}
                  className="app-list-row app-card p-5 transition-all hover:border-teal-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-slate-900">
                        {customer.name}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {customer.phone || customer.email || "No direct contact saved"}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Conversations</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{customer.conversation_count}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Requests</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{customer.lead_count}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Booked</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{customer.booked_count}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">Open</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{customer.open_request_count}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4 text-xs text-slate-500">
                    <span>
                      Last interaction{" "}
                      {customer.last_interaction_at
                        ? timeAgo(customer.last_interaction_at)
                        : "not recorded"}
                    </span>
                    {customer.latest_note ? (
                      <span className="max-w-60 truncate">{customer.latest_note}</span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="workspace-side-rail">
          <div className="workspace-rail-card p-5">
            <p className="workspace-section-label">Best use</p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>Open a customer profile when you need the relationship view, not just the latest thread.</p>
              <p>Customer detail links back to inbox context, booking state, and recent notes so staff can work faster.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
