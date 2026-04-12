import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Calendar, ChevronDown, Clock, Filter, Mail, Phone } from "lucide-react";
import { format, isThisWeek, isToday, isTomorrow, parseISO, startOfDay } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchAppointments, updateAppointment } from "@/lib/api/services";
import type { AppointmentRecord } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { notifyError, notifySuccess } from "@/lib/feedback";
import { appointmentStatusLabel, humanizeSnake } from "@/lib/display-text";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import { cn } from "@/app/components/ui/utils";
import { appPagePaddingClass, appPageSubtitleClass, appPageTitleCompactClass, appSectionTitleClass } from "@/lib/page-layout";

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

function sortAppointmentsInGroup(items: AppointmentRecord[]): AppointmentRecord[] {
  return [...items].sort((a, b) => {
    if (!a.appointment_starts_at && !b.appointment_starts_at) {
      return 0;
    }
    if (!a.appointment_starts_at) {
      return -1;
    }
    if (!b.appointment_starts_at) {
      return 1;
    }
    try {
      return parseISO(a.appointment_starts_at).getTime() - parseISO(b.appointment_starts_at).getTime();
    } catch {
      return 0;
    }
  });
}

function rowStateAccent(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "request_open" || !s) {
    return "border-l-4 border-l-amber-400";
  }
  if (s === "confirmed") {
    return "border-l-4 border-l-emerald-500";
  }
  if (s.includes("cancel") || s === "no_show") {
    return "border-l-4 border-l-red-400";
  }
  if (s.includes("reschedule")) {
    return "border-l-4 border-l-violet-400";
  }
  if (s === "completed") {
    return "border-l-4 border-l-slate-300";
  }
  return "border-l-4 border-l-transparent";
}

export function AppointmentsPage() {
  const { session } = useAuth();
  const [rows, setRows] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | (typeof STATUS_OPTIONS)[number]>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const filteredRows = useMemo(() => {
    if (statusFilter === "all") {
      return rows;
    }
    return rows.filter((r) => (r.appointment_status || "").toLowerCase() === statusFilter.toLowerCase());
  }, [rows, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, AppointmentRecord[]>();
    for (const r of filteredRows) {
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
    return keys.map((k) => ({ key: k, label: k, items: sortAppointmentsInGroup(map.get(k)!) }));
  }, [filteredRows]);

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
        <div className={appPagePaddingClass}>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div>
              <h1 className={cn(appPageTitleCompactClass, "mb-2")}>Appointments</h1>
              <p className={appPageSubtitleClass}>
                Day-by-day schedule with times, status, and patient context from your live data.
              </p>
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            </div>
            <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="w-full sm:w-auto">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "w-full sm:w-auto px-4 py-2 border border-border rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold bg-white",
                    statusFilter !== "all" ? "border-primary/40 bg-primary/5" : "hover:bg-muted",
                  )}
                >
                  <Filter className="w-4 h-4" />
                  Status filter
                  <ChevronDown className={cn("w-4 h-4 transition-transform", filtersOpen && "rotate-180")} />
                  {statusFilter !== "all" && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-primary">On</span>
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 rounded-xl border border-border bg-white p-4 space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Summary tiles above always reflect your full schedule. Only the day groups below are filtered.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors",
                      statusFilter === "all"
                        ? "bg-primary text-white border-primary"
                        : "bg-white border-border hover:bg-muted",
                    )}
                  >
                    All statuses
                  </button>
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors",
                        statusFilter === s
                          ? "bg-primary text-white border-primary"
                          : "bg-white border-border hover:bg-muted",
                      )}
                    >
                      {appointmentStatusLabel(s)}
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
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

      <div className={cn(appPagePaddingClass, "space-y-6")}>
        {loading && <p className="text-sm text-muted-foreground">Loading appointments…</p>}
        {!loading && rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-slate-50/60 px-6 py-10 text-center max-w-lg">
            <p className="text-sm font-medium text-foreground">No appointments yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              When patients book through your flows, visits will appear here. Start from{" "}
              <Link to="/app/leads" className="text-primary font-semibold hover:underline">
                Leads
              </Link>{" "}
              or{" "}
              <Link to="/app/inbox" className="text-primary font-semibold hover:underline">
                Inbox
              </Link>{" "}
              for new requests.
            </p>
          </div>
        )}
        {!loading && rows.length > 0 && filteredRows.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-slate-50/60 px-6 py-8 text-center max-w-lg">
            <p className="text-sm font-medium text-foreground">No appointments for this status</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clear the status filter to see the full schedule, or pick another status.
            </p>
          </div>
        )}
        {!loading &&
          grouped.map((group) => (
            <div key={group.key} className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-slate-50/60 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className={cn(appSectionTitleClass, "text-base sm:text-lg")}>{dayHeading(group.key)}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {group.items.length} appointment{group.items.length === 1 ? "" : "s"} · sorted by time
                  </p>
                </div>
              </div>
              <div className="divide-y divide-border">
                {group.items.map((apt) => (
                  <div
                    key={apt.lead_id}
                    className={cn("p-4 sm:p-5 hover:bg-slate-50/60 transition-colors bg-white", rowStateAccent(apt.appointment_status))}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-stretch gap-4">
                      <div className="flex sm:flex-col sm:justify-between sm:w-24 shrink-0 gap-2 sm:gap-1">
                        <div>
                          <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                            {displayTime(apt.appointment_starts_at, apt.preferred_datetime_text || "TBD")}
                          </p>
                          {!apt.appointment_starts_at ? (
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 mt-1">Unscheduled</p>
                          ) : null}
                        </div>
                        <span className="inline-flex sm:self-start px-2 py-0.5 rounded-md text-xs font-semibold bg-white border border-border text-foreground">
                          {appointmentStatusLabel(apt.appointment_status)}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-5">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0 border border-border">
                              <span className="font-bold text-primary">{(apt.patient_name || "?").charAt(0)}</span>
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-foreground mb-1">{apt.patient_name || "Patient"}</h3>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate max-w-[200px]">{apt.patient_email || "—"}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3.5 h-3.5 shrink-0" />
                                  {apt.patient_phone || "—"}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-foreground mt-2">{apt.reason_for_visit || "Reason not set"}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {apt.appointment_starts_at
                                  ? formatDateTime(apt.appointment_starts_at)
                                  : apt.preferred_datetime_text || "Patient preference not tied to a slot yet"}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 lg:items-end lg:min-w-[220px]">
                            <div className="w-full lg:w-auto">
                              <label className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                                Update status
                              </label>
                              <select
                                className="w-full lg:w-auto min-w-[200px] border border-border rounded-lg px-3 py-2 text-sm bg-white font-medium text-foreground"
                                value={apt.appointment_status}
                                disabled={busyId === apt.lead_id}
                                onChange={(e) => void onStatusChange(apt.lead_id, e.target.value)}
                              >
                                {STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {appointmentStatusLabel(s)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs text-muted-foreground w-full lg:max-w-xs">
                              <p>
                                <span className="font-semibold text-foreground">Reminder:</span>{" "}
                                {humanizeSnake(apt.reminder_status || "—")}
                              </p>
                              <p className="mt-1">
                                <span className="font-semibold text-foreground">Deposit:</span>{" "}
                                {humanizeSnake(apt.deposit_status || "—")}
                                {apt.deposit_required ? " · required for this visit" : ""}
                              </p>
                            </div>
                          </div>
                        </div>
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
