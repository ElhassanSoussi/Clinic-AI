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
  Rocket,
  Settings,
  TrendingUp,
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
import { ActivationSetupBand } from "@/components/shared/ActivationSetupBand";
import { RightRailCard } from "@/components/ui";
import { clampPercentInt, safeCount, timeAgo } from "@/lib/utils";
import { normalizeLeadUsage } from "@/lib/billing-usage";
import { computeSystemStatus } from "@/lib/system-status";
import { EVENT_CONFIG } from "@/lib/activity-config";
import { formatMoney } from "@/lib/format-helpers";
import { DEGRADED_FRONTDESK_ANALYTICS } from "@/lib/degraded-analytics";
import type {
  ActivityEvent,
  AppointmentRecord,
  BillingStatus,
  Clinic,
  FrontdeskAnalytics,
  Opportunity,
} from "@/types";

function settingsHref(section?: string | null): string {
  if (!section) return "/dashboard/settings";
  return `/dashboard/settings?section=${encodeURIComponent(section)}`;
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
  const [showWelcomeFromOnboarding, setShowWelcomeFromOnboarding] = useState(false);
  const [analyticsDegraded, setAnalyticsDegraded] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    setAnalyticsDegraded(false);
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
        optional(api.frontdesk.getAnalytics(), null),
        optional(api.billing.getStatus(), null),
        optional(api.activity.list(8), []),
        optional(api.frontdesk.listOpportunities(), []),
        optional(api.frontdesk.listAppointments("upcoming"), []),
        optional(api.frontdesk.listAppointments("attention"), []),
      ]);

      setClinic(clinicData);
      const safeAnalytics =
        analyticsData && typeof analyticsData.conversations_total === "number"
          ? analyticsData
          : null;
      setAnalyticsDegraded(!safeAnalytics);
      setAnalytics(safeAnalytics ?? DEGRADED_FRONTDESK_ANALYTICS);
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
    if (globalThis.window === undefined) return;
    const params = new URLSearchParams(globalThis.location.search);
    if (params.get("welcome") === "true") {
      setShowWelcomeFromOnboarding(true);
      params.delete("welcome");
      const qs = params.toString();
      const nextUrl = qs ? `${globalThis.location.pathname}?${qs}` : globalThis.location.pathname;
      globalThis.history.replaceState(null, "", nextUrl);
    }
  }, []);

  useEffect(() => {
    if (firstLead && !loading) {
      setShowFirstLeadSuccess(true);
    }
  }, [firstLead, loading]);

  if (loading) return <LoadingState message="Loading dashboard..." detail="Gathering clinic and workspace summaries" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={loadDashboard} />;
  if (!analytics) return <LoadingState message="Loading dashboard..." />;

  const systemStatus = clinic ? computeSystemStatus(clinic).status : null;
  const leadUsage = billing ? normalizeLeadUsage(billing) : null;

  function buildEmptyActivityState() {
    if (clinic && systemStatus === "LIVE") {
      return (
        <EmptyState
          icon={<MessageSquareMore className="w-5 h-5 text-[#64748B]" />}
          title="No activity yet"
          description="Your assistant is live. Activity appears as patients use web chat (and SMS when configured). No volume yet is normal right after go-live."
          action={
            clinic.slug ? (
              <a
                href={`/chat/${clinic.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#115E59]"
              >
                <MessageSquareMore className="h-3.5 w-3.5" />
                Test assistant
              </a>
            ) : undefined
          }
        />
      );
    }
    if (clinic && systemStatus === "READY") {
      return (
        <EmptyState
          icon={<MessageSquareMore className="h-5 w-5 text-[#64748B]" />}
          title="Ready to go live"
          description="Setup is complete. Use Go live in the top bar when you want patients to see an active assistant on your public chat page."
          action={
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href={settingsHref()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-[#F8FAFC]"
              >
                <Settings className="h-4 w-4" />
                Review settings
              </Link>
              {clinic.slug ? (
                <a
                  href={`/chat/${clinic.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#115E59]"
                >
                  <MessageSquareMore className="h-4 w-4" />
                  Preview patient chat
                </a>
              ) : null}
            </div>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={<MessageSquareMore className="w-5 h-5 text-[#64748B]" />}
        title="Setup not complete"
        description="Complete your clinic details in settings so the assistant knows how to respond accurately."
        action={
          <button
            onClick={() => router.push(settingsHref())}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#115E59]"
          >
            <Settings className="h-3.5 w-3.5" />
            Open settings
          </button>
        }
      />
    );
  }

  const emptyActivityState = buildEmptyActivityState();

  const statCards = [
    { label: "Conversations", value: safeCount(analytics.conversations_total), icon: Inbox, tone: "slate" as const },
    { label: "Booked requests", value: safeCount(analytics.booked_requests), icon: CheckCircle2, tone: "emerald" as const },
    { label: "Potential lost patients", value: safeCount(analytics.potential_lost_patients), icon: Clock, tone: "amber" as const },
    { label: "Recovered opportunities", value: safeCount(analytics.recovered_opportunities), icon: Users, tone: "blue" as const },
  ];

  const performanceCards = [
    {
      label: "Estimated value recovered",
      value: formatMoney(analytics.estimated_value_recovered_cents),
      icon: TrendingUp,
      tone: "teal" as const,
    },
    { label: "AI auto-handled", value: safeCount(analytics.ai_auto_handled_count), icon: BrainCircuit, tone: "violet" as const },
    { label: "Human review required", value: safeCount(analytics.human_review_required_count), icon: AlertTriangle, tone: "amber" as const },
    { label: "Suggested replies sent", value: safeCount(analytics.suggested_replies_sent_count), icon: MessageSquareMore, tone: "blue" as const },
    { label: "Deposits requested", value: safeCount(analytics.deposits_requested_count), icon: ArrowRightLeft, tone: "amber" as const },
    { label: "Deposits paid", value: safeCount(analytics.deposits_paid_count), icon: CheckCircle2, tone: "emerald" as const },
    { label: "Waiting on deposit", value: safeCount(analytics.appointments_waiting_on_deposit_count), icon: AlertTriangle, tone: "rose" as const },
  ];

  const busiestHourMaxCount = Math.max(
    1,
    ...(analytics.busiest_contact_hours?.map((item) =>
      typeof item.count === "number" && Number.isFinite(item.count) ? item.count : 0,
    ) ?? [0]),
  );

  const quickRoutes = [
    { href: "/dashboard/inbox", label: "Inbox" },
    { href: "/dashboard/leads", label: "Leads" },
    { href: "/dashboard/appointments", label: "Appointments" },
    { href: "/dashboard/operations", label: "Operations" },
  ] as const;

  return (
    <div className="workspace-page">
      <PageHeader
        showDivider
        eyebrow={
          <>
            <LayoutGrid className="h-3.5 w-3.5" />
            Overview
          </>
        }
        title="Command center"
        description="Pressure, pipeline, throughput, and the next staff moves—grouped so you scan the desk in seconds, not a flat grid of widgets."
        actions={
          billing && billing.plan !== "premium" ? (
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 rounded-xl border border-[#99f6e4] bg-[#CCFBF1] px-3.5 py-2 text-xs font-semibold text-[#115E59] transition-colors hover:bg-[#CCFBF1]"
            >
              <Zap className="h-3.5 w-3.5" />
              Upgrade plan
            </Link>
          ) : null
        }
      />

      {clinic ? (
        <ActivationSetupBand clinic={clinic} conversationsTotal={analytics.conversations_total} />
      ) : null}

      {/* ── First lead success banner ── */}
      {analyticsDegraded ? (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">Front-desk metrics did not load</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800/90">
              The rest of the dashboard is still available. Counts below may show zero until the metrics service responds — use &ldquo;Try again&rdquo; or refresh shortly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50"
          >
            Retry metrics
          </button>
        </div>
      ) : null}

      {showWelcomeFromOnboarding && (
        <div className="rounded-xl border border-[#99f6e4] bg-[#CCFBF1]/50 px-4 py-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <Rocket className="h-5 w-5 text-[#0F766E]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#115E59]">Setup complete — you&apos;re on the dashboard</p>
              <p className="mt-1 text-sm leading-relaxed text-[#475569]">
                Onboarding saved your clinic profile. <span className="font-semibold text-[#0F172A]">Next:</span> confirm
                details in Settings, open <span className="font-semibold text-[#0F172A]">Patient Chat</span> from the
                sidebar to preview your assistant, then use <span className="font-semibold text-[#0F172A]">Go live</span>{" "}
                in the header when you are ready. First patient threads appear in Inbox; captured requests surface in
                Leads.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowWelcomeFromOnboarding(false)}
              className="shrink-0 rounded-lg p-1 text-[#64748B] transition-colors hover:bg-white/80 hover:text-[#0F172A]"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#99f6e4]/60 pt-4">
            <Link
              href={settingsHref()}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-sm font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-[#F8FAFC]"
            >
              <Settings className="h-4 w-4" />
              Open settings
            </Link>
            <Link
              href="/dashboard/inbox"
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-sm font-semibold text-[#0F172A] shadow-sm transition-colors hover:bg-[#F8FAFC]"
            >
              <Inbox className="h-4 w-4" />
              Inbox
            </Link>
            {clinic?.slug ? (
              <a
                href={`/chat/${clinic.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-[#0F766E] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#115E59]"
              >
                <MessageSquareMore className="h-4 w-4" />
                Preview chat
              </a>
            ) : null}
          </div>
        </div>
      )}

      {showFirstLeadSuccess && (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">First lead captured</p>
              <p className="mt-0.5 text-xs text-emerald-700/80">
                Patient requests are now flowing into the workspace automatically.
              </p>
            </div>
            <button
              onClick={() => setShowFirstLeadSuccess(false)}
              className="text-emerald-300 hover:text-emerald-500"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* ── Billing alerts ── */}
      {billing && (
        <div className="space-y-3">
          {leadUsage?.isAtLimit && billing.plan !== "trial" && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5">
              <div className="flex flex-wrap items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-rose-900">Monthly lead limit reached</p>
                  <p className="mt-0.5 text-xs text-rose-700">New conversations are paused. Upgrade to continue.</p>
                </div>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#0F766E] px-3 py-2 text-xs font-semibold text-white hover:bg-[#115E59]"
                >
                  <Zap className="h-3 w-3" />
                  Upgrade
                </Link>
              </div>
            </div>
          )}

          {billing.subscription_status === "past_due" && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5">
              <div className="flex flex-wrap items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-rose-900">Payment failed</p>
                  <p className="mt-0.5 text-xs text-rose-700">Update your payment method to keep your subscription active.</p>
                </div>
                <Link
                  href="/dashboard/billing"
                  className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Fix payment
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Main layout: canvas + right rail ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px]">
        {/* ── Canvas ── */}
        <div className="order-1 min-w-0 space-y-5 xl:order-none">
          <div className="wave-command-slab workspace-command-hero">
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(16rem,0.72fr)]">
              <div className="min-w-0">
                <p className="workspace-section-label">Front-desk pressure</p>
                <h2 className="mt-2 text-[1.45rem] font-semibold tracking-[-0.04em] text-[#0F172A]">
                  Scan what needs attention, then move straight into the workbench pages.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#475569]">
                  This overview is your operational summary, not a separate analytics product. Unresolved conversations, follow-up load, review pressure, bookings, and training readiness all map directly to the pages your team works from next.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {quickRoutes.map((r) => (
                    <Link
                      key={r.href}
                      href={r.href}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-2 text-xs font-semibold text-[#475569] shadow-[0_12px_20px_-18px_rgb(12_18_32/0.35)] transition-colors hover:border-[#CBD5E1] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                    >
                      {r.label}
                      <ArrowRight className="h-3 w-3 text-[#94A3B8]" />
                    </Link>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-[#dce8f5] bg-white/95 px-3 py-3.5 text-center shadow-[0_18px_28px_-24px_rgb(12_18_32/0.25)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">Unresolved</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-[#0F172A]">{safeCount(analytics.unresolved_count)}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-3.5 text-center shadow-[0_18px_28px_-24px_rgb(217_119_6/0.28)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">Follow-up</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-amber-900">{safeCount(analytics.follow_up_needed_count)}</p>
                </div>
                <div className="rounded-2xl border border-[#d8cdfd] bg-[#f5f1ff] px-3 py-3.5 text-center shadow-[0_18px_28px_-24px_rgb(124_99_243/0.34)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6c58c9]">Review</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-[#3d2c84]">{safeCount(analytics.human_review_required_count)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="wave-zone-panel space-y-4">
            <div>
              <p className="workspace-section-label">Pipeline &amp; bookings</p>
              <p className="mt-1 text-sm text-[#475569]">Volume and booking posture—pair with appointments for timing and deposits.</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <MetricCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
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
                className="flex items-start justify-between rounded-xl border border-[#E2E8F0] bg-white px-4 py-3.5 shadow-sm transition-all hover:border-[#CBD5E1] hover:shadow-md"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Appointments</p>
                  <p className="mt-1.5 text-sm font-semibold text-[#0F172A]">Manage bookings, reminders, and deposits</p>
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#CCFBF1] text-[#0F766E]">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </div>
          </div>

          <div className="wave-zone-panel space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="workspace-section-label">Throughput &amp; motion</p>
                <p className="mt-1 text-sm text-[#475569]">How work moved—value, automation, deposits, and review load.</p>
              </div>
              <Link
                href="/dashboard/inbox"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#115E59] hover:text-[#115E59]"
              >
                Open inbox
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {performanceCards.map((card) => (
                <MetricCard key={card.label} label={card.label} value={card.value} icon={card.icon} tone={card.tone} />
              ))}
            </div>

            <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#475569]">Performance note</p>
              <p className="mt-0.5 text-sm text-[#475569]">{analytics.estimated_value_recovered_label}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[#475569]">
                <span>Manual takeovers: {safeCount(analytics.manual_takeover_threads)}</span>
                <span>Blocked for review: {safeCount(analytics.blocked_for_review_count)}</span>
                <span>AI resolution: {clampPercentInt(analytics.ai_resolution_estimate)}%</span>
              </div>
            </div>
          </div>

          <div className="wave-zone-panel space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="workspace-section-label">Contact rhythm</p>
                <p className="mt-1 text-sm text-[#475569]">When patients reach out most, from live message timestamps.</p>
              </div>
              <Clock className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
            </div>
            {!analytics.busiest_contact_hours || analytics.busiest_contact_hours.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-5 h-5 text-[#64748B]" />}
                title="Not enough data yet"
                description="Contact-hour patterns will appear after patients begin interacting with the assistant."
              />
            ) : (
              <div className="space-y-3">
                {analytics.busiest_contact_hours.map((bucket) => {
                  const count = typeof bucket.count === "number" && Number.isFinite(bucket.count) ? bucket.count : 0;
                  const ratio = busiestHourMaxCount > 0 ? count / busiestHourMaxCount : 0;
                  const barUnits = Number.isFinite(ratio) ? Math.max(20, Math.min(100, ratio * 100)) : 20;
                  return (
                    <div key={bucket.hour} className="flex items-center gap-3">
                      <div className="w-20 text-xs font-medium text-[#475569]">{bucket.label}</div>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#F1F5F9]">
                        <svg
                          className="block h-full w-full text-[#0F766E]"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          aria-hidden
                        >
                          <rect width={barUnits} height="100" fill="currentColor" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium text-[#475569]">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Two-column: Opportunities + Activity */}
          <div className="wave-zone-panel">
            <p className="workspace-section-label">Next moves</p>
            <p className="mt-1 text-sm text-[#475569]">Follow-up pressure and the latest audit trail—short lists, not another metric wall.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SurfaceCard
                title="Opportunities"
                description="Stalled requests and follow-up items that may need action."
                action={
                  <Link
                    href="/dashboard/opportunities"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#115E59] hover:text-[#115E59]"
                  >
                    View all
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              >
                {opportunities.length === 0 ? (
                  <EmptyState
                    icon={<AlertTriangle className="w-5 h-5 text-[#64748B]" />}
                    title="No follow-up items"
                    description="Stalled or at-risk booking requests will surface here when they need attention."
                  />
                ) : (
                  <div className="space-y-2">
                    {opportunities.slice(0, 5).map((opportunity) => {
                      let href = "/dashboard/opportunities";
                      if (opportunity.conversation_id) {
                        href = `/dashboard/inbox/${opportunity.conversation_id}`;
                      } else if (opportunity.lead_id) {
                        href = `/dashboard/leads/${opportunity.lead_id}`;
                      } else if (opportunity.customer_key) {
                        href = `/dashboard/customers/${opportunity.customer_key}`;
                      }
                      return (
                        <Link
                          key={opportunity.id}
                          href={href}
                          className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] px-3 py-2.5 transition-all hover:border-[#E2E8F0] hover:bg-[#F8FAFC]"
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${opportunity.priority === "high"
                              ? "bg-rose-50 text-rose-600"
                              : "bg-amber-50 text-amber-600"
                              }`}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#0F172A]">{opportunity.title}</p>
                            <p className="mt-0.5 truncate text-xs text-[#475569]">
                              {opportunity.customer_name} · {opportunity.detail}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs text-[#64748B]">
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
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#115E59] hover:text-[#115E59]"
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
                          className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] px-3.5 py-3"
                        >
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
                            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            {isLead ? (
                              <Link
                                href={`/dashboard/leads/${event.resource_id}`}
                                className="block truncate text-sm font-medium text-[#0F172A] hover:text-[#115E59]"
                              >
                                {event.title}
                              </Link>
                            ) : (
                              <p className="truncate text-sm font-medium text-[#0F172A]">{event.title}</p>
                            )}
                            <p className="mt-0.5 truncate text-xs text-[#475569]">{event.detail}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${config.bg} ${config.color}`}>
                              {config.label}
                            </span>
                            <span className="text-xs text-[#64748B]">{timeAgo(event.timestamp)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SurfaceCard>
            </div>
          </div>

          {/* All caught up */}
          {safeCount(analytics.conversations_total) > 0 &&
            safeCount(analytics.follow_up_needed_count) === 0 &&
            safeCount(analytics.unresolved_count) === 0 && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                All caught up — no unresolved requests need attention.
              </div>
            )}
        </div>

        {/* ── Right rail ── */}
        <div className="order-2 space-y-3 xl:order-none">
          <RightRailCard title="Workspace state">
            <div className="space-y-2">
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                <p className="text-xs text-[#475569]">System</p>
                <p className="mt-0.5 text-sm font-semibold text-[#0F172A]">{systemStatus ?? "Not ready"}</p>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                <p className="text-xs text-[#475569]">Current plan</p>
                <p className="mt-0.5 text-sm font-semibold text-[#0F172A]">
                  {billing?.plan
                    ? billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)
                    : "Unavailable"}
                </p>
              </div>
            </div>
          </RightRailCard>

          <RightRailCard title="Quick routes">
            <div className="space-y-1.5">
              {[
                { href: "/dashboard/inbox", label: "Inbox", detail: "Review active conversations." },
                { href: "/dashboard/appointments", label: "Appointments", detail: "Bookings, reminders, and deposits." },
                { href: "/dashboard/opportunities", label: "Opportunities", detail: "Stalled requests and follow-up pressure." },
                { href: "/dashboard/training", label: "AI Training", detail: "Knowledge coverage and preview quality." },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg border border-[#E2E8F0] px-3 py-2.5 transition-all hover:border-[#CBD5E1] hover:bg-[#F8FAFC]"
                >
                  <p className="text-sm font-medium text-[#0F172A]">{item.label}</p>
                  <p className="mt-0.5 text-xs text-[#475569]">{item.detail}</p>
                </Link>
              ))}
            </div>
          </RightRailCard>

          <RightRailCard title="Daily focus">
            <div className="space-y-2">
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                <p className="text-sm font-medium text-[#0F172A]">Human review</p>
                <p className="mt-0.5 text-xs text-[#475569]">
                  {safeCount(analytics.human_review_required_count)} conversations waiting for a staff decision.
                </p>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                <p className="text-sm font-medium text-[#0F172A]">Attention required</p>
                <p className="mt-0.5 text-xs text-[#475569]">
                  {attentionAppointments.length} bookings blocked by prep, reschedule, or deposit needs.
                </p>
              </div>
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
                <p className="text-sm font-medium text-[#0F172A]">Opportunity pressure</p>
                <p className="mt-0.5 text-xs text-[#475569]">
                  {safeCount(analytics.follow_up_needed_count)} follow-ups and {safeCount(analytics.unresolved_count)}{" "}
                  unresolved requests.
                </p>
              </div>
            </div>
          </RightRailCard>
        </div>
      </div>
    </div>
  );
}
