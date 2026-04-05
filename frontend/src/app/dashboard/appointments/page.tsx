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
  if (status === "confirmed") return "bg-emerald-50 text-emerald-700";
  if (status === "cancel_requested" || status === "reschedule_requested") return "bg-amber-50 text-amber-700";
  if (status === "cancelled" || status === "no_show") return "bg-rose-50 text-rose-700";
  if (status === "completed") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-700";
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
  if (status === "paid") return "bg-emerald-50 text-emerald-700";
  if (status === "requested" || status === "required") return "bg-amber-50 text-amber-700";
  if (status === "failed" || status === "expired") return "bg-rose-50 text-rose-700";
  if (status === "waived") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-700";
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

function reminderCaption(appointment: AppointmentRecord): string {
  if (appointment.reminder_ready) {
    return appointment.reminder_scheduled_for
      ? `Scheduled ${formatDateTime(appointment.reminder_scheduled_for)}.`
      : "Reminder prep complete.";
  }
  return appointment.reminder_blocked_reason || "Not active yet.";
}

function depositStateCaption(appointment: AppointmentRecord): string {
  if (appointment.deposit_status === "paid") {
    return appointment.deposit_paid_at
      ? `Paid ${formatDateTime(appointment.deposit_paid_at)}.`
      : "Payment confirmed.";
  }
  if (appointment.deposit_request_delivery_reason) {
    return appointment.deposit_request_delivery_reason;
  }
  if (appointment.deposit_status === "requested") {
    return "Link created. Payment pending.";
  }
  return "No deposit requested.";
}

function depositButtonLabel(appointment: AppointmentRecord, isLoading: boolean): string {
  if (isLoading) return "Working...";
  if (
    appointment.deposit_status === "requested" ||
    appointment.deposit_status === "failed" ||
    appointment.deposit_status === "expired"
  ) {
    return "Resend";
  }
  return "Request deposit";
}

type DetailRailProps = {
  readonly appointment: AppointmentRecord;
  readonly draft: AppointmentDraft;
  readonly onUpdateDraft: (patch: Partial<AppointmentDraft>) => void;
  readonly onSaveDetails: () => void;
  readonly onReschedule: () => void;
  readonly onCancel: () => void;
  readonly onMarkNoShow: () => void;
  readonly onReopen: () => void;
  readonly onRequestDeposit: (sendSms: boolean) => void;
  readonly onClearDeposit: () => void;
  readonly onCopyLink: () => void;
  readonly depositLink: string;
  readonly depositMessage: string;
  readonly depositActionLeadId: string;
  readonly savingLeadId: string;
};

function AppointmentDetailRail({
  appointment,
  draft,
  onUpdateDraft,
  onSaveDetails,
  onReschedule,
  onCancel,
  onMarkNoShow,
  onReopen,
  onRequestDeposit,
  onClearDeposit,
  onCopyLink,
  depositLink,
  depositMessage,
  depositActionLeadId,
  savingLeadId,
}: DetailRailProps) {
  const isSaving = savingLeadId === appointment.lead_id;
  const isDepositLoading = depositActionLeadId === appointment.lead_id;

  return (
    <div className="space-y-3">
      {/* Patient info */}
      <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <h2 className="text-base font-bold text-slate-900">{appointment.patient_name}</h2>
              <ChannelBadge channel={appointment.source} withIcon />
              <LeadStatusBadge status={appointment.lead_status} />
            </div>
            <p className="text-[10px] text-slate-400">
              {appointment.appointment_starts_at
                ? formatDateTime(appointment.appointment_starts_at)
                : appointment.preferred_datetime_text || "Scheduling details still pending."}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {appointment.thread_id && (
              <Link
                href={`/dashboard/inbox/${appointment.thread_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-50"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Thread</span>
              </Link>
            )}
            {appointment.customer_key ? (
              <Link
                href={`/dashboard/customers/${appointment.customer_key}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <UserRound className="w-3.5 h-3.5" />
                <span>Customer</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-100 px-2.5 py-1.5 text-xs text-slate-400">
                <UserRound className="w-3.5 h-3.5" />
                <span>No customer profile</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50">
              <Phone className="w-3 h-3 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Phone</p>
              <p className="text-[12px] font-semibold text-slate-900">{appointment.patient_phone || "No phone"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50">
              <UserRound className="w-3 h-3 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Email</p>
              <p className="text-[12px] font-semibold text-slate-900">{appointment.patient_email || "No email"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50">
              <Clock3 className="w-3 h-3 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Reminder</p>
              <p className="text-[12px] font-semibold text-slate-900">{humanizeStatus(appointment.reminder_status)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50">
              <Wallet className="w-3 h-3 text-slate-400" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Deposit</p>
              <p className="text-[12px] font-semibold text-slate-900">{depositStatusLabel(appointment.deposit_status)}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-slate-100/60 bg-slate-50/40 p-2.5">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${appointmentStatusClass(appointment.appointment_status)}`}>
              {appointmentStatusLabel(appointment.appointment_status)}
            </span>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
              appointment.reminder_ready ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
            }`}>
              {appointment.reminder_ready ? "Reminder ready" : "Not ready"}
            </span>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500">
            {reminderCaption(appointment)}
          </p>
        </div>
      </div>

      {/* Deposit */}
      <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
        <p className="text-[12px] font-semibold text-slate-900">Booking deposit</p>
        <p className="mt-0.5 text-[10px] text-slate-400">Request a Stripe deposit and track delivery.</p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${depositStatusClass(appointment.deposit_status)}`}>
            {depositStatusLabel(appointment.deposit_status)}
          </span>
          {appointment.deposit_amount_cents ? (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              {formatMoney(appointment.deposit_amount_cents)}
            </span>
          ) : null}
          {appointment.deposit_request_delivery_status ? (
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
              SMS {humanizeStatus(appointment.deposit_request_delivery_status)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[10rem_1fr]">
          <div>
            <label htmlFor="deposit-amount" className="mb-1 block text-[10px] font-semibold text-slate-400">Amount (cents)</label>
            <input
              id="deposit-amount"
              type="number"
              min={0}
              step={100}
              value={draft.depositAmountCents}
              onChange={(event) => onUpdateDraft({ depositAmountCents: event.target.value })}
              placeholder="e.g. 5000"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] text-slate-900 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            <p className="mt-1 text-[10px] text-slate-400">5000 = {formatMoney(5000)}</p>
          </div>
          <div className="rounded-lg border border-slate-100/60 bg-slate-50/40 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300">State</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
              {depositStateCaption(appointment)}
            </p>
            {appointment.deposit_requested_at && appointment.deposit_status !== "paid" && (
              <p className="mt-1 text-[10px] text-slate-400">Requested {formatDateTime(appointment.deposit_requested_at)}</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => onRequestDeposit(true)}
            disabled={isDepositLoading || appointment.appointment_status !== "confirmed" || appointment.deposit_status === "paid"}
            className="rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {depositButtonLabel(appointment, isDepositLoading)}
          </button>
          <button
            onClick={() => onRequestDeposit(false)}
            disabled={isDepositLoading || appointment.appointment_status !== "confirmed"}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Link only
          </button>
          <button
            onClick={onClearDeposit}
            disabled={isDepositLoading || appointment.deposit_status === "not_required"}
            className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            Not required
          </button>
        </div>

        {depositMessage && <p className="mt-2 text-[11px] text-slate-500">{depositMessage}</p>}

        {(depositLink || appointment.deposit_status === "requested") && (
          <div className="mt-3">
            <label htmlFor="deposit-link" className="mb-1 block text-[10px] font-semibold text-slate-400">Deposit link</label>
            <div className="flex gap-1.5">
              <input
                id="deposit-link"
                type="text"
                value={depositLink}
                readOnly
                placeholder="Create or resend to generate a link"
                className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-xs text-slate-600"
              />
              <button
                onClick={onCopyLink}
                disabled={!depositLink}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit booking */}
      <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
        <p className="text-[12px] font-semibold text-slate-900">Edit booking</p>
        <p className="mt-0.5 text-[10px] text-slate-400">Time, reason, and internal note.</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            type="date"
            value={draft.date}
            onChange={(event) => onUpdateDraft({ date: event.target.value })}
            title="Appointment date"
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <input
            type="time"
            value={draft.time}
            onChange={(event) => onUpdateDraft({ time: event.target.value })}
            title="Appointment time"
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <input
          type="text"
          value={draft.reason}
          onChange={(event) => onUpdateDraft({ reason: event.target.value })}
          placeholder="Reason for visit"
          className="mt-2 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />

        <textarea
          rows={2}
          value={draft.note}
          onChange={(event) => onUpdateDraft({ note: event.target.value })}
          placeholder="Internal booking note"
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={onSaveDetails}
            disabled={isSaving}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save details"}
          </button>
          <button
            onClick={onReschedule}
            disabled={isSaving}
            className="rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Reschedule"}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
        <p className="text-[12px] font-semibold text-slate-900">Actions</p>
        <p className="mt-0.5 text-[10px] text-slate-400">Lifecycle changes — no external sync implied.</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
          <button
            onClick={onMarkNoShow}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
          >
            <Clock3 className="w-3.5 h-3.5" />
            <span>No-show</span>
          </button>
          <button
            onClick={onReopen}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reopen</span>
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={`/dashboard/leads/${appointment.lead_id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Request detail</span>
          </Link>
          {appointment.thread_id ? (
            <Link
              href={`/dashboard/inbox/${appointment.thread_id}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-teal-200 px-2.5 py-2 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-50"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Inbox thread</span>
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-100 px-2.5 py-2 text-xs text-slate-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>No thread</span>
            </span>
          )}
        </div>

        {appointment.notes && (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-amber-800">{appointment.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
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

  const updateDraft = useCallback((leadId: string, patch: Partial<AppointmentDraft>) => {
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
  }, []);

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
    <div className="space-y-4">
      <PageHeader
        eyebrow={
          <>
            <CalendarClock className="h-3.5 w-3.5" />
            Appointments
          </>
        }
        title="Appointment board"
        description="Timing, deposits, reminders, and appointment lifecycle in one view. Track every booking from confirmation to completion."
      />

      {appointments.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="w-7 h-7 text-slate-400" />}
          title="No appointments yet"
          description="Appointments will appear here once staff confirms a booking from the pipeline. You can also create one manually from any inbox thread."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[210px_1fr_320px]">
          {/* Left rail — views */}
          <div className="hidden space-y-2.5 xl:block">
            <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-300">Views</p>
              <div className="mt-2.5 space-y-1">
                {APPOINTMENT_VIEWS.map((view) => {
                  const active = activeView === view.value;
                  return (
                    <button
                      key={view.value}
                      onClick={() => setActiveView(view.value)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                        active
                          ? "bg-teal-50/60 text-teal-800"
                          : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <span>{view.label}</span>
                      {active && <span className="text-[10px] text-teal-500">Active</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-300">Board</p>
              <div className="mt-2 space-y-1.5">
                <div className="rounded-md border border-slate-100/60 bg-slate-50/40 px-2.5 py-2">
                  <p className="text-[9px] text-slate-400">Visible</p>
                  <p className="mt-0.5 text-lg font-bold text-slate-900">{appointments.length}</p>
                </div>
                <div className="rounded-md border border-slate-100/60 bg-slate-50/40 px-2.5 py-2">
                  <p className="text-[9px] text-slate-400">View</p>
                  <p className="mt-0.5 text-[12px] font-semibold text-slate-900">
                    {APPOINTMENT_VIEWS.find((v) => v.value === activeView)?.label}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile view selector */}
          <div className="flex flex-wrap gap-2 xl:hidden">
            {APPOINTMENT_VIEWS.map((view) => (
              <button
                key={view.value}
                onClick={() => setActiveView(view.value)}
                className={`rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  activeView === view.value
                    ? "bg-teal-50/60 text-teal-800"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {/* Center — appointment list */}
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
              <p className="text-[12px] font-semibold text-slate-900">Appointments</p>
              <p className="mt-0.5 text-[9px] text-slate-400">Timing, reminders, deposit state, and linked patient context.</p>
            </div>
            <div className="space-y-2">
              {appointments.map((appointment) => {
                const active = selectedLeadId === appointment.lead_id;
                return (
                  <button
                    key={appointment.lead_id}
                    onClick={() => setSelectedLeadId(appointment.lead_id)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      active
                        ? "border-teal-200 bg-teal-50/30 shadow-sm"
                        : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-[13px] font-semibold text-slate-900">{appointment.patient_name}</p>
                          <ChannelBadge channel={appointment.source} withIcon />
                          <LeadStatusBadge status={appointment.lead_status} />
                        </div>
                        <p className="truncate text-[12px] text-slate-500">
                          {appointment.reason_for_visit || "No visit reason recorded"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${appointmentStatusClass(appointment.appointment_status)}`}>
                            {appointmentStatusLabel(appointment.appointment_status)}
                          </span>
                          {appointment.reminder_status !== "not_ready" && (
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              Reminder {humanizeStatus(appointment.reminder_status)}
                            </span>
                          )}
                          {appointment.follow_up_open && (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Follow-up</span>
                          )}
                          {appointment.deposit_status !== "not_required" && (
                            <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${depositStatusClass(appointment.deposit_status)}`}>
                              {depositStatusLabel(appointment.deposit_status)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 sm:text-right">
                        <p className="text-[12px] font-semibold text-slate-900">
                          {appointment.appointment_starts_at
                            ? formatDateTime(appointment.appointment_starts_at)
                            : appointment.preferred_datetime_text || "Time not set"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Updated {timeAgo(appointment.updated_at || appointment.appointment_starts_at || "")}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right rail — detail */}
          {selectedAppointment && selectedDraft && (
            <AppointmentDetailRail
              appointment={selectedAppointment}
              draft={selectedDraft}
              onUpdateDraft={(patch) => updateDraft(selectedAppointment.lead_id, patch)}
              onSaveDetails={saveDetails}
              onReschedule={rescheduleAppointment}
              onCancel={cancelAppointment}
              onMarkNoShow={markNoShow}
              onReopen={reopenAppointment}
              onRequestDeposit={requestDeposit}
              onClearDeposit={clearDepositRequirement}
              onCopyLink={copyDepositLink}
              depositLink={depositLink}
              depositMessage={depositMessage}
              depositActionLeadId={depositActionLeadId}
              savingLeadId={savingLeadId}
            />
          )}
        </div>
      )}
    </div>
  );
}
