"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
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
      attention: appointments.filter((item) => item.appointment_status !== "confirmed").length,
      past: appointments.filter((item) => item.appointment_status === "completed").length,
    }),
    [appointments]
  );

  if (loading) return <LoadingState message="Loading appointments..." detail="Gathering booking operations" />;
  if (error) return <ErrorState variant="calm" message={error} onRetry={() => void loadAppointments()} />;

  return (
    <div className="workspace-grid">
      <PageHeader
        eyebrow="Appointments"
        title="Appointment operations"
        description="Confirmed bookings, attention cases, reminder posture, and deposit visibility in one composed surface."
      />

      <SegmentedControl
        options={VIEW_OPTIONS.map((option) => ({ ...option, count: counts[option.value] }))}
        value={view}
        onChange={setView}
      />

      <section className="panel-surface rounded-[2rem] p-5">
        <div className="grid gap-2">
          {appointments.length > 0 ? (
            appointments.map((appointment) => (
              <article key={appointment.lead_id} className="row-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold tracking-tight text-app-text">
                      {appointment.patient_name || "Unknown patient"}
                    </p>
                    <p className="mt-1 text-sm text-app-text-secondary">
                      {appointment.reason_for_visit || "No reason captured."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="panel-section-head text-[0.68rem]">{appointmentStatusLabel(appointment.appointment_status)}</span>
                      <span className="panel-section-head text-[0.68rem]">·</span>
                      <span className="panel-section-head text-[0.68rem]">{depositStatusLabel(appointment.deposit_status)}</span>
                    </div>
                  </div>
                  <p className="shrink-0 text-xs text-app-text-muted">
                    {appointment.appointment_starts_at
                      ? formatDateTime(appointment.appointment_starts_at)
                      : appointment.preferred_datetime_text || "Time pending"}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="No appointments in this view"
              description="Appointments and booking status will appear here as requests move forward."
            />
          )}
        </div>
      </section>
    </div>
  );
}
