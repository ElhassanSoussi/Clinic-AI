"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, CreditCard } from "lucide-react";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { appointmentStatusLabel, depositStatusLabel } from "@/lib/format-helpers";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { SegmentedControl } from "@/components/ui";
import type { AppointmentRecord } from "@/types";

type AppointmentView = "all" | "upcoming" | "attention" | "past";

const VIEW_OPTIONS: readonly { value: AppointmentView; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "attention", label: "Attention" },
  { value: "past", label: "Past" },
];

function StatusPill({ label, variant = "default" }: { readonly label: string; readonly variant?: "default" | "warn" | "ok" }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]";
  if (variant === "warn") return <span className={`${base} bg-amber-50 text-amber-700`}>{label}</span>;
  if (variant === "ok") return <span className={`${base} bg-emerald-50 text-emerald-700`}>{label}</span>;
  return <span className={`${base} bg-accent text-primary`}>{label}</span>;
}

function appointmentVariant(status: string): "default" | "warn" | "ok" {
  if (status === "confirmed") return "ok";
  if (status === "pending" || status === "no_show" || status === "cancelled") return "warn";
  return "default";
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<AppointmentView>("all");

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.frontdesk.listAppointments(view);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const counts = useMemo(
    () => ({
      all: appointments.length,
      upcoming: appointments.filter((item) => item.appointment_status === "confirmed").length,
      attention: appointments.filter((item) => item.appointment_status !== "confirmed" && item.appointment_status !== "completed").length,
      past: appointments.filter((item) => item.appointment_status === "completed").length,
    }),
    [appointments]
  );

  const summaryStats = useMemo(() => [
    { label: "Total", value: appointments.length },
    { label: "Confirmed", value: counts.upcoming },
    { label: "Need attention", value: counts.attention },
    { label: "Completed", value: counts.past },
  ], [appointments.length, counts]);

  if (loading) return <LoadingState message="Loading appointments..." detail="Gathering booking operations" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadAppointments()} />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Appointments"
        title="Scheduling operations"
        description="Confirmed bookings, attention cases, deposit posture, and upcoming schedule in one composed surface."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryStats.map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-bold tracking-[-0.04em] text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <SegmentedControl
        options={VIEW_OPTIONS.map((option) => ({ ...option, count: counts[option.value] }))}
        value={view}
        onChange={setView}
      />

      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        {appointments.length > 0 ? (
          <div className="grid gap-2">
            {appointments.map((appointment) => (
              <article key={appointment.lead_id} className="row-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="text-sm font-bold tracking-tight text-foreground">
                        {appointment.patient_name || "Unknown patient"}
                      </p>
                      <StatusPill
                        label={appointmentStatusLabel(appointment.appointment_status)}
                        variant={appointmentVariant(appointment.appointment_status)}
                      />
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-6">
                      {appointment.reason_for_visit || "No reason captured."}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CreditCard className="h-3 w-3" />
                        Deposit: {depositStatusLabel(appointment.deposit_status)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {appointment.appointment_starts_at
                        ? formatDateTime(appointment.appointment_starts_at)
                        : appointment.preferred_datetime_text || "Time pending"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="No appointments in this view"
            description="Appointments and booking status will appear here as requests move forward."
          />
        )}
      </section>
    </div>
  );
}
