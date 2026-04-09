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
        title="Patient relationships"
        description="A relationship workspace built from live conversations—see engagement depth, bookings, open requests, and last touch before you open inbox or a lead."
      />

      <section className="ds-control-hero-panel p-5 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="workspace-section-label">Relationship command</p>
            <h2 className="mt-2 text-[1.95rem] font-bold tracking-[-0.045em] text-[#0F172A] sm:text-[2.35rem]">
              See every patient relationship as one continuous front-desk record.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#475569]">
              Customers are built from real conversations, requests, and bookings. Use this space to understand who is active, who has history, and who still needs your team’s attention.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Profiles", value: customers.length, detail: "Every patient profile created from real contact or booking activity." },
                { label: "Booked", value: customersWithBookings, detail: "Profiles with confirmed booking history." },
                { label: "Open work", value: customersNeedingAttention, detail: "Profiles still carrying active request motion." },
              ].map((item) => (
                <div key={item.label} className="rounded-[1.25rem] border border-[#DDE5EE] bg-white/90 px-4 py-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-[#0F172A]">{item.value}</p>
                  <p className="mt-2 text-xs leading-relaxed text-[#475569]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.45rem] border border-[#DDE5EE] bg-white/94 p-5 shadow-[var(--ds-shadow-md)]">
            <p className="workspace-rail-title">Directory pulse</p>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-[#475569]">
              <p>Open requests means a patient still has intake or booking work in motion.</p>
              <p>Profiles with bookings are your strongest continuity signal across inbox, appointments, and follow-up.</p>
              <p>Use search when you know the person; use the cards when you need to understand recent relationship activity fast.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="workspace-split">
        <div className="order-1 min-w-0 xl:order-none">
          <div className="wave-workbench">
            <div className="wave-workbench-head">
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#64748B]">Relationship directory</p>
                <p className="mt-0.5 text-sm font-semibold text-[#0F172A]">Search &amp; profile cards</p>
              </div>
              <span className="rounded-full border border-[#99f6e4] bg-[#CCFBF1] px-2.5 py-1 text-xs font-semibold text-[#115E59]">
                {filtered.length} in view
              </span>
            </div>
            <div className="wave-workbench-body space-y-4">
              <div>
                <p className="workspace-section-label">Find a patient</p>
                <p className="mt-1 text-sm text-[#475569]">Each card shows conversation depth, pipeline stats, and the latest staff note preview.</p>
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
                    className="min-h-10 w-full rounded-lg border border-[#E2E8F0] bg-white py-2 pl-9 pr-3 text-sm text-[#0F172A] shadow-sm placeholder:text-[#64748B] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
                  />
                </div>
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
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {filtered.map((customer) => (
                    <Link
                      key={customer.key}
                      href={`/dashboard/customers/${customer.key}`}
                      className="group rounded-xl border border-[var(--color-app-border)] bg-gradient-to-br from-white to-[var(--color-app-elevated)] p-4 shadow-[var(--ds-shadow-md)] transition-all hover:border-[#99f6e4] hover:shadow-[var(--ds-shadow-lg)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#CCFBF1]/50 text-xs font-bold text-[#115E59] shadow-sm">
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
          </div>
        </div>

        {/* Right rail */}
        <aside className="workspace-side-rail order-2 xl:order-none">
          <div className="wave-command-slab !py-4 xl:sticky xl:top-6">
            <p className="workspace-section-label">Workspace context</p>
            <p className="workspace-rail-title mt-2">Directory health</p>
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
            <div className="mt-4 rounded-xl border border-[#DDE5EE] bg-white/85 px-4 py-4 shadow-sm">
              <p className="workspace-rail-title">Best use</p>
              <p className="mt-2 text-sm leading-relaxed text-[#475569]">
                Open the directory when staff need relationship context first. Move to Inbox for active conversation handling and Appointments for confirmed schedule work.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
