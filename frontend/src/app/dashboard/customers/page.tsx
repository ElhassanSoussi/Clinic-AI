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
import { formatCustomerNotePreview } from "@/lib/format-helpers";

function displayInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

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

  if (loading) return <LoadingState message="Loading customer profiles..." detail="Profiles are built from assistant conversations" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={loadCustomers} />;

  const customersWithBookings = customers.filter((customer) => customer.booked_count > 0).length;
  const customersNeedingAttention = customers.filter((customer) => customer.open_request_count > 0).length;

  return (
    <div className="workspace-page">
      <PageHeader
        showDivider
        eyebrow={
          <>
            <ContactRound className="h-3.5 w-3.5" />
            Customer workspace
          </>
        }
        title="Patient directory"
        description="Relationship-centric profiles: engagement history, open requests, and last touch—meant for context before you open the inbox or a booking."
      />

      <div className="workspace-split">
        <div className="order-1 min-w-0 space-y-4 xl:order-none">
          <div>
            <p className="workspace-section-label">Directory</p>
            <p className="mt-1 text-sm text-[#475569]">Search the full profile list. Cards surface conversation depth and whether something is still open.</p>
          </div>

          {/* Search + summary */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by patient, phone, or email..."
                className="min-h-10 w-full rounded-lg border border-[#E2E8F0] bg-white py-2 pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-[#64748B] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
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
                title={customers.length === 0 ? "No patient profiles yet" : "No patients match your search"}
                description={
                  customers.length === 0
                    ? "A profile appears after someone shares contact details in chat or completes part of your booking flow. Web chat is usually the first source."
                    : "Try a different name, phone number, or email address."
                }
                action={
                  customers.length === 0 ? (
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link
                        href="/dashboard/inbox"
                        className="inline-flex items-center gap-2 rounded-lg bg-[#0F766E] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#115E59]"
                      >
                        Open inbox
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        className="inline-flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]"
                      >
                        Check assistant settings
                      </Link>
                    </div>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {filtered.map((customer) => (
                <Link
                  key={customer.key}
                  href={`/dashboard/customers/${customer.key}`}
                  className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition-all hover:border-[#99f6e4] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-bold text-[#115E59]">
                        {displayInitials(customer.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A]">{customer.name}</p>
                        <p className="mt-0.5 text-xs text-[#475569]">
                          {customer.phone || customer.email || "No contact on file"}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          Last touch{" "}
                          {customer.last_interaction_at ? timeAgo(customer.last_interaction_at) : "—"}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#F1F5F9] pt-3 sm:grid-cols-4">
                    {[
                      { label: "Conversations", val: customer.conversation_count },
                      { label: "Requests", val: customer.lead_count },
                      { label: "Booked", val: customer.booked_count },
                      { label: "Open", val: customer.open_request_count },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <p className="text-[11px] font-medium capitalize tracking-wide text-[#64748B]">{stat.label}</p>
                        <p className="mt-0.5 text-base font-semibold tabular-nums text-[#0F172A]">{stat.val}</p>
                      </div>
                    ))}
                  </div>

                  {customer.latest_note ? (
                    <p className="mt-3 line-clamp-2 border-t border-[#F1F5F9] pt-3 text-xs italic leading-relaxed text-[#64748B]">
                      {formatCustomerNotePreview(customer.latest_note)}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right rail */}
        <aside className="workspace-side-rail order-2 xl:order-none">
          <div className="workspace-rail-card p-4 xl:sticky xl:top-6">
            <p className="workspace-rail-title">Directory health</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {[
                { label: "Profiles", value: customers.length },
                { label: "With bookings", value: customersWithBookings },
                { label: "Open requests", value: customersNeedingAttention },
              ].map((row) => (
                <div key={row.label} className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">{row.label}</p>
                  <p className="mt-0.5 text-xl font-semibold tabular-nums text-[#0F172A]">{row.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[#475569]">
              Open requests means at least one active booking or intake still in motion for that patient.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
