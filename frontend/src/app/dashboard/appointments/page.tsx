"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Clock3,
  Copy,
  ExternalLink,
  MessageSquare,
  Phone,
  RotateCcw,
  UserRound,
  Wallet,
  XCircle,
} from "lucide-react";

import { api } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChannelBadge } from "@/components/shared/FrontdeskBadges";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import type { AppointmentRecord } from "@/types";

const APPOINTMENT_VIEWS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "attention", label: "Needs Attention" },
  { value: "past", label: "Completed / Past" },
  { value: "cancelled", label: "Cancelled / No-show" },
] as const;

type AppointmentView = (typeof APPOINTMENT_VIEWS)[number]["value"];

type AppointmentDraft = {
  date: string;
  time: string;
  reason: string;
  note: string;
  depositAmountCents: string;
};

function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toTimeInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function combineDateTime(dateValue: string, timeValue: string): string | null {
  if (!dateValue || !timeValue) return null;
  const combined = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(combined.getTime())) return null;
  return combined.toISOString();
}

function formatPreferredText(dateValue: string, timeValue: string): string {
  const combined = combineDateTime(dateValue, timeValue);
  if (!combined) return "";
  return new Date(combined).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function appointmentStatusLabel(status: AppointmentRecord["appointment_status"]): string {
  if (status === "cancel_requested") return "Cancel requested";
  if (status === "reschedule_requested") return "Reschedule requested";
  if (status === "cancelled") return "Cancelled";
  if (status === "completed") return "Completed";
  if (status === "no_show") return "No-show";
  if (status === "confirmed") return "Confirmed";
  return "Open request";
}

function humanizeStatus(value: string): string {
  return value.replaceAll("_", " ");
}

function appointmentStatusClass(status: AppointmentRecord["appointment_status"]): string {
  if (status === "confirmed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "cancel_requested" || status === "reschedule_requested") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (status === "cancelled" || status === "no_show") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (status === "completed") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function depositStatusLabel(status: AppointmentRecord["deposit_status"]): string {
  if (status === "required") return "Deposit required";
  if (status === "requested") return "Deposit requested";
  if (status === "paid") return "Deposit paid";
  if (status === "failed") return "Deposit failed";
  if (status === "expired") return "Deposit expired";
  if (status === "waived") return "Deposit waived";
  return "No deposit";
}

function depositStatusClass(status: AppointmentRecord["deposit_status"]): string {
  if (status === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "requested" || status === "required") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (status === "failed" || status === "expired") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (status === "waived") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function formatMoney(cents?: number | null): string {
  if (!cents) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function draftFromAppointment(appointment: AppointmentRecord): AppointmentDraft {
  return {
    date: toDateInputValue(appointment.appointment_starts_at),
    time: toTimeInputValue(appointment.appointment_starts_at),
    reason: appointment.reason_for_visit,
    note: "",
    depositAmountCents: appointment.deposit_amount_cents ? String(appointment.deposit_amount_cents) : "",
  };
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState<AppointmentView>("upcoming");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [savingLeadId, setSavingLeadId] = useState("");
  const [depositActionLeadId, setDepositActionLeadId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, AppointmentDraft>>({});
  const [depositLink, setDepositLink] = useState("");
  const [depositMessage, setDepositMessage] = useState("");

  const loadAppointments = useCallback(async (view: AppointmentView) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.frontdesk.listAppointments(view);
      setAppointments(data);
      setDrafts((current) => {
        const next = { ...current };
        for (const item of data) {
          next[item.lead_id] = draftFromAppointment(item);
        }
        return next;
      });
      setSelectedLeadId((current) => {
        if (data.length === 0) return "";
        if (current && data.some((item) => item.lead_id === current)) return current;
        return data[0].lead_id;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments(activeView);
  }, [activeView, loadAppointments]);

  const selectedAppointment = useMemo(
    () => appointments.find((item) => item.lead_id === selectedLeadId) ?? null,
    [appointments, selectedLeadId]
  );

  const selectedDraft = selectedAppointment
    ? drafts[selectedAppointment.lead_id] ?? draftFromAppointment(selectedAppointment)
    : null;

  useEffect(() => {
    setDepositLink("");
    setDepositMessage("");
  }, [selectedAppointment?.lead_id]);

  const updateDraft = (leadId: string, patch: Partial<AppointmentDraft>) => {
    setDrafts((current) => ({
      ...current,
      [leadId]: {
        ...(current[leadId] ?? {
          date: "",
          time: "",
          reason: "",
          note: "",
          depositAmountCents: "",
        }),
        ...patch,
      },
    }));
  };

  const runAppointmentUpdate = async (
    leadId: string,
    payload: {
      status?: "new" | "contacted" | "booked" | "closed";
      appointment_status?: AppointmentRecord["appointment_status"];
      appointment_starts_at?: string | null;
      appointment_ends_at?: string | null;
      reason_for_visit?: string;
      preferred_datetime_text?: string;
      note?: string;
    }
  ) => {
    setSavingLeadId(leadId);
    try {
      await api.frontdesk.updateAppointment(leadId, payload);
      await loadAppointments(activeView);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update appointment");
    } finally {
      setSavingLeadId("");
    }
  };

  const saveDetails = async () => {
    if (!selectedAppointment || !selectedDraft) return;
    const appointmentStartsAt = combineDateTime(selectedDraft.date, selectedDraft.time);
    await runAppointmentUpdate(selectedAppointment.lead_id, {
      reason_for_visit: selectedDraft.reason || undefined,
      appointment_starts_at:
        selectedDraft.date || selectedDraft.time
          ? appointmentStartsAt
          : undefined,
      preferred_datetime_text:
        selectedDraft.date && selectedDraft.time
          ? formatPreferredText(selectedDraft.date, selectedDraft.time)
          : undefined,
      note: selectedDraft.note || undefined,
    });
    updateDraft(selectedAppointment.lead_id, { note: "" });
  };

  const rescheduleAppointment = async () => {
    if (!selectedAppointment || !selectedDraft) return;
    const appointmentStartsAt = combineDateTime(selectedDraft.date, selectedDraft.time);
    if (!appointmentStartsAt) {
      setError("Add an appointment date and time before confirming the booking.");
      return;
    }
    await runAppointmentUpdate(selectedAppointment.lead_id, {
      status: "booked",
      appointment_status: "confirmed",
      appointment_starts_at: appointmentStartsAt,
      reason_for_visit: selectedDraft.reason || undefined,
      preferred_datetime_text: formatPreferredText(selectedDraft.date, selectedDraft.time),
      note: selectedDraft.note || undefined,
    });
    updateDraft(selectedAppointment.lead_id, { note: "" });
  };

  const cancelAppointment = async () => {
    if (!selectedAppointment || !selectedDraft) return;
    await runAppointmentUpdate(selectedAppointment.lead_id, {
      status: "closed",
      appointment_status: "cancelled",
      note: selectedDraft.note || undefined,
    });
    updateDraft(selectedAppointment.lead_id, { note: "" });
  };

  const markNoShow = async () => {
    if (!selectedAppointment || !selectedDraft) return;
    await runAppointmentUpdate(selectedAppointment.lead_id, {
      status: "closed",
      appointment_status: "no_show",
      note: selectedDraft.note || undefined,
    });
    updateDraft(selectedAppointment.lead_id, { note: "" });
  };

  const reopenAppointment = async () => {
    if (!selectedAppointment || !selectedDraft) return;
    await runAppointmentUpdate(selectedAppointment.lead_id, {
      status: "contacted",
      appointment_status: "request_open",
      appointment_starts_at: null,
      appointment_ends_at: null,
      preferred_datetime_text: "",
      note: selectedDraft.note || undefined,
    });
    updateDraft(selectedAppointment.lead_id, {
      date: "",
      time: "",
      note: "",
    });
  };

  const requestDeposit = async (sendSms: boolean) => {
    if (!selectedAppointment || !selectedDraft) return;
    const amountCents = Number(selectedDraft.depositAmountCents);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Add a deposit amount in cents before requesting payment.");
      return;
    }
    setDepositActionLeadId(selectedAppointment.lead_id);
    setDepositMessage("");
    try {
      const result = await api.frontdesk.requestAppointmentDeposit(selectedAppointment.lead_id, {
        amount_cents: amountCents,
        send_sms: sendSms,
      });
      setDepositLink(result.checkout_url);
      if (result.sms_delivery_status === "sent" || result.sms_delivery_status === "delivered") {
        setDepositMessage("Deposit request sent to the patient by SMS.");
      } else if (result.sms_delivery_status === "manual_only") {
        setDepositMessage("Deposit link created for manual sharing.");
      } else if (result.sms_delivery_status) {
        setDepositMessage(
          result.blocked_reason
            ? `Deposit link created, but SMS was ${result.sms_delivery_status}: ${result.blocked_reason}`
            : `Deposit link created with SMS status: ${result.sms_delivery_status}.`
        );
      } else {
        setDepositMessage("Deposit link created.");
      }
      await loadAppointments(activeView);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request deposit");
    } finally {
      setDepositActionLeadId("");
    }
  };

  const clearDepositRequirement = async () => {
    if (!selectedAppointment) return;
    setDepositActionLeadId(selectedAppointment.lead_id);
    try {
      await api.frontdesk.markAppointmentDepositNotRequired(selectedAppointment.lead_id);
      setDepositLink("");
      setDepositMessage("Deposit requirement removed for this appointment.");
      updateDraft(selectedAppointment.lead_id, { depositAmountCents: "" });
      await loadAppointments(activeView);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update deposit state");
    } finally {
      setDepositActionLeadId("");
    }
  };

  const copyDepositLink = async () => {
    if (!depositLink) return;
    try {
      await navigator.clipboard.writeText(depositLink);
      setDepositMessage("Deposit link copied.");
    } catch {
      setDepositMessage("Copy the deposit link manually from the field below.");
    }
  };

  if (loading) return <LoadingState message="Loading appointments..." />;
  if (error) return <ErrorState message={error} onRetry={() => loadAppointments(activeView)} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <CalendarClock className="h-3.5 w-3.5" />
            Appointments workspace
          </>
        }
        title="Manage booked requests with front-desk clarity."
        description="Review appointment timing, reminder readiness, lifecycle status, and deposit handling without leaving the operator workspace."
      />

      <div className="app-segmented">
        {APPOINTMENT_VIEWS.map((view) => (
          <button
            key={view.value}
            onClick={() => setActiveView(view.value)}
            className="app-segmented-item"
            data-active={activeView === view.value}
          >
            {view.label}
          </button>
        ))}
      </div>

      {appointments.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="w-7 h-7 text-slate-400" />}
          title="No appointments here yet"
          description="Booked requests will appear here as soon as the front desk confirms an appointment."
        />
      ) : (
        <div className="workspace-split">
          <div className="space-y-3">
            <div className="app-card p-5">
              <p className="text-sm font-semibold text-slate-900">Appointments board</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Review timing, reminder readiness, deposit state, and the linked patient context from one operational list.
              </p>
            </div>
            <div className="app-card overflow-hidden">
              <div className="divide-y divide-slate-100/80 p-3">
              {appointments.map((appointment) => (
                <button
                  key={appointment.lead_id}
                  onClick={() => setSelectedLeadId(appointment.lead_id)}
                  className="app-list-row w-full px-5 py-4 text-left"
                  data-active={selectedLeadId === appointment.lead_id}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {appointment.patient_name}
                        </p>
                        <ChannelBadge channel={appointment.source} withIcon />
                        <LeadStatusBadge status={appointment.lead_status} />
                      </div>
                      <p className="text-sm text-slate-600 truncate">
                        {appointment.reason_for_visit || "No visit reason recorded"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${appointmentStatusClass(appointment.appointment_status)}`}>
                          {appointmentStatusLabel(appointment.appointment_status)}
                        </span>
                        {appointment.reminder_status !== "not_ready" && (
                          <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                            Reminder {humanizeStatus(appointment.reminder_status)}
                          </span>
                        )}
                        {appointment.follow_up_open && (
                          <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                            Follow-up open
                          </span>
                        )}
                        {appointment.deposit_status !== "not_required" && (
                          <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${depositStatusClass(appointment.deposit_status)}`}>
                            {depositStatusLabel(appointment.deposit_status)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <p className="text-sm font-medium text-slate-900">
                        {appointment.appointment_starts_at
                          ? formatDateTime(appointment.appointment_starts_at)
                          : appointment.preferred_datetime_text || "Time not set"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Updated {timeAgo(appointment.updated_at || appointment.appointment_starts_at || "")}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              </div>
            </div>
          </div>

          {selectedAppointment && selectedDraft && (
            <div className="workspace-side-rail">
              <div className="app-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="text-xl font-bold text-slate-900">
                        {selectedAppointment.patient_name}
                      </h2>
                      <ChannelBadge channel={selectedAppointment.source} withIcon />
                      <LeadStatusBadge status={selectedAppointment.lead_status} />
                    </div>
                    <p className="text-sm text-slate-500">
                      {selectedAppointment.appointment_starts_at
                        ? formatDateTime(selectedAppointment.appointment_starts_at)
                        : selectedAppointment.preferred_datetime_text || "Scheduling details still need to be confirmed."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAppointment.thread_id && (
                      <Link
                        href={`/dashboard/inbox/${selectedAppointment.thread_id}`}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Open thread
                      </Link>
                    )}
                    {selectedAppointment.customer_key ? (
                      <Link
                        href={`/dashboard/customers/${selectedAppointment.customer_key}`}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <UserRound className="w-4 h-4" />
                        Open customer
                      </Link>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-400 border border-slate-200 rounded-lg">
                        <UserRound className="w-4 h-4" />
                        Customer profile unavailable
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Phone</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedAppointment.patient_phone || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <UserRound className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="text-sm font-medium text-slate-900">
                        {selectedAppointment.patient_email || "Not provided"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Clock3 className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Reminder status</p>
                      <p className="text-sm font-medium text-slate-900">
                        {humanizeStatus(selectedAppointment.reminder_status)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Deposit status</p>
                      <p className="text-sm font-medium text-slate-900">
                        {depositStatusLabel(selectedAppointment.deposit_status)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${appointmentStatusClass(selectedAppointment.appointment_status)}`}>
                      {appointmentStatusLabel(selectedAppointment.appointment_status)}
                    </span>
                    {selectedAppointment.reminder_ready ? (
                      <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                        Reminder ready
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                        Reminder not ready
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600">
                    {selectedAppointment.reminder_ready
                      ? selectedAppointment.reminder_scheduled_for
                        ? `Reminder is scheduled for ${formatDateTime(selectedAppointment.reminder_scheduled_for)}.`
                        : "Reminder prep is complete for this appointment."
                      : selectedAppointment.reminder_blocked_reason || "Reminder prep is not active for this appointment yet."}
                  </p>
                </div>
              </div>

              <div className="app-card p-6">
                <h3 className="text-sm font-semibold text-slate-900">Booking deposit</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Request a real Stripe deposit for this booked appointment and track whether the link reached the patient.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${depositStatusClass(selectedAppointment.deposit_status)}`}>
                    {depositStatusLabel(selectedAppointment.deposit_status)}
                  </span>
                  {selectedAppointment.deposit_amount_cents ? (
                    <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                      {formatMoney(selectedAppointment.deposit_amount_cents)}
                    </span>
                  ) : null}
                  {selectedAppointment.deposit_request_delivery_status ? (
                    <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                      SMS {humanizeStatus(selectedAppointment.deposit_request_delivery_status)}
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[12rem_1fr] gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Deposit amount
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={100}
                      value={selectedDraft.depositAmountCents}
                      onChange={(event) => updateDraft(selectedAppointment.lead_id, { depositAmountCents: event.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                    <p className="text-xs text-slate-400 mt-2">
                      Enter cents. Example: 5000 for {formatMoney(5000)}.
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Deposit state
                    </p>
                    <p className="text-sm text-slate-700 mt-2 leading-relaxed">
                      {selectedAppointment.deposit_status === "paid"
                        ? selectedAppointment.deposit_paid_at
                          ? `Stripe has confirmed payment. Paid ${formatDateTime(selectedAppointment.deposit_paid_at)}.`
                          : "Stripe has confirmed payment for this appointment deposit."
                        : selectedAppointment.deposit_request_delivery_reason
                          ? selectedAppointment.deposit_request_delivery_reason
                          : selectedAppointment.deposit_status === "requested"
                            ? "Deposit link created. Payment remains pending until Stripe confirms it."
                            : "No deposit request has been sent for this appointment yet."}
                    </p>
                    {selectedAppointment.deposit_requested_at && selectedAppointment.deposit_status !== "paid" && (
                      <p className="text-xs text-slate-500 mt-2">
                        Requested {formatDateTime(selectedAppointment.deposit_requested_at)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={() => requestDeposit(true)}
                    disabled={
                      depositActionLeadId === selectedAppointment.lead_id ||
                      selectedAppointment.appointment_status !== "confirmed" ||
                      selectedAppointment.deposit_status === "paid"
                    }
                    className="px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {depositActionLeadId === selectedAppointment.lead_id
                      ? "Working..."
                      : selectedAppointment.deposit_status === "requested" ||
                          selectedAppointment.deposit_status === "failed" ||
                          selectedAppointment.deposit_status === "expired"
                        ? "Resend deposit request"
                        : "Request deposit"}
                  </button>
                  <button
                    onClick={() => requestDeposit(false)}
                    disabled={
                      depositActionLeadId === selectedAppointment.lead_id ||
                      selectedAppointment.appointment_status !== "confirmed"
                    }
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Create shareable link
                  </button>
                  <button
                    onClick={clearDepositRequirement}
                    disabled={depositActionLeadId === selectedAppointment.lead_id || selectedAppointment.deposit_status === "not_required"}
                    className="px-4 py-2.5 text-sm font-medium text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    Mark deposit not required
                  </button>
                </div>

                {depositMessage && (
                  <p className="text-sm text-slate-600 mt-4">{depositMessage}</p>
                )}

                {(depositLink || selectedAppointment.deposit_status === "requested") && (
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                      Latest deposit link
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={depositLink}
                        readOnly
                        placeholder="Create or resend a deposit request to generate a fresh link."
                        className="flex-1 min-w-0 sm:min-w-[16rem] px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-600"
                      />
                      <button
                        onClick={copyDepositLink}
                        disabled={!depositLink}
                        className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="app-card p-6">
                <h3 className="text-sm font-semibold text-slate-900">Edit booking</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Update the scheduled time, visit reason, and internal note without leaving the appointments workspace.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <input
                    type="date"
                    value={selectedDraft.date}
                    onChange={(event) => updateDraft(selectedAppointment.lead_id, { date: event.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                  <input
                    type="time"
                    value={selectedDraft.time}
                    onChange={(event) => updateDraft(selectedAppointment.lead_id, { time: event.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <input
                  type="text"
                  value={selectedDraft.reason}
                  onChange={(event) => updateDraft(selectedAppointment.lead_id, { reason: event.target.value })}
                  placeholder="Reason for visit"
                  className="w-full mt-3 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />

                <textarea
                  rows={3}
                  value={selectedDraft.note}
                  onChange={(event) => updateDraft(selectedAppointment.lead_id, { note: event.target.value })}
                  placeholder="Internal booking note"
                  className="w-full mt-3 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                />

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={saveDetails}
                    disabled={savingLeadId === selectedAppointment.lead_id}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {savingLeadId === selectedAppointment.lead_id ? "Saving..." : "Save details"}
                  </button>
                  <button
                    onClick={rescheduleAppointment}
                    disabled={savingLeadId === selectedAppointment.lead_id}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {savingLeadId === selectedAppointment.lead_id ? "Saving..." : "Reschedule"}
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-slate-900">Appointment actions</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Update the lifecycle directly here without implying any external calendar sync.
                </p>

                <div className="flex flex-wrap gap-2 mt-4">
                  <button
                    onClick={cancelAppointment}
                    disabled={savingLeadId === selectedAppointment.lead_id}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={markNoShow}
                    disabled={savingLeadId === selectedAppointment.lead_id}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    <Clock3 className="w-4 h-4" />
                    Mark no-show
                  </button>
                  <button
                    onClick={reopenAppointment}
                    disabled={savingLeadId === selectedAppointment.lead_id}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reopen request
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                  <Link
                    href={`/dashboard/leads/${selectedAppointment.lead_id}`}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open request detail
                  </Link>
                  {selectedAppointment.thread_id ? (
                    <Link
                      href={`/dashboard/inbox/${selectedAppointment.thread_id}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Continue in inbox
                    </Link>
                  ) : (
                    <div className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-400 border border-slate-200 rounded-lg">
                      <MessageSquare className="w-4 h-4" />
                      No linked thread yet
                    </div>
                  )}
                </div>

                {selectedAppointment.notes && (
                  <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Internal notes
                    </p>
                    <p className="text-sm text-amber-800 mt-1 whitespace-pre-wrap">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
