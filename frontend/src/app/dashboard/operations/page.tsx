"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  CalendarClock,
  Loader2,
  Plus,
  Wallet,
} from "lucide-react";

import { api } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Clinic, OperationsLead, OperationsOverview, WaitlistEntry } from "@/types";

function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function appointmentStatusLabel(status: OperationsLead["appointment_status"]): string {
  if (status === "cancel_requested") return "Cancel requested";
  if (status === "reschedule_requested") return "Reschedule requested";
  if (status === "cancelled") return "Cancelled";
  if (status === "completed") return "Completed";
  if (status === "no_show") return "No-show";
  if (status === "confirmed") return "Confirmed";
  return "Open request";
}

function appointmentStatusClass(status: OperationsLead["appointment_status"]): string {
  if (status === "confirmed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "cancel_requested" || status === "reschedule_requested") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (status === "cancelled" || status === "no_show") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200";
}

type LeadDraft = {
  appointmentStatus: OperationsLead["appointment_status"];
  appointmentStartsAt: string;
  depositRequired: boolean;
  depositAmountCents: string;
  depositStatus: OperationsLead["deposit_status"];
  reminderNote: string;
};

function draftFromLead(lead: OperationsLead): LeadDraft {
  return {
    appointmentStatus: lead.appointment_status,
    appointmentStartsAt: toDateTimeLocal(lead.appointment_starts_at),
    depositRequired: lead.deposit_required,
    depositAmountCents: lead.deposit_amount_cents ? String(lead.deposit_amount_cents) : "",
    depositStatus: lead.deposit_status,
    reminderNote: "",
  };
}

export default function OperationsPage() {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [operations, setOperations] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingLeadId, setSavingLeadId] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingWaitlistId, setSavingWaitlistId] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderLeadHours, setReminderLeadHours] = useState("24");
  const [leadDrafts, setLeadDrafts] = useState<Record<string, LeadDraft>>({});
  const [waitlistForm, setWaitlistForm] = useState({
    patient_name: "",
    patient_phone: "",
    patient_email: "",
    service_requested: "",
    preferred_times: "",
    notes: "",
  });

  const syncLeadDrafts = useCallback((data: OperationsOverview) => {
    setLeadDrafts((current) => {
      const next = { ...current };
      for (const lead of [...data.reminder_candidates, ...data.action_required_requests]) {
        next[lead.lead_id] = next[lead.lead_id] ?? draftFromLead(lead);
      }
      return next;
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [clinicData, operationsData] = await Promise.all([
        api.clinics.getMyClinic(),
        api.frontdesk.getOperations(),
      ]);
      setClinic(clinicData);
      setOperations(operationsData);
      setReminderEnabled(operationsData.reminder_enabled);
      setReminderLeadHours(String(operationsData.reminder_lead_hours));
      syncLeadDrafts(operationsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load operations");
    } finally {
      setLoading(false);
    }
  }, [syncLeadDrafts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveReminderSettings = async () => {
    setSavingSettings(true);
    try {
      const updatedClinic = await api.clinics.updateMyClinic({
        reminder_enabled: reminderEnabled,
        reminder_lead_hours: Number(reminderLeadHours) || 24,
      });
      setClinic(updatedClinic);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update reminder settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const updateLeadDraft = (leadId: string, patch: Partial<LeadDraft>) => {
    setLeadDrafts((current) => ({
      ...current,
      [leadId]: {
        ...current[leadId],
        ...patch,
      },
    }));
  };

  const saveLeadOperations = async (leadId: string) => {
    const draft = leadDrafts[leadId];
    if (!draft) return;
    setSavingLeadId(leadId);
    try {
      await api.frontdesk.updateLeadOperations(leadId, {
        appointment_status: draft.appointmentStatus,
        appointment_starts_at: toIsoOrNull(draft.appointmentStartsAt),
        reminder_note: draft.reminderNote || undefined,
        deposit_required: draft.depositRequired,
        deposit_amount_cents: draft.depositRequired && draft.depositAmountCents
          ? Number(draft.depositAmountCents)
          : null,
        deposit_status: draft.depositRequired ? draft.depositStatus : "not_required",
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update booking operations");
    } finally {
      setSavingLeadId("");
    }
  };

  const createWaitlistEntry = async () => {
    if (!waitlistForm.patient_name.trim()) return;
    setSavingWaitlistId("new");
    try {
      await api.frontdesk.createWaitlistEntry(waitlistForm);
      setWaitlistForm({
        patient_name: "",
        patient_phone: "",
        patient_email: "",
        service_requested: "",
        preferred_times: "",
        notes: "",
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create waitlist entry");
    } finally {
      setSavingWaitlistId("");
    }
  };

  const updateWaitlistEntry = async (
    entry: WaitlistEntry,
    status: WaitlistEntry["status"]
  ) => {
    setSavingWaitlistId(entry.id);
    try {
      await api.frontdesk.updateWaitlistEntry(entry.id, { status });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update waitlist entry");
    } finally {
      setSavingWaitlistId("");
    }
  };

  const reminderCandidates = operations?.reminder_candidates ?? [];
  const actionRequiredRequests = operations?.action_required_requests ?? [];
  const waitlistEntries = operations?.waitlist_entries ?? [];
  const waitlistSummary = {
    waiting: waitlistEntries.filter((entry) => entry.status === "waiting").length,
    contacted: waitlistEntries.filter((entry) => entry.status === "contacted").length,
  };

  if (loading) return <LoadingState message="Loading operations..." />;
  if (error && !operations) return <ErrorState message={error} onRetry={loadData} />;
  if (!operations || !clinic) {
    return <ErrorState title="Operations unavailable" message="The operations workspace could not be loaded." onRetry={loadData} />;
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Operations</h1>
        <p className="text-sm text-slate-500 mt-1">
          Prepare reminders, manage cancel or reschedule requests, maintain a waitlist, and track deposit readiness without overstating automation that is not wired yet.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BellRing className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-semibold text-slate-900">Reminder settings</h2>
            </div>
            <p className="text-sm text-slate-500">
              Reminder delivery is not automated yet. These settings prepare confirmed bookings and generate a real preview schedule for the next delivery pass.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[auto_9rem_auto] gap-3 items-center">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(event) => setReminderEnabled(event.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              Enable reminder prep
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={reminderLeadHours}
              onChange={(event) => setReminderLeadHours(event.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
            <button
              onClick={saveReminderSettings}
              disabled={savingSettings}
              className="px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {savingSettings ? "Saving..." : "Save settings"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Reminder-ready bookings</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Confirm appointment timing, preview the reminder, and record deposit requirements for later Stripe collection work.
                </p>
              </div>
              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                {reminderCandidates.length} bookings
              </span>
            </div>

            {reminderCandidates.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="w-7 h-7 text-slate-400" />}
                title="No booked requests yet"
                description="Once requests are booked, you can prepare reminder timing and booking operations here."
              />
            ) : (
              <div className="space-y-4">
                {reminderCandidates.map((lead) => {
                  const draft = leadDrafts[lead.lead_id] ?? draftFromLead(lead);

                  return (
                    <div key={lead.lead_id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <p className="text-sm font-semibold text-slate-900">{lead.patient_name}</p>
                            <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${appointmentStatusClass(lead.appointment_status)}`}>
                              {appointmentStatusLabel(lead.appointment_status)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{lead.reason_for_visit || "Booked request"}</p>
                          <p className="text-xs text-slate-500 mt-2">
                            Last updated {lead.updated_at ? timeAgo(lead.updated_at) : "recently"}
                          </p>
                        </div>

                        <div className="shrink-0 text-xs text-slate-500">
                          {lead.reminder_scheduled_for
                            ? `Reminder target: ${formatDateTime(lead.reminder_scheduled_for)}`
                            : "No reminder schedule yet"}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">
                            Appointment time
                          </label>
                          <input
                            type="datetime-local"
                            value={draft.appointmentStartsAt}
                            onChange={(event) => updateLeadDraft(lead.lead_id, { appointmentStartsAt: event.target.value })}
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">
                            Booking state
                          </label>
                          <select
                            value={draft.appointmentStatus}
                            onChange={(event) =>
                              updateLeadDraft(lead.lead_id, {
                                appointmentStatus: event.target.value as LeadDraft["appointmentStatus"],
                              })
                            }
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="reschedule_requested">Reschedule requested</option>
                            <option value="cancel_requested">Cancel requested</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="completed">Completed</option>
                            <option value="no_show">No-show</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[auto_10rem_10rem] gap-4 mt-4 items-end">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={draft.depositRequired}
                            onChange={(event) =>
                              updateLeadDraft(lead.lead_id, { depositRequired: event.target.checked })
                            }
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          Require deposit later
                        </label>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">
                            Deposit amount
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={100}
                            value={draft.depositAmountCents}
                            onChange={(event) =>
                              updateLeadDraft(lead.lead_id, { depositAmountCents: event.target.value })
                            }
                            disabled={!draft.depositRequired}
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1.5">
                            Deposit state
                          </label>
                          <select
                            value={draft.depositRequired ? draft.depositStatus : "not_required"}
                            onChange={(event) =>
                              updateLeadDraft(lead.lead_id, {
                                depositStatus: event.target.value as LeadDraft["depositStatus"],
                              })
                            }
                            disabled={!draft.depositRequired}
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="waived">Waived</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Reminder preview
                        </p>
                        <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                          {lead.reminder_preview
                            ? lead.reminder_preview
                            : "Set a confirmed appointment time to generate a reminder preview."}
                        </p>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => saveLeadOperations(lead.lead_id)}
                          disabled={savingLeadId === lead.lead_id}
                          className="px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                        >
                          {savingLeadId === lead.lead_id ? "Saving..." : "Save booking operations"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Waitlist</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Capture patients you want to circle back to when availability opens up.
                </p>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="inline-flex px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {waitlistSummary.waiting} waiting
                </span>
                <span className="inline-flex px-2.5 py-1 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {waitlistSummary.contacted} contacted
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              <input
                type="text"
                value={waitlistForm.patient_name}
                onChange={(event) => setWaitlistForm((current) => ({ ...current, patient_name: event.target.value }))}
                placeholder="Patient name"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              <input
                type="text"
                value={waitlistForm.patient_phone}
                onChange={(event) => setWaitlistForm((current) => ({ ...current, patient_phone: event.target.value }))}
                placeholder="Phone"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              <input
                type="email"
                value={waitlistForm.patient_email}
                onChange={(event) => setWaitlistForm((current) => ({ ...current, patient_email: event.target.value }))}
                placeholder="Email"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              <input
                type="text"
                value={waitlistForm.service_requested}
                onChange={(event) => setWaitlistForm((current) => ({ ...current, service_requested: event.target.value }))}
                placeholder="Requested service"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
              <input
                type="text"
                value={waitlistForm.preferred_times}
                onChange={(event) => setWaitlistForm((current) => ({ ...current, preferred_times: event.target.value }))}
                placeholder="Preferred times"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 md:col-span-2"
              />
              <textarea
                value={waitlistForm.notes}
                onChange={(event) => setWaitlistForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                placeholder="Notes"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none md:col-span-2"
              />
            </div>

            <button
              onClick={createWaitlistEntry}
              disabled={savingWaitlistId === "new" || !waitlistForm.patient_name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {savingWaitlistId === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add to waitlist
            </button>

            <div className="space-y-3 mt-5">
              {waitlistEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 text-center">
                  No waitlist entries yet.
                </div>
              ) : (
                waitlistEntries.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-slate-900">{entry.patient_name}</p>
                          <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                            {entry.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {entry.service_requested || "General waitlist request"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {entry.preferred_times || "No preferred times saved"}
                        </p>
                      </div>

                      <div className="shrink-0 flex flex-wrap gap-2">
                        {(["contacted", "booked", "closed"] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateWaitlistEntry(entry, status)}
                            disabled={savingWaitlistId === entry.id || entry.status === status}
                            className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            {savingWaitlistId === entry.id ? "Saving..." : status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarClock className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">Action required</h2>
            </div>

            {actionRequiredRequests.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="w-6 h-6 text-slate-400" />}
                title="No cancel or reschedule requests"
                description="Booked appointments flagged for cancellation, rescheduling, or no-show handling will appear here."
              />
            ) : (
              <div className="space-y-4">
                {actionRequiredRequests.map((lead) => (
                  <div key={lead.lead_id} className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <p className="text-sm font-semibold text-slate-900">{lead.patient_name}</p>
                      <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${appointmentStatusClass(lead.appointment_status)}`}>
                        {appointmentStatusLabel(lead.appointment_status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{lead.reason_for_visit || "Booked request"}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() =>
                          api.frontdesk
                            .updateLeadOperations(lead.lead_id, { appointment_status: "confirmed" })
                            .then(loadData)
                            .catch((err) =>
                              setError(err instanceof Error ? err.message : "Failed to update request")
                            )
                        }
                        className="px-3 py-2 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                      >
                        Mark confirmed
                      </button>
                      <button
                        onClick={() =>
                          api.frontdesk
                            .updateLeadOperations(lead.lead_id, { appointment_status: "cancelled" })
                            .then(loadData)
                            .catch((err) =>
                              setError(err instanceof Error ? err.message : "Failed to update request")
                            )
                        }
                        className="px-3 py-2 text-sm font-medium text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        Mark cancelled
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-4 h-4 text-violet-600" />
              <h2 className="text-sm font-semibold text-slate-900">Deposit readiness</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Required</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{operations.deposit_summary.required_count}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Pending</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{operations.deposit_summary.pending_count}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Configured</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{operations.deposit_summary.configured_count}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {operations.deposit_summary.note}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
