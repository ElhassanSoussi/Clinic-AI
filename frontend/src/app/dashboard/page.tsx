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
        icon={<MessageSquareMore className="w-6 h-6 text-slate-400" />}
        title="No activity yet"
        description="Your assistant is live. Events will appear here as patients interact with your clinic."
        action={
          clinic.slug ? (
            <a
              href={`/chat/${clinic.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              <MessageSquareMore className="h-3.5 w-3.5" />
              Test your assistant
            </a>
          ) : undefined
        }
      />
    ) : clinic && systemStatus === "READY" ? (
      <EmptyState
        icon={<MessageSquareMore className="w-6 h-6 text-slate-400" />}
        title="Ready to go live"
        description="Setup is complete. Go live to start receiving patient requests."
      />
    ) : (
      <EmptyState
        icon={<MessageSquareMore className="w-6 h-6 text-slate-400" />}
        title="System not live yet"
        description="Complete your setup to start receiving patient requests."
        action={
          <button
            onClick={() => router.push(settingsHref())}
            className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
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
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <>
            <LayoutGrid className="h-3.5 w-3.5" />
            Daily command center
          </>
        }
        title="Keep the front desk in sync."
        description="See capture volume, patient demand, booking pressure, and operator workload at a glance."
        actions={
          billing && billing.plan !== "premium" ? (
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-100"
            >
              <Zap className="h-4 w-4" />
              Upgrade plan
            </Link>
          ) : null
        }
      />

      {showFirstLeadSuccess ? (
        <div className="app-card border-emerald-100 bg-emerald-50/70 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-emerald-900">Your first lead is captured.</h3>
              <p className="mt-0.5 text-sm text-emerald-700">
                The assistant is working and new patient requests are now flowing into the workspace automatically.
              </p>
            </div>
            <button
              onClick={() => setShowFirstLeadSuccess(false)}
              className="text-lg leading-none text-emerald-400 hover:text-emerald-600"
            >
              &times;
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <MetricCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MetricCard
          label="Upcoming appointments"
          value={upcomingAppointments.length}
          icon={CalendarDays}
          tone="teal"
          detail="Confirmed bookings currently scheduled in Clinic AI."
        />
        <MetricCard
          label="Needs booking attention"
          value={attentionAppointments.length}
          icon={AlertTriangle}
          tone="amber"
          detail="Reschedules, cancellations, reminder prep, and operator follow-up still waiting on staff."
        />
        <Link href="/dashboard/appointments" className="app-card app-gradient-border block p-5 transition-transform hover:-translate-y-0.5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-500">Appointments workspace</p>
              <p className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
                Manage bookings, reminder readiness, and deposits in one place.
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Keep lifecycle actions, reminder prep, and patient booking state visible without implying an external calendar sync.
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <ArrowRight className="h-4.5 w-4.5" />
            </span>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard
          title="Performance snapshot"
          description="Practical metrics derived from real conversation, booking, and review activity."
          action={
            <Link
              href="/dashboard/inbox"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 transition-colors hover:text-teal-800"
            >
              Open inbox
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {performanceCards.map((card) => (
              <MetricCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} />
            ))}
          </div>

          <div className="mt-5 app-card-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Performance note</p>
            <p className="mt-1 text-sm text-slate-600">{analytics.estimated_value_recovered_label}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>Manual takeovers: {analytics.manual_takeover_threads}</span>
              <span>Blocked for review: {analytics.blocked_for_review_count}</span>
              <span>AI resolution estimate: {analytics.ai_resolution_estimate}%</span>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard
          title="Busiest contact hours"
          description="Based on incoming patient messages."
          action={<Clock className="h-4 w-4 text-slate-400" />}
        >
          {analytics.busiest_contact_hours.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-6 h-6 text-slate-400" />}
              title="Not enough conversation data yet"
              description="Once patients start chatting, you’ll see which hours are busiest."
            />
          ) : (
            <div className="space-y-4">
              {analytics.busiest_contact_hours.map((bucket) => (
                <div key={bucket.hour} className="flex items-center gap-3">
                  <div className="w-22 text-sm font-medium text-slate-700">{bucket.label}</div>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-violet-500"
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
                  <span className="text-xs text-slate-500">{bucket.count}</span>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>

      {billing ? (
        <div className="space-y-4">
          {billing.monthly_lead_limit !== -1 &&
          billing.monthly_leads_used >= billing.monthly_lead_limit &&
          billing.plan !== "trial" ? (
            <div className="app-card border-rose-100 bg-rose-50/70 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-900">Monthly lead limit reached</p>
                  <p className="mt-0.5 text-xs text-rose-700">
                    New patient conversations are paused. Upgrade your plan to continue.
                  </p>
                </div>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Upgrade
                </Link>
              </div>
            </div>
          ) : null}

          {billing.subscription_status === "past_due" ? (
            <div className="app-card border-rose-100 bg-rose-50/70 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-900">Payment failed</p>
                  <p className="mt-0.5 text-xs text-rose-700">
                    Update your payment method to keep the subscription active.
                  </p>
                </div>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex shrink-0 items-center rounded-2xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                >
                  Fix payment
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SurfaceCard
          title="Opportunities preview"
          description="Follow-up signals and stalled requests that may need attention."
          action={
            <Link
              href="/dashboard/opportunities"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 transition-colors hover:text-teal-800"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {opportunities.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="w-6 h-6 text-slate-400" />}
              title="No follow-up risk detected"
              description="When conversations stall or requests sit too long without a booked outcome, they will appear here."
            />
          ) : (
            <div className="space-y-3">
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
                    className="app-card-muted flex flex-col gap-3 px-4 py-4 transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        opportunity.priority === "high"
                          ? "bg-rose-50 text-rose-600"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      <AlertTriangle className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{opportunity.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {opportunity.customer_name} · {opportunity.detail}
                      </p>
                    </div>
                    <span className="text-xs text-slate-400">
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
          description="Latest conversation and request events across the clinic."
          action={
            <Link
              href="/dashboard/activity"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 transition-colors hover:text-teal-800"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          {activity.length === 0 ? (
            emptyActivityState
          ) : (
            <div className="space-y-3">
              {activity.slice(0, 8).map((event, index) => {
                const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.lead_created;
                const Icon = config.icon;
                const isLead =
                  event.type === "lead_created" || event.type === "lead_status_changed";

                return (
                  <div
                    key={`${event.type}-${event.resource_id}-${index}`}
                    className="app-card-muted flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${config.bg}`}>
                      <Icon className={`h-4.5 w-4.5 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {isLead ? (
                        <Link
                          href={`/dashboard/leads/${event.resource_id}`}
                          className="block truncate text-sm font-semibold text-slate-900 transition-colors hover:text-teal-700"
                        >
                          {event.title}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-semibold text-slate-900">{event.title}</p>
                      )}
                      <p className="mt-1 truncate text-xs text-slate-500">{event.detail}</p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-[11px] text-slate-400">{timeAgo(event.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SurfaceCard>
      </div>

      {analytics.conversations_total > 0 &&
      analytics.follow_up_needed_count === 0 &&
      analytics.unresolved_count === 0 ? (
        <div className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          You’re all caught up. No unresolved requests currently need attention.
        </div>
      ) : null}
    </div>
  );
}
