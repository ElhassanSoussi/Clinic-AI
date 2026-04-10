"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  Clock3,
  MessageSquareMore,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { safeCount, timeAgo } from "@/lib/utils";
import { normalizeLeadUsage } from "@/lib/billing-usage";
import { formatMoney } from "@/lib/format-helpers";
import { ActivationSetupBand } from "@/components/shared/ActivationSetupBand";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { SurfaceCard } from "@/components/shared/SurfaceCard";
import { RightRailCard } from "@/components/ui";
import type {
  ActivityEvent,
  AppointmentRecord,
  BillingStatus,
  Clinic,
  FrontdeskAnalytics,
  Opportunity,
} from "@/types";

export default function DashboardPage() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [analytics, setAnalytics] = useState<FrontdeskAnalytics | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentRecord[]>([]);
  const [attentionAppointments, setAttentionAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        optional(api.frontdesk.getAnalytics(), null),
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
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const leadUsage = useMemo(
    () => (billing ? normalizeLeadUsage(billing) : null),
    [billing]
  );

  if (loading) return <LoadingState message="Loading dashboard..." detail="Gathering clinic and workspace summaries" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadDashboard()} />;
  if (!clinic) return <LoadingState message="Loading dashboard..." />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Command center"
        title="Front-desk command center"
        description="A calmer operational overview of conversations, requests, appointments, billing pressure, and launch state."
        actions={
          clinic.slug ? (
            <Link href={`/chat/${clinic.slug}`} className="app-btn app-btn-secondary">
              Test assistant
            </Link>
          ) : undefined
        }
      />

      <ActivationSetupBand clinic={clinic} conversationsTotal={analytics?.conversations_total ?? 0} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Conversations" value={safeCount(analytics?.conversations_total)} icon={MessageSquareMore} tone="teal" detail="Patient-facing chat volume" />
        <MetricCard label="Booking requests" value={safeCount(analytics?.leads_created)} icon={Users} tone="blue" detail="Requests captured from the assistant" />
        <MetricCard label="Appointments needing care" value={attentionAppointments.length} icon={TriangleAlert} tone="amber" detail="Follow-up, reminder, or deposit attention" />
        <MetricCard label="Upcoming appointments" value={upcomingAppointments.length} icon={CalendarDays} tone="emerald" detail="Confirmed work already on the books" />
      </div>

      <div className="workspace-grid workspace-grid--two">
        <div className="workspace-grid">
          <SurfaceCard
            title="Operational pressure"
            description="Where the front desk feels load right now."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: "Review queue", value: safeCount(analytics?.human_review_required_count), detail: "Threads needing staff review or intervention." },
                { label: "Manual takeover", value: safeCount(analytics?.manual_takeover_threads), detail: "Conversations where staff took direct control." },
                { label: "Booked requests", value: safeCount(analytics?.booked_requests), detail: "Conversations converted into confirmed bookings." },
                { label: "Recovered value", value: formatMoney(analytics?.estimated_value_recovered_cents), detail: "Opportunity recovery tracked in follow-up flows." },
              ].map(({ label, value, detail }) => (
                <div key={label} className="metric-mini">
                  <p className="panel-section-head">{label}</p>
                  <p className="mt-2.5 text-[1.85rem] font-bold tracking-[-0.055em] text-app-text">{value}</p>
                  <p className="mt-1.5 text-xs leading-5 text-app-text-muted">{detail}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard title="Activity and opportunity flow" description="Recent signals that matter operationally.">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-app-border/60 bg-white/70 p-5">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-app-primary" />
                  <span className="text-sm font-bold text-app-text">Recent activity</span>
                </div>
                <div className="mt-4 grid gap-2">
                  {activity.length > 0 ? activity.map((item) => (
                    <div key={`${item.resource_id}-${item.timestamp}`} className="rounded-2xl border border-app-border/50 bg-white/90 px-4 py-3">
                      <p className="text-sm font-semibold text-app-text">{item.title}</p>
                      <p className="mt-1 text-xs text-app-text-muted">{item.detail}</p>
                      <p className="mt-1.5 panel-section-head text-[0.65rem]">{timeAgo(item.timestamp)}</p>
                    </div>
                  )) : (
                    <EmptyState title="No activity yet" description="New assistant activity will appear here as soon as patients start using the workspace." />
                  )}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-app-border/60 bg-white/70 p-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-app-primary" />
                  <span className="text-sm font-bold text-app-text">Opportunities</span>
                </div>
                <div className="mt-4 grid gap-2">
                  {opportunities.length > 0 ? opportunities.slice(0, 4).map((item) => (
                    <div key={item.id} className="rounded-2xl border border-app-border/50 bg-white/90 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-app-text">{item.title}</p>
                        <span className="rounded-full bg-app-accent-wash px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-app-primary-deep">
                          {item.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-app-text-muted">{item.detail}</p>
                    </div>
                  )) : (
                    <EmptyState title="No opportunities queued" description="When follow-up opportunities are detected, they’ll appear here." />
                  )}
                </div>
              </div>
            </div>
          </SurfaceCard>
        </div>

        <div className="workspace-grid">
          <RightRailCard title="Billing">
            <div className="metric-mini">
              <p className="panel-section-head">Current plan</p>
              <p className="mt-2 text-lg font-bold tracking-tight text-app-text">
                {billing?.plan_name || "Starter Trial"}
              </p>
              <p className="mt-1 text-sm text-app-text-muted">
                {leadUsage
                  ? `${leadUsage.leadsUsed}/${leadUsage.isUnlimited ? "unlimited" : leadUsage.leadLimit} requests used`
                  : "Usage details update from billing."}
              </p>
            </div>
            <Link href="/dashboard/billing" className="app-btn app-btn-secondary mt-4 w-full">
              Open billing
            </Link>
          </RightRailCard>

          <RightRailCard title="Today’s focus">
            <div className="grid gap-2.5">
              <div className="metric-mini">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-app-primary" />
                  <span className="text-sm font-bold text-app-text">Upcoming</span>
                </div>
                <p className="mt-2 text-sm text-app-text-muted">
                  {upcomingAppointments.length > 0
                    ? `${upcomingAppointments.length} confirmed appointment(s) on the books.`
                    : "No confirmed appointments right now."}
                </p>
              </div>
              <div className="metric-mini">
                <div className="flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-bold text-app-text">Attention queue</span>
                </div>
                <p className="mt-2 text-sm text-app-text-muted">
                  {attentionAppointments.length > 0
                    ? `${attentionAppointments.length} appointment(s) need follow-up or reminder action.`
                    : "Attention queue is clear."}
                </p>
              </div>
            </div>
          </RightRailCard>
        </div>
      </div>
    </div>
  );
}
