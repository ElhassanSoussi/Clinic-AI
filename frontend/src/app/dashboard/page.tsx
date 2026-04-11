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

  const leadUsageText = useMemo(() => {
    if (!leadUsage) return "Usage details update from billing.";
    const limit = leadUsage.isUnlimited ? "unlimited" : leadUsage.leadLimit;
    return `${leadUsage.leadsUsed}/${limit} requests used`;
  }, [leadUsage]);

  if (loading) return <LoadingState message="Loading dashboard..." detail="Gathering clinic and workspace summaries" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadDashboard()} />;
  if (!clinic) return <LoadingState message="Loading dashboard..." />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Dashboard"
        title="Front desk command center"
        description="A clear operating overview of conversations, appointments, lead flow, billing posture, and launch readiness."
        actions={
          clinic.slug ? (
            <Link href={`/chat/${clinic.slug}`} className="app-btn app-btn-secondary">
              Preview assistant
            </Link>
          ) : undefined
        }
      />

      <ActivationSetupBand clinic={clinic} conversationsTotal={analytics?.conversations_total ?? 0} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Conversations" value={safeCount(analytics?.conversations_total)} icon={MessageSquareMore} tone="teal" detail="New patient conversations" />
        <MetricCard label="Booked today" value={safeCount(analytics?.booked_requests)} icon={CalendarDays} tone="blue" detail="Requests converted into bookings" />
        <MetricCard label="Active leads" value={safeCount(analytics?.leads_created)} icon={Users} tone="amber" detail="Captured booking requests" />
        <MetricCard label="Attention queue" value={attentionAppointments.length} icon={TriangleAlert} tone="emerald" detail="Appointments needing follow-up" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="grid gap-4">
          <SurfaceCard
            title="Today at a glance"
            description="Booking pressure, review load, and appointment readiness grouped into one workbench."
            action={
              <div className="rounded-lg border border-border bg-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Current plan</p>
                <p className="mt-2 text-lg font-semibold text-foreground">{billing?.plan_name || "Starter Trial"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{leadUsageText}</p>
              </div>
            }
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Review queue", value: safeCount(analytics?.human_review_required_count), detail: "Threads needing staff review." },
                { label: "Manual takeover", value: safeCount(analytics?.manual_takeover_threads), detail: "Conversations handled directly by staff." },
                { label: "Upcoming", value: upcomingAppointments.length, detail: "Confirmed appointments on the books." },
                { label: "Recovered value", value: formatMoney(analytics?.estimated_value_recovered_cents), detail: "Opportunity recovery tracked by follow-up." },
              ].map(({ label, value, detail }) => (
                <div key={label} className="metric-mini">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                  <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-foreground">{value}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SurfaceCard title="Recent activity" action={<Activity className="h-5 w-5 text-primary" />}>
              <div className="mt-4 grid gap-2">
                {activity.length > 0 ? activity.map((item) => (
                  <div key={`${item.resource_id}-${item.timestamp}`} className="row-card">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-xs font-normal text-muted-foreground">{timeAgo(item.timestamp)}</p>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                )) : (
                  <EmptyState title="No activity yet" description="New assistant activity will appear here as soon as patients start using the workspace." />
                )}
              </div>
            </SurfaceCard>

            <SurfaceCard title="Opportunities" action={<Sparkles className="h-5 w-5 text-primary" />}>
              <div className="mt-4 grid gap-2">
                {opportunities.length > 0 ? opportunities.slice(0, 4).map((item) => (
                  <div key={item.id} className="row-card">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                        {item.priority}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">{item.detail}</p>
                  </div>
                )) : (
                  <EmptyState title="No opportunities queued" description="When follow-up opportunities are detected, they will appear here." />
                )}
              </div>
            </SurfaceCard>
          </div>
        </div>

        <div className="grid gap-4">
          <SurfaceCard title="Upcoming appointments" action={<Clock3 className="h-5 w-5 text-primary" />}>
            <div className="mt-4 grid gap-2">
              {upcomingAppointments.length > 0 ? upcomingAppointments.slice(0, 5).map((appointment) => (
                <div key={`${appointment.lead_id}-${appointment.appointment_starts_at || appointment.preferred_datetime_text}`} className="row-card">
                  <p className="text-sm font-semibold text-foreground">{appointment.patient_name || "Unknown patient"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {appointment.reason_for_visit || "No reason captured."}
                  </p>
                </div>
              )) : (
                <EmptyState title="No upcoming appointments" description="Confirmed appointments will appear here as requests move forward." />
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard
            title="Billing posture"
            description="Keep usage, subscription state, and upgrade paths visible to the team."
          >
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-foreground">
              {billing?.subscription_status || "trialing"}
            </h2>
            <Link href="/dashboard/billing" className="app-btn app-btn-secondary mt-5 w-full">
              Open billing
            </Link>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
