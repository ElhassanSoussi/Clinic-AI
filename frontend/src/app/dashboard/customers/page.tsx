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
import { MetricCard } from "@/components/shared/MetricCard";
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
        title="Patient directory"
        description="Contact details, conversation history, and booking outcomes for every patient who interacted with the assistant."
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          {/* Search + summary */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by patient, phone, or email..."
                className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-white pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-[#64748B] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
              />
            </div>
            <span className="rounded-md bg-[#CCFBF1]/90 px-2 py-0.5 text-xs font-semibold text-[#115E59]">
              {customers.length} profiles
            </span>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
              <EmptyState
                icon={<UserRound className="w-5 h-5 text-[#64748B]" />}
                title={customers.length === 0 ? "No patients yet" : "No patients match your search"}
                description={
                  customers.length === 0
                    ? "Patient profiles are created automatically when the assistant captures contact details from a conversation."
                    : "Try a different name, phone number, or email address."
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {filtered.map((customer) => (
                <Link
                  key={customer.key}
                  href={`/dashboard/customers/${customer.key}`}
                  className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition-all hover:border-[#99f6e4]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A]">{customer.name}</p>
                      <p className="mt-0.5 text-xs text-[#475569]">
                        {customer.phone || customer.email || "No contact saved"}
                      </p>
                    </div>
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                  </div>

                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {[
                      { label: "Conversations", val: customer.conversation_count },
                      { label: "Requests", val: customer.lead_count },
                      { label: "Booked", val: customer.booked_count },
                      { label: "Open", val: customer.open_request_count },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <p className="text-xs uppercase tracking-widest text-[#64748B]">{stat.label}</p>
                        <p className="mt-0.5 text-sm font-bold text-[#0F172A]">{stat.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-3 text-xs text-[#475569]">
                    <span>
                      Last{" "}
                      {customer.last_interaction_at
                        ? timeAgo(customer.last_interaction_at)
                        : "not recorded"}
                    </span>
                    {customer.latest_note ? (
                      <span className="max-w-40 truncate">{customer.latest_note}</span>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="hidden space-y-3 xl:block">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">Overview</p>
            <div className="mt-2.5 space-y-2">
              <MetricCard label="Profiles tracked" value={customers.length} icon={ContactRound} tone="slate" />
              <MetricCard label="With bookings" value={customersWithBookings} icon={ContactRound} tone="emerald" />
              <MetricCard label="Open requests" value={customersNeedingAttention} icon={ContactRound} tone="amber" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
