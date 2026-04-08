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
import { WorkspaceBand } from "@/components/shared/WorkspaceBand";
import { ChannelBadge } from "@/components/shared/FrontdeskBadges";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import type { AppointmentRecord } from "@/types";
import {
  toDateInputValue,
  toTimeInputValue,
  combineDateTime,
  formatBookingText as formatPreferredText,
  appointmentStatusLabel,
  appointmentStatusClass,
  depositStatusLabel,
  depositStatusClass,
  humanizeSnakeCase as humanizeStatus,
  formatMoney,
} from "@/lib/format-helpers";

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
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              <h2 className="text-base font-bold text-[#0F172A]">{appointment.patient_name}</h2>
              <ChannelBadge channel={appointment.source} withIcon />
              <LeadStatusBadge status={appointment.lead_status} />
            </div>
            <p className="text-xs text-[#64748B]">
              {appointment.appointment_starts_at
                ? formatDateTime(appointment.appointment_starts_at)
                : appointment.preferred_datetime_text || "Scheduling details still pending."}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {appointment.thread_id && (
              <Link
                href={`/dashboard/inbox/${appointment.thread_id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#99f6e4] px-2.5 py-1.5 text-xs font-semibold text-[#115E59] transition-colors hover:bg-[#CCFBF1]"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Thread</span>
              </Link>
            )}
            {appointment.customer_key ? (
              <Link
                href={`/dashboard/customers/${appointment.customer_key}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]"
              >
                <UserRound className="w-3.5 h-3.5" />
                <span>Customer</span>
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs text-[#64748B]">
                <UserRound className="w-3.5 h-3.5" />
                <span>No customer profile</span>
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F8FAFC]">
              <Phone className="w-3 h-3 text-[#64748B]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B]">Phone</p>
              <p className="break-words text-sm font-semibold text-[#0F172A]">{appointment.patient_phone || "No phone"}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F8FAFC]">
              <UserRound className="w-3 h-3 text-[#64748B]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B]">Email</p>
              <p className="break-words text-sm font-semibold text-[#0F172A]">{appointment.patient_email || "No email"}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F8FAFC]">
              <Clock3 className="w-3 h-3 text-[#64748B]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B]">Reminder</p>
              <p className="text-sm font-semibold text-[#0F172A]">{humanizeStatus(appointment.reminder_status)}</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F8FAFC]">
              <Wallet className="w-3 h-3 text-[#64748B]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B]">Deposit</p>
              <p className="text-sm font-semibold text-[#0F172A]">{depositStatusLabel(appointment.deposit_status)}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${appointmentStatusClass(appointment.appointment_status)}`}>
              {appointmentStatusLabel(appointment.appointment_status)}
            </span>
            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${appointment.reminder_ready ? "bg-emerald-50 text-emerald-700" : "bg-[#F1F5F9] text-[#475569]"
              }`}>
              {appointment.reminder_ready ? "Reminder ready" : "Not ready"}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[#475569]">
            {reminderCaption(appointment)}
          </p>
        </div>
      </div>

      {/* Deposit */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#0F172A]">Booking deposit</p>
        <p className="mt-0.5 text-xs text-[#64748B]">Request a Stripe deposit and track delivery.</p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${depositStatusClass(appointment.deposit_status)}`}>
            {depositStatusLabel(appointment.deposit_status)}
          </span>
          {appointment.deposit_amount_cents ? (
            <span className="rounded-md bg-[#F1F5F9] px-2 py-0.5 text-xs font-semibold text-[#0F172A]">
              {formatMoney(appointment.deposit_amount_cents)}
            </span>
          ) : null}
          {appointment.deposit_request_delivery_status ? (
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
              SMS {humanizeStatus(appointment.deposit_request_delivery_status)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[10rem_1fr]">
          <div>
            <label htmlFor="deposit-amount" className="mb-1 block text-xs font-semibold text-[#64748B]">Amount (cents)</label>
            <input
              id="deposit-amount"
              type="number"
              min={0}
              step={100}
              value={draft.depositAmountCents}
              onChange={(event) => onUpdateDraft({ depositAmountCents: event.target.value })}
              placeholder="e.g. 5000"
              className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-sm text-[#0F172A] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
            />
            <p className="mt-1 text-xs text-[#64748B]">5000 = {formatMoney(5000)}</p>
          </div>
          <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#64748B]">State</p>
            <p className="mt-0.5 text-xs leading-relaxed text-[#475569]">
              {depositStateCaption(appointment)}
            </p>
            {appointment.deposit_requested_at && appointment.deposit_status !== "paid" && (
              <p className="mt-1 text-xs text-[#64748B]">Requested {formatDateTime(appointment.deposit_requested_at)}</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => onRequestDeposit(true)}
            disabled={isDepositLoading || appointment.appointment_status !== "confirmed" || appointment.deposit_status === "paid"}
            className="rounded-lg bg-[#0F766E] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-50"
          >
            {depositButtonLabel(appointment, isDepositLoading)}
          </button>
          <button
            onClick={() => onRequestDeposit(false)}
            disabled={isDepositLoading || appointment.appointment_status !== "confirmed"}
            className="rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
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

        {depositMessage && <p className="mt-2 text-xs text-[#475569]">{depositMessage}</p>}

        {(depositLink || appointment.deposit_status === "requested") && (
          <div className="mt-3">
            <label htmlFor="deposit-link" className="mb-1 block text-xs font-semibold text-[#64748B]">Deposit link</label>
            <div className="flex gap-1.5">
              <input
                id="deposit-link"
                type="text"
                value={depositLink}
                readOnly
                placeholder="Create or resend to generate a link"
                className="h-9 min-w-0 flex-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-xs text-[#475569]"
              />
              <button
                onClick={onCopyLink}
                disabled={!depositLink}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit booking */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#0F172A]">Edit booking</p>
        <p className="mt-0.5 text-xs text-[#64748B]">Time, reason, and internal note.</p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <input
            type="date"
            value={draft.date}
            onChange={(event) => onUpdateDraft({ date: event.target.value })}
            title="Appointment date"
            className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-sm focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
          />
          <input
            type="time"
            value={draft.time}
            onChange={(event) => onUpdateDraft({ time: event.target.value })}
            title="Appointment time"
            className="h-8 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-sm focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
          />
        </div>

        <input
          type="text"
          value={draft.reason}
          onChange={(event) => onUpdateDraft({ reason: event.target.value })}
          placeholder="Reason for visit"
          className="mt-2 h-8 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 text-sm placeholder:text-[#64748B] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
        />

        <textarea
          rows={2}
          value={draft.note}
          onChange={(event) => onUpdateDraft({ note: event.target.value })}
          placeholder="Internal booking note"
          className="mt-2 w-full rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-2 text-sm placeholder:text-[#64748B] focus:border-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#CCFBF1]"
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={onSaveDetails}
            disabled={isSaving}
            className="rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save details"}
          </button>
          <button
            onClick={onReschedule}
            disabled={isSaving}
            className="rounded-lg bg-[#0F766E] px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#115E59] disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Reschedule"}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#0F172A]">Actions</p>
        <p className="mt-0.5 text-xs text-[#64748B]">Lifecycle changes — no external sync implied.</p>

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
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] px-2.5 py-2 text-xs font-semibold text-[#475569] transition-colors hover:bg-[#F8FAFC]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Request detail</span>
          </Link>
          {appointment.thread_id ? (
            <Link
              href={`/dashboard/inbox/${appointment.thread_id}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#99f6e4] px-2.5 py-2 text-xs font-semibold text-[#115E59] transition-colors hover:bg-[#CCFBF1]"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Inbox thread</span>
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E2E8F0] px-2.5 py-2 text-xs text-[#64748B]">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>No thread</span>
            </span>
          )}
        </div>

        {appointment.notes && (
          <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-amber-800">{appointment.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [viewCounts, setViewCounts] = useState<Partial<Record<AppointmentView, number>> | null>(null);
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
      setViewCounts((prev) => (prev ? { ...prev, [view]: data.length } : prev));
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          APPOINTMENT_VIEWS.map((v) => api.frontdesk.listAppointments(v.value))
        );
        if (cancelled) return;
        const next: Partial<Record<AppointmentView, number>> = {};
        APPOINTMENT_VIEWS.forEach((v, i) => {
          next[v.value] = results[i].length;
        });
        setViewCounts(next);
      } catch {
        if (!cancelled) setViewCounts(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  if (loading) return <LoadingState message="Loading appointments..." detail="Synchronizing booking board" />;
  if (error)
    return <ErrorState variant="calm" message={error} onRetry={() => loadAppointments(activeView)} />;

  return (
    <div className="workspace-page">
      <PageHeader
        showDivider
        eyebrow={
          <>
            <CalendarClock className="h-3.5 w-3.5" />
            Appointments
          </>
        }
        title="Booking & deposit workspace"
        description="Confirm times, watch reminder prep, and move deposits forward—without a calendar mock-up. Every row links back to the patient thread when you need context."
      />

      <WorkspaceBand>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="workspace-section-label">Board summary</p>
            <p className="mt-2 text-sm leading-relaxed text-[#475569]">
              Counts reflect the live appointment board. Use views to focus on upcoming work, items that need attention, or closed states—then act from the list and the detail rail.
            </p>
          </div>
          {viewCounts ? (
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-2xl">
              {APPOINTMENT_VIEWS.map((view) => {
                const n = viewCounts[view.value] ?? 0;
                const active = activeView === view.value;
                return (
                  <button
                    key={view.value}
                    type="button"
                    onClick={() => setActiveView(view.value)}
                    className={`rounded-lg border px-3 py-2.5 text-left shadow-[0_1px_2px_rgb(15_23_42/0.05)] transition-all ${active
                      ? "border-[#99f6e4] bg-[#CCFBF1]/90"
                      : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1]"
                      }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">{view.label}</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums text-[#0F172A]">{n}</p>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </WorkspaceBand>

      <div className="workspace-column-layout">
        {/* Left rail — views */}
        <div className="hidden space-y-2.5 xl:block">
          <div className="workspace-rail-card p-4">
            <p className="workspace-section-label">Views</p>
            <div className="mt-2.5 space-y-1">
              {APPOINTMENT_VIEWS.map((view) => {
                const active = activeView === view.value;
                return (
                  <button
                    key={view.value}
                    onClick={() => setActiveView(view.value)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors ${active
                      ? "bg-[#CCFBF1]/90 text-[#115E59]"
                      : "text-[#475569] hover:bg-[#F8FAFC]"
                      }`}
                  >
                    <span>{view.label}</span>
                    {active && <span className="text-xs text-[#0F766E]">Active</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="workspace-rail-card p-4">
            <p className="workspace-section-label">Board</p>
            <div className="mt-2 space-y-1.5">
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <p className="text-xs text-[#475569]">Visible</p>
                <p className="mt-0.5 text-lg font-bold text-[#0F172A]">{appointments.length}</p>
              </div>
              <div className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                <p className="text-xs text-[#475569]">View</p>
                <p className="mt-0.5 text-sm font-semibold text-[#0F172A]">
                  {APPOINTMENT_VIEWS.find((v) => v.value === activeView)?.label}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Center — appointment list */}
        <div className="min-w-0 space-y-3">
          <div>
            <p className="workspace-section-label">Appointment list</p>
            <p className="mt-1 text-sm text-[#475569]">Select a booking to edit schedule, reminders, and deposits in the rail.</p>
          </div>
          {appointments.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="w-7 h-7 text-[#64748B]" />}
              title={`No ${APPOINTMENT_VIEWS.find((v) => v.value === activeView)?.label ?? "matching"} appointments`}
              description='Switch views to see other stages, or mark a request as booked in Leads once a time is confirmed — it appears here after the board refreshes.'
              action={
                <Link
                  href="/dashboard/leads"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0F766E] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#115E59]"
                >
                  Open booking pipeline
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {appointments.map((appointment) => {
                const active = selectedLeadId === appointment.lead_id;
                return (
                  <button
                    key={appointment.lead_id}
                    onClick={() => setSelectedLeadId(appointment.lead_id)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left transition-all ${active
                      ? "border-[#99f6e4] bg-[#CCFBF1]/70 shadow-sm"
                      : "border-[#E2E8F0] bg-white hover:border-[#E2E8F0]"
                      }`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-[#0F172A]">{appointment.patient_name}</p>
                          <ChannelBadge channel={appointment.source} withIcon />
                          <LeadStatusBadge status={appointment.lead_status} />
                        </div>
                        <p className="truncate text-sm text-[#475569]">
                          {appointment.reason_for_visit || "No visit reason recorded"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${appointmentStatusClass(appointment.appointment_status)}`}>
                            {appointmentStatusLabel(appointment.appointment_status)}
                          </span>
                          {appointment.reminder_status !== "not_ready" && (
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              Reminder {humanizeStatus(appointment.reminder_status)}
                            </span>
                          )}
                          {appointment.follow_up_open && (
                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Follow-up</span>
                          )}
                          {appointment.deposit_status !== "not_required" && (
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${depositStatusClass(appointment.deposit_status)}`}>
                              {depositStatusLabel(appointment.deposit_status)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 sm:text-right">
                        <p className="text-sm font-semibold text-[#0F172A]">
                          {appointment.appointment_starts_at
                            ? formatDateTime(appointment.appointment_starts_at)
                            : appointment.preferred_datetime_text || "Time not set"}
                        </p>
                        <p className="mt-0.5 text-xs text-[#64748B]">
                          Updated {timeAgo(appointment.updated_at || appointment.appointment_starts_at || "")}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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
    </div>
  );
}
