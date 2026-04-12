import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Filter, Mail, Phone } from "lucide-react";
import { format, isThisWeek, isToday, isTomorrow, parseISO, startOfDay } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchAppointments, updateAppointment } from "@/lib/api/services";
import type { AppointmentRecord } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { notifyError, notifySuccess } from "@/lib/feedback";

const STATUS_OPTIONS = [
  "request_open",
  "confirmed",
  "cancel_requested",
  "reschedule_requested",
  "cancelled",
  "completed",
  "no_show",
] as const;

function dayKey(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  try {
    const d = parseISO(iso);
    return format(startOfDay(d), "yyyy-MM-dd");
  } catch {
    return null;
  }
}

function displayTime(iso: string | null | undefined, fallback: string): string {
  if (!iso) {
    return fallback || "—";
  }
  try {
    return format(parseISO(iso), "HH:mm");
  } catch {
    return fallback || "—";
  }
}

export function AppointmentsPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.accessToken) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppointments(session.accessToken, "all");
      setRows(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load appointments");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, AppointmentRecord[]>();
    for (const r of rows) {
      const k = dayKey(r.appointment_starts_at) || "unscheduled";
      if (!map.has(k)) {
        map.set(k, []);
      }
      map.get(k)!.push(r);
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (a === "unscheduled") {
        return 1;
      }
      if (b === "unscheduled") {
        return -1;
      }
      return a.localeCompare(b);
    });
    return keys.map((k) => ({ key: k, label: k, items: map.get(k)! }));
  }, [rows]);

  const todayCount = useMemo(
    () => rows.filter((r) => r.appointment_starts_at && isToday(parseISO(r.appointment_starts_at))).length,
    [rows],
  );
  const tomorrowCount = useMemo(
    () => rows.filter((r) => r.appointment_starts_at && isTomorrow(parseISO(r.appointment_starts_at))).length,
    [rows],
  );
  const weekCount = useMemo(
    () => rows.filter((r) => r.appointment_starts_at && isThisWeek(parseISO(r.appointment_starts_at), { weekStartsOn: 1 })).length,
    [rows],
  );

  const onStatusChange = async (leadId: string, appointment_status: string) => {
    if (!session?.accessToken) {
      return;
    }
    setBusyId(leadId);
    try {
      await updateAppointment(session.accessToken, leadId, { appointment_status });
      await load();
      notifySuccess("Appointment status updated");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Update failed";
      setError(msg);
      notifyError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const dayHeading = (key: string) => {
    if (key === "unscheduled") {
      return "Unscheduled / pending time";
    }
    try {
      const d = parseISO(`${key}T12:00:00`);
      return format(d, "EEEE, MMMM d, yyyy");
    } catch {
      return key;
    }
  };

  return (
    <div className="h-full bg-background overflow-auto">
      <div className="border-b border-border bg-white">
        <div className="p-4 sm:p-6 md:p-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Appointments</h1>
              <p className="text-muted-foreground">Live schedule from front-desk appointments</p>
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2 font-semibold"
              >
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : todayCount}</p>
              <p className="text-sm text-muted-foreground">Today</p>
            </div>
            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : tomorrowCount}</p>
              <p className="text-sm text-muted-foreground">Tomorrow</p>
            </div>
            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : weekCount}</p>
              <p className="text-sm text-muted-foreground">This week</p>
            </div>
            <div className="bg-white rounded-lg p-5 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{loading ? "…" : rows.length}</p>
              <p className="text-sm text-muted-foreground">Total in view</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 md:p-8 space-y-6">
        {loading && <p className="text-sm text-muted-foreground">Loading appointments…</p>}
        {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No appointments returned for this clinic.</p>}
        {!loading &&
          grouped.map((group) => (
            <div key={group.key} className="bg-white rounded-lg border border-border">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-foreground">{dayHeading(group.key)}</h2>
                  <p className="text-sm text-muted-foreground">{group.items.length} slot{group.items.length === 1 ? "" : "s"}</p>
                </div>
              </div>
              <div className="divide-y divide-border">
                {group.items.map((apt) => (
                  <div key={apt.lead_id} className="p-5 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-6 flex-wrap">
                      <div className="w-20 text-right">
                        <p className="text-lg font-bold text-foreground">
                          {displayTime(apt.appointment_starts_at, apt.preferred_datetime_text)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{apt.appointment_status.replace(/_/g, " ")}</p>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                              <span className="font-bold text-primary">{(apt.patient_name || "?").charAt(0)}</span>
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-foreground mb-1">{apt.patient_name || "Patient"}</h3>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {apt.patient_email || "—"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {apt.patient_phone || "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            <label className="text-xs text-muted-foreground">
                              Appointment status
                              <select
                                className="ml-2 border border-border rounded-md px-2 py-1 text-sm bg-white"
                                value={apt.appointment_status}
                                disabled={busyId === apt.lead_id}
                                onChange={(e) => void onStatusChange(apt.lead_id, e.target.value)}
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {s.replace(/_/g, " ")}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <p className="text-xs text-muted-foreground">
                              Reminder: <span className="font-medium text-foreground">{apt.reminder_status}</span> · Deposit:{" "}
                              <span className="font-medium text-foreground">{apt.deposit_status}</span>
                              {apt.deposit_required ? " (required)" : ""}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-foreground font-medium">{apt.reason_for_visit || "Reason not set"}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {apt.appointment_starts_at ? formatDateTime(apt.appointment_starts_at) : apt.preferred_datetime_text || ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
