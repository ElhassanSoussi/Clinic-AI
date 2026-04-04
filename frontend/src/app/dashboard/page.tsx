"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Clock,
  Inbox,
  LayoutGrid,
  MessageSquareMore,
  Settings,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";

import { api } from "@/lib/api";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { RightRailCard } from "@/components/ui";
import { timeAgo } from "@/lib/utils";
import { computeSystemStatus } from "@/lib/system-status";
import type {
  ActivityEvent,
  AppointmentRecord,
  BillingStatus,
  Clinic,
  FrontdeskAnalytics,
  Opportunity,
} from "@/types";

const EVENT_CONFIG: Record<
  ActivityEvent["type"],
  { icon: typeof UserPlus; color: string; bg: string; label: string }
> = {
  lead_created: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50", label: "New Lead" },
  lead_status_changed: { icon: ArrowRightLeft, color: "text-amber-600", bg: "bg-amber-50", label: "Updated" },
  conversation_started: {
    icon: MessageSquareMore,
    color: "text-teal-600",
    bg: "bg-teal-50",
    label: "Chat",
  },
};

function settingsHref(section?: string | null): string {
  if (!section) return "/dashboard/settings";
  return `/dashboard/settings?section=${encodeURIComponent(section)}`;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function DashboardPage() {
  const router = useRouter();
  const [firstLead] = useState(
    () =>
      globalThis.window !== undefined &&
      new URLSearchParams(globalThis.location.search).get("first_lead") === "true"
  );
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [analytics, setAnalytics] = useState<FrontdeskAnalytics | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentRecord[]>([]);
  const [attentionAppointments, setAttentionAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFirstLeadSuccess, setShowFirstLeadSuccess] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const optional = async <T,>(loader: Promise<T>, fallback: T): Promise<T> => {
        try {
          return await loader;
        } catch {
          return fallback;
        }
      };

      const [
        clinicData,
        analyticsData,
        billingData,
        activityData,
        opportunitiesData,
        upcomingAppointmentsData,
        attentionAppointmentsData,
      ] = await Promise.all([
        api.clinics.getMyClinic(),
        api.frontdesk.getAnalytics(),
        optional(api.billing.getStatus(), null),
        optional(api.activity.list(8), []),
        optional(api.frontdesk.listOpportunities(), []),
        optional(api.frontdesk.listAppointments("upcoming"), []),
        optional(api.frontdesk.listAppointments("attention"), []),
      ]);

      setClinic(clinicData);
      setAnalytics(analyticsData);
      setBilling(billingData);
      setActivity(activityData);
      setOpportunities(opportunitiesData);
      setUpcomingAppointments(upcomingAppointmentsData);
      setAttentionAppointments(attentionAppointmentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (firstLead && !loading) {
      setShowFirstLeadSuccess(true);
    }
  }, [firstLead, loading]);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;
  if (!analytics) {
    return (
      <ErrorState
        title="Analytics unavailable"
        message="The dashboard could not load the latest front desk metrics."
        onRetry={loadDashboard}
      />
    );
  }

  const systemStatus = clinic ? computeSystemStatus(clinic).status : null;

  const emptyActivityState =
    clinic && systemStatus === "LIVE" ? (
      <EmptyState
        icon={<MessageSquareMore className="w-5 h-5 text-slate-400" />}
        title="No activity yet"
        description="Your assistant is live. Events will appear here as patients interact."
        action={
          clinic.slug ? (
            <a
              href={`/chat/${clinic.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
            >
              <MessageSquareMore className="h-3.5 w-3.5" />
              Test your assistant
            </a>
          ) : undefined
        }
      />
    ) : clinic && systemStatus === "READY" ? (
      <EmptyState
        icon={<MessageSquareMore className="w-5 h-5 text-slate-400" />}
        title="Ready to go live"
        description="Setup is complete. Go live to start receiving patient requests."
      />
    ) : (
      <EmptyState
        icon={<MessageSquareMore className="w-5 h-5 text-slate-400" />}
        title="System not live yet"
        description="Complete your setup to start receiving patient requests."
        action={
          <button
            onClick={() => router.push(settingsHref())}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
          >
            <Settings className="h-3.5 w-3.5" />
            Complete setup
          </button>
        }
      />
    );

  const statCards = [
    { label: "Conversations", value: analytics.conversations_total, icon: Inbox, tone: "slate" as const },
    { label: "Booked requests", value: analytics.booked_requests, icon: CheckCircle2, tone: "emerald" as const },
    { label: "Potential lost patients", value: analytics.potential_lost_patients, icon: Clock, tone: "amber" as const },
    { label: "Recovered opportunities", value: analytics.recovered_opportunities, icon: Users, tone: "blue" as const },
  ];

  const performanceCards = [
    {
      label: "Estimated value recovered",
      value: formatMoney(analytics.estimated_value_recovered_cents),
      icon: TrendingUp,
      tone: "teal" as const,
    },
    { label: "AI auto-handled", value: analytics.ai_auto_handled_count, icon: BrainCircuit, tone: "violet" as const },
    { label: "Human review required", value: analytics.human_review_required_count, icon: AlertTriangle, tone: "amber" as const },
    { label: "Suggested replies sent", value: analytics.suggested_replies_sent_count, icon: MessageSquareMore, tone: "blue" as const },
    { label: "Deposits requested", value: analytics.deposits_requested_count, icon: ArrowRightLeft, tone: "amber" as const },
    { label: "Deposits paid", value: analytics.deposits_paid_count, icon: CheckCircle2, tone: "emerald" as const },
    { label: "Waiting on deposit", value: analytics.appointments_waiting_on_deposit_count, icon: AlertTriangle, tone: "rose" as const },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <LayoutGrid className="h-3.5 w-3.5" />
            Command center
          </>
        }
        title="Front desk overview"
        description="Capture volume, patient demand, booking pressure, and operator workload."
        actions={
          billing && billing.plan !== "premium" ? (
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-100"
            >
              <Zap className="h-3.5 w-3.5" />
              Upgrade plan
            </Link>
          ) : null
        }
      />

      {/* ── First lead success banner ── */}
      {showFirstLeadSuccess && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">First lead captured</p>
              <p className="mt-0.5 text-xs text-emerald-700">
                Patient requests are now flowing into the workspace automatically.
              </p>
            </div>
            <button
              onClick={() => setShowFirstLeadSuccess(false)}
              className="text-emerald-400 hover:text-emerald-600"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* ── Billing alerts ── */}
      {billing && (
        <div className="space-y-3">
          {billing.monthly_lead_limit !== -1 &&
          billing.monthly_leads_used >= billing.monthly_lead_limit &&
          billing.plan !== "trial" && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-900">Monthly lead limit reached</p>
                  <p className="mt-0.5 text-xs text-rose-700">New conversations are paused. Upgrade to continue.</p>
                </div>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  <Zap className="h-3 w-3" />
                  Upgrade
                </Link>
              </div>
            </div>
          )}

          {billing.subscription_status === "past_due" && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-900">Payment failed</p>
                  <p className="mt-0.5 text-xs text-rose-700">Update your payment method to keep your subscription active.</p>
                </div>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex shrink-0 items-center rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Fix payment
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main layout: canvas + right rail ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        {/* ── Canvas ── */}
        <div className="space-y-6">
          {/* Hero panel */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <Sparkles className="h-3 w-3" />
                  Front-desk command center
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  Conversations, bookings, and operator workload in one view.
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  What was captured, what needs human judgment, and which items still need attention.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:w-72">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live demand</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{analytics.conversations_total}</p>
                  <p className="mt-1 text-[11px] text-slate-400">Active conversations</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Booked now</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{analytics.booked_requests}</p>
                  <p className="mt-1 text-[11px] text-slate-400">Confirmed requests</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statCards.map((card) => (
              <MetricCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} />
            ))}
          </div>

          {/* Appointment row */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <MetricCard
              label="Upcoming appointments"
              value={upcomingAppointments.length}
              icon={CalendarDays}
              tone="teal"
              detail="Confirmed bookings scheduled."
            />
            <MetricCard
              label="Needs attention"
              value={attentionAppointments.length}
              icon={AlertTriangle}
              tone="amber"
              detail="Reschedules, cancellations, deposit follow-ups."
            />
            <Link
              href="/dashboard/appointments"
              className="flex items-start justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Appointments</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Manage bookings, reminders, and deposits</p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>

          {/* Performance snapshot */}
          <SurfaceCard
            title="Performance snapshot"
            description="Metrics from real conversation, booking, and review activity."
            action={
              <Link
                href="/dashboard/inbox"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                Open inbox
                <ArrowRight className="h-3 w-3" />
              </Link>
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {performanceCards.map((card) => (
                <MetricCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} />
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-slate-50 bg-slate-50/50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Performance note</p>
              <p className="mt-1.5 text-sm text-slate-600">{analytics.estimated_value_recovered_label}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                <span>Manual takeovers: {analytics.manual_takeover_threads}</span>
                <span>Blocked for review: {analytics.blocked_for_review_count}</span>
                <span>AI resolution: {analytics.ai_resolution_estimate}%</span>
              </div>
            </div>
          </SurfaceCard>

          {/* Busiest hours */}
          <SurfaceCard
            title="Busiest contact hours"
            description="Based on incoming patient messages."
            action={<Clock className="h-3.5 w-3.5 text-slate-400" />}
          >
            {analytics.busiest_contact_hours.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-5 h-5 text-slate-400" />}
                title="Not enough data yet"
                description="Once patients start chatting, you'll see which hours are busiest."
              />
            ) : (
              <div className="space-y-3">
                {analytics.busiest_contact_hours.map((bucket) => (
                  <div key={bucket.hour} className="flex items-center gap-3">
                    <div className="w-20 text-xs font-medium text-slate-600">{bucket.label}</div>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-teal-500 to-violet-500"
                        style={{
                          width: `${Math.max(
                            20,
                            (bucket.count /
                              Math.max(
                                ...analytics.busiest_contact_hours.map((item) => item.count),
                                1,
                              )) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">{bucket.count}</span>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          {/* Two-column: Opportunities + Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SurfaceCard
              title="Opportunities"
              description="Follow-up signals and stalled requests."
              action={
                <Link
                  href="/dashboard/opportunities"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              }
            >
              {opportunities.length === 0 ? (
                <EmptyState
                  icon={<AlertTriangle className="w-5 h-5 text-slate-400" />}
                  title="No follow-up risk"
                  description="Stalled requests will appear here when detected."
                />
              ) : (
                <div className="space-y-2">
                  {opportunities.slice(0, 5).map((opportunity) => {
                    const href = opportunity.conversation_id
                      ? `/dashboard/inbox/${opportunity.conversation_id}`
                      : opportunity.lead_id
                        ? `/dashboard/leads/${opportunity.lead_id}`
                        : opportunity.customer_key
                          ? `/dashboard/customers/${opportunity.customer_key}`
                          : "/dashboard/opportunities";
                    return (
                      <Link
                        key={opportunity.id}
                        href={href}
                        className="flex items-center gap-3 rounded-xl border border-slate-50 px-3.5 py-3 transition-all hover:border-slate-100 hover:bg-slate-50/50"
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            opportunity.priority === "high"
                              ? "bg-rose-50 text-rose-600"
                              : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{opportunity.title}</p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {opportunity.customer_name} · {opportunity.detail}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-slate-300">
                          {opportunity.occurred_at ? timeAgo(opportunity.occurred_at) : "Recently"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </SurfaceCard>

            <SurfaceCard
              title="Recent activity"
              description="Latest events across the clinic."
              action={
                <Link
                  href="/dashboard/activity"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              }
            >
              {activity.length === 0 ? (
                emptyActivityState
              ) : (
                <div className="space-y-2">
                  {activity.slice(0, 8).map((event, index) => {
                    const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.lead_created;
                    const Icon = config.icon;
                    const isLead =
                      event.type === "lead_created" || event.type === "lead_status_changed";
                    return (
                      <div
                        key={`${event.type}-${event.resource_id}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-50 px-3.5 py-3"
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          {isLead ? (
                            <Link
                              href={`/dashboard/leads/${event.resource_id}`}
                              className="block truncate text-sm font-medium text-slate-900 hover:text-teal-700"
                            >
                              {event.title}
                            </Link>
                          ) : (
                            <p className="truncate text-sm font-medium text-slate-900">{event.title}</p>
                          )}
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">{event.detail}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${config.bg} ${config.color}`}>
                            {config.label}
                          </span>
                          <span className="text-[10px] text-slate-300">{timeAgo(event.timestamp)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SurfaceCard>
          </div>

          {/* All caught up */}
          {analytics.conversations_total > 0 &&
          analytics.follow_up_needed_count === 0 &&
          analytics.unresolved_count === 0 && (
            <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              All caught up — no unresolved requests need attention.
            </div>
          )}
        </div>

        {/* ── Right rail ── */}
        <div className="hidden space-y-4 xl:block">
          <RightRailCard title="Workspace state">
            <div className="space-y-2.5">
              <div className="rounded-xl border border-slate-50 bg-slate-50/50 px-3.5 py-3">
                <p className="text-[11px] text-slate-400">System</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{systemStatus ?? "Not ready"}</p>
              </div>
              <div className="rounded-xl border border-slate-50 bg-slate-50/50 px-3.5 py-3">
                <p className="text-[11px] text-slate-400">Current plan</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {billing ? billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1) : "Unavailable"}
                </p>
              </div>
            </div>
          </RightRailCard>

          <RightRailCard title="Quick routes">
            <div className="space-y-2">
              {[
                { href: "/dashboard/inbox", label: "Open inbox", detail: "Review active conversations." },
                { href: "/dashboard/appointments", label: "Appointments", detail: "Bookings, reminders, deposits." },
                { href: "/dashboard/opportunities", label: "Follow-up queue", detail: "Stalled requests going cold." },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-xl border border-slate-50 px-3.5 py-3 transition-all hover:border-slate-100 hover:bg-slate-50/50"
                >
                  <p className="text-sm font-medium text-slate-900">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{item.detail}</p>
                </Link>
              ))}
            </div>
          </RightRailCard>

          <RightRailCard title="Daily focus">
            <div className="space-y-2.5">
              <div className="rounded-xl border border-slate-50 bg-slate-50/50 px-3.5 py-3">
                <p className="text-sm font-medium text-slate-900">Human review</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {analytics.human_review_required_count} conversations waiting for a staff decision.
                </p>
              </div>
              <div className="rounded-xl border border-slate-50 bg-slate-50/50 px-3.5 py-3">
                <p className="text-sm font-medium text-slate-900">Attention required</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {attentionAppointments.length} bookings blocked by prep, reschedule, or deposit needs.
                </p>
              </div>
              <div className="rounded-xl border border-slate-50 bg-slate-50/50 px-3.5 py-3">
                <p className="text-sm font-medium text-slate-900">Opportunity pressure</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {analytics.follow_up_needed_count} follow-ups and {analytics.unresolved_count} unresolved requests.
                </p>
              </div>
            </div>
          </RightRailCard>
        </div>
      </div>
    </div>
  );
}
