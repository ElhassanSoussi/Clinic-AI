"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Clock,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Settings,
  AlertTriangle,
  Zap,
  UserPlus,
  ArrowRightLeft,
  Inbox,
  BrainCircuit,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { timeAgo } from "@/lib/utils";
import { computeSystemStatus } from "@/lib/system-status";
import type {
  Clinic,
  BillingStatus,
  ActivityEvent,
  AppointmentRecord,
  FrontdeskAnalytics,
  Opportunity,
} from "@/types";

const EVENT_CONFIG: Record<ActivityEvent["type"], { icon: typeof UserPlus; color: string; bg: string; label: string }> = {
  lead_created: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50", label: "New Lead" },
  lead_status_changed: { icon: ArrowRightLeft, color: "text-amber-600", bg: "bg-amber-50", label: "Updated" },
  conversation_started: { icon: MessageSquare, color: "text-teal-600", bg: "bg-teal-50", label: "Chat" },
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

  let emptyActivityState: React.ReactNode;
  if (clinic && systemStatus === "LIVE") {
    emptyActivityState = (
      <EmptyState
        icon={<MessageSquare className="w-6 h-6 text-slate-400" />}
        title="No activity yet"
        description="Your assistant is live. Events will appear here as patients interact with your clinic."
        action={
          clinic.slug ? (
            <a
              href={`/chat/${clinic.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Test your assistant
            </a>
          ) : undefined
        }
      />
    );
  } else if (clinic && systemStatus === "READY") {
    emptyActivityState = (
      <EmptyState
        icon={<MessageSquare className="w-6 h-6 text-slate-400" />}
        title="Ready to go live"
        description="Setup is complete. Go live to start receiving patient requests."
      />
    );
  } else {
    emptyActivityState = (
      <EmptyState
        icon={<MessageSquare className="w-6 h-6 text-slate-400" />}
        title="System not live yet"
        description="Complete your setup to start receiving patient requests."
        action={
          <button
            onClick={() => router.push(settingsHref())}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Complete setup
          </button>
        }
      />
    );
  }

  const statCards = [
    {
      label: "Conversations",
      value: analytics.conversations_total,
      icon: Inbox,
      color: "text-slate-700",
      bg: "bg-slate-100",
    },
    {
      label: "Booked Requests",
      value: analytics.booked_requests,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      label: "Potential Lost Patients",
      value: analytics.potential_lost_patients,
      icon: Clock,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "Recovered Opportunities",
      value: analytics.recovered_opportunities,
      icon: Users,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
  ];

  const performanceCards = [
    {
      label: "Estimated Value Recovered",
      value: formatMoney(analytics.estimated_value_recovered_cents),
      icon: TrendingUp,
      color: "text-teal-700",
      bg: "bg-teal-50",
    },
    {
      label: "AI Auto-handled",
      value: analytics.ai_auto_handled_count,
      icon: BrainCircuit,
      color: "text-violet-700",
      bg: "bg-violet-50",
    },
    {
      label: "Human Review Required",
      value: analytics.human_review_required_count,
      icon: AlertTriangle,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "Suggested Replies Sent",
      value: analytics.suggested_replies_sent_count,
      icon: MessageSquare,
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      label: "Deposits Requested",
      value: analytics.deposits_requested_count,
      icon: ArrowRightLeft,
      color: "text-amber-700",
      bg: "bg-amber-50",
    },
    {
      label: "Deposits Paid",
      value: analytics.deposits_paid_count,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      label: "Waiting on Deposit",
      value: analytics.appointments_waiting_on_deposit_count,
      icon: AlertTriangle,
      color: "text-rose-700",
      bg: "bg-rose-50",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          See how the front desk is performing, what needs follow-up, and when patients reach out most often.
        </p>
      </div>

      {/* First Lead Success Banner */}
      {showFirstLeadSuccess && (
        <div className="mb-8 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-emerald-800">Your first lead is captured! 🎉</h3>
              <p className="text-sm text-emerald-600 mt-0.5">
                Your AI assistant is working. Patient requests will now appear on your dashboard automatically.
              </p>
            </div>
            <button
              onClick={() => setShowFirstLeadSuccess(false)}
              className="text-emerald-400 hover:text-emerald-600 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-700">Overview</h2>
        {billing && billing.plan !== "premium" && (
          <Link
            href="/dashboard/billing"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
          >
            <Zap className="w-3 h-3" /> Upgrade
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-500">
                {stat.label}
              </span>
              <div
                className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">
              Upcoming Appointments
            </span>
            <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-teal-700" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{upcomingAppointments.length}</p>
          <p className="text-sm text-slate-500 mt-2">
            Confirmed bookings currently scheduled in Clinic AI.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">
              Needs Booking Attention
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{attentionAppointments.length}</p>
          <p className="text-sm text-slate-500 mt-2">
            Reschedules, cancellations, reminder prep, and follow-up items waiting on staff.
          </p>
        </div>

        <Link
          href="/dashboard/appointments"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-teal-200 hover:bg-teal-50/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500">
              Appointments Workspace
            </span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-lg font-semibold text-slate-900">
            Manage booked requests in one operational view
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Review timing, reminder readiness, and booking lifecycle without implying external calendar sync.
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">
                Performance snapshot
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Practical metrics derived from real conversation and request data.
              </p>
            </div>
            <Link
              href="/dashboard/inbox"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800 transition-colors"
            >
              Open inbox
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {performanceCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-500">
                    {card.label}
                  </span>
                  <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                    <card.icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Estimate note
            </p>
            <p className="text-sm text-slate-600 mt-1">
              {analytics.estimated_value_recovered_label}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
              <span>Manual takeovers: {analytics.manual_takeover_threads}</span>
              <span>Blocked for review: {analytics.blocked_for_review_count}</span>
              <span>AI resolution estimate: {analytics.ai_resolution_estimate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">
                Busiest contact hours
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Based on incoming patient messages.
              </p>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          {analytics.busiest_contact_hours.length === 0 ? (
            <EmptyState
              icon={<Clock className="w-6 h-6 text-slate-400" />}
              title="Not enough conversation data yet"
              description="Once patients start chatting, you'll see which hours are busiest."
            />
          ) : (
            <div className="space-y-3">
              {analytics.busiest_contact_hours.map((bucket) => (
                <div key={bucket.hour} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-slate-700">
                    {bucket.label}
                  </div>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full"
                      style={{
                        width: `${Math.max(
                          20,
                          (bucket.count /
                            Math.max(
                              ...analytics.busiest_contact_hours.map(
                                (item) => item.count
                              ),
                              1
                            )) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{bucket.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Critical billing alerts */}
      {billing && (
        <div className="mb-4">
          {billing.monthly_lead_limit !== -1 &&
            billing.monthly_leads_used >= billing.monthly_lead_limit && billing.plan !== "trial" && (
            <div className="p-4 rounded-xl border bg-red-50 border-red-200 flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Monthly lead limit reached</p>
                <p className="text-xs text-red-600 mt-0.5">
                  New patient conversations are paused. Upgrade your plan to continue.
                </p>
              </div>
              <Link
                href="/dashboard/billing"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" /> Upgrade
              </Link>
            </div>
          )}
          {billing.subscription_status === "past_due" && (
            <div className="p-4 rounded-xl border bg-red-50 border-red-200 flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-red-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Payment failed</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Please update your payment method to keep your subscription active.
                </p>
              </div>
              <Link
                href="/dashboard/billing"
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                Fix Payment
              </Link>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 mb-8">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Opportunities
          </h2>
          <Link
            href="/dashboard/opportunities"
            className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {opportunities.length === 0 ? (
          <div className="px-5 py-10">
            <EmptyState
              icon={<AlertTriangle className="w-6 h-6 text-slate-400" />}
              title="No follow-up risk detected"
              description="When conversations stall or requests sit too long without a booked outcome, they will appear here."
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
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
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      opportunity.priority === "high"
                        ? "bg-rose-50 text-rose-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {opportunity.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {opportunity.customer_name} · {opportunity.detail}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {opportunity.occurred_at ? timeAgo(opportunity.occurred_at) : "Recently"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-slate-200 mb-8">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            Recent Activity
          </h2>
          <Link
            href="/dashboard/activity"
            className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activity.length === 0 ? (
          <div className="px-5 py-10">
            {emptyActivityState}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {activity.slice(0, 8).map((event, i) => {
              const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.lead_created;
              const Icon = config.icon;
              const isLead = event.type === "lead_created" || event.type === "lead_status_changed";

              return (
                <div
                  key={`${event.type}-${event.resource_id}-${i}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {isLead ? (
                      <Link
                        href={`/dashboard/leads/${event.resource_id}`}
                        className="text-sm font-medium text-slate-900 hover:text-teal-700 transition-colors truncate block"
                      >
                        {event.title}
                      </Link>
                    ) : (
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {event.title}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {event.detail}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">
                      {timeAgo(event.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All caught up */}
      {analytics.conversations_total > 0 &&
        analytics.follow_up_needed_count === 0 &&
        analytics.unresolved_count === 0 && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-emerald-600">
          <CheckCircle2 className="w-4 h-4" />
          You&apos;re all caught up. No unresolved requests currently need attention.
        </div>
      )}
    </div>
  );
}
