"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  CalendarClock,
  Loader2,
  PhoneMissed,
  Plus,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { api } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ChannelBadge,
  ChannelConnectionStatusBadge,
  CommunicationEventStatusBadge,
} from "@/components/shared/FrontdeskBadges";
import type {
  ChannelReadiness,
  Clinic,
  CommunicationEvent,
  OperationsLead,
  OperationsOverview,
  ReminderPreview,
  SystemReadinessItem,
  WaitlistEntry,
} from "@/types";

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

function readinessStatusLabel(status: SystemReadinessItem["status"]): string {
  if (status === "configured") return "Configured";
  if (status === "partially_configured") return "Partial";
  if (status === "blocked") return "Blocked";
  return "Missing";
}

function readinessStatusClass(status: SystemReadinessItem["status"]): string {
  if (status === "configured") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "partially_configured") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "blocked") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function readinessScopeLabel(scope: SystemReadinessItem["scope"]): string {
  if (scope === "core") return "Core";
  if (scope === "internal") return "Internal";
  return "Feature";
}

type LeadDraft = {
  appointmentStatus: OperationsLead["appointment_status"];
  appointmentStartsAt: string;
  depositRequired: boolean;
  depositAmountCents: string;
  depositStatus: OperationsLead["deposit_status"];
  reminderNote: string;
};

type CommunicationForm = {
  channel: "missed_call" | "callback_request";
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  summary: string;
  content: string;
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
  const [savingChannelId, setSavingChannelId] = useState("");
  const [sendingReminderId, setSendingReminderId] = useState("");
  const [sendingTextBackId, setSendingTextBackId] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderLeadHours, setReminderLeadHours] = useState("24");
  const [followUpAutomationEnabled, setFollowUpAutomationEnabled] = useState(false);
  const [followUpDelayMinutes, setFollowUpDelayMinutes] = useState("45");
  const [reminderPreview, setReminderPreview] = useState<ReminderPreview[]>([]);
  const [leadDrafts, setLeadDrafts] = useState<Record<string, LeadDraft>>({});
  const [waitlistForm, setWaitlistForm] = useState({
    patient_name: "",
    patient_phone: "",
    patient_email: "",
    service_requested: "",
    preferred_times: "",
    notes: "",
  });
  const [communicationForm, setCommunicationForm] = useState<CommunicationForm>({
    channel: "missed_call",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    summary: "",
    content: "",
  });
  const [savingCommunicationId, setSavingCommunicationId] = useState("");

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
      const clinicData = await api.clinics.getMyClinic();
      if (clinicData.follow_up_automation_enabled) {
        await api.frontdesk.runAutoFollowUps();
      }
      const [operationsData, reminderPreviewData] = await Promise.all([
        api.frontdesk.getOperations(),
        api.frontdesk.getReminderPreview(),
      ]);
      setClinic(clinicData);
      setOperations(operationsData);
      setReminderEnabled(operationsData.reminder_enabled);
      setReminderLeadHours(String(operationsData.reminder_lead_hours));
      setFollowUpAutomationEnabled(operationsData.follow_up_automation_enabled);
      setFollowUpDelayMinutes(String(operationsData.follow_up_delay_minutes));
      setReminderPreview(reminderPreviewData);
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
        follow_up_automation_enabled: followUpAutomationEnabled,
        follow_up_delay_minutes: Number(followUpDelayMinutes) || 45,
      });
      setClinic(updatedClinic);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update reminder settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const saveChannelAutomation = async (
    channel: ChannelReadiness,
    automationEnabled: boolean
  ) => {
    setSavingChannelId(channel.channel);
    try {
      await api.frontdesk.updateChannel(channel.channel, {
        automation_enabled: automationEnabled,
        provider: channel.provider,
        display_name: channel.display_name,
        contact_value: channel.contact_value,
        notes: channel.notes,
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update channel");
    } finally {
      setSavingChannelId("");
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

  const createCommunicationEvent = async () => {
    if (!communicationForm.customer_name.trim() && !communicationForm.customer_phone.trim() && !communicationForm.customer_email.trim()) {
      return;
    }
    setSavingCommunicationId("new");
    try {
      await api.frontdesk.createCommunicationEvent(communicationForm);
      setCommunicationForm({
        channel: "missed_call",
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        summary: "",
        content: "",
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log communication event");
    } finally {
      setSavingCommunicationId("");
    }
  };

  const sendDueReminders = async () => {
    setSendingReminderId("batch");
    try {
      await api.frontdesk.sendDueReminders();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send due reminders");
    } finally {
      setSendingReminderId("");
    }
  };

  const sendReminder = async (leadId: string) => {
    setSendingReminderId(leadId);
    try {
      await api.frontdesk.sendReminder(leadId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reminder");
    } finally {
      setSendingReminderId("");
    }
  };

  const updateCommunicationEvent = async (
    event: CommunicationEvent,
    status: CommunicationEvent["status"]
  ) => {
    setSavingCommunicationId(event.id);
    try {
      await api.frontdesk.updateCommunicationEvent(event.id, { status });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update communication event");
    } finally {
      setSavingCommunicationId("");
    }
  };

  const sendTextBack = async (eventId: string) => {
    setSendingTextBackId(eventId);
    try {
      await api.frontdesk.sendTextBack(eventId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send text-back");
    } finally {
      setSendingTextBackId("");
    }
  };

  const reminderCandidates = operations?.reminder_candidates ?? [];
  const dueReminders = operations?.due_reminders ?? [];
  const actionRequiredRequests = operations?.action_required_requests ?? [];
  const waitlistEntries = operations?.waitlist_entries ?? [];
  const channelReadiness = operations?.channel_readiness ?? [];
  const systemReadiness = operations?.system_readiness;
  const communicationQueue = operations?.communication_queue ?? [];
  const reviewQueue = operations?.review_queue ?? [];
  const recentOutboundMessages = operations?.recent_outbound_messages ?? [];
  const outboundActivity = operations?.outbound_activity;
  const upcomingReminders = reminderPreview.filter((item) => !item.is_due);
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
          Send reminders, recover missed calls, manage cancel or reschedule requests, maintain a waitlist, and keep communication activity visible in one place.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">
          {error}
        </div>
      )}

      {systemReadiness && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">System readiness</h2>
              <p className="text-sm text-slate-500 mt-1">
                This shows which integrations and protected capabilities are ready, partial, missing, or blocked right now.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Configured</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{systemReadiness.configured_count}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Partial</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{systemReadiness.partial_count}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Missing</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{systemReadiness.missing_count}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Blocked</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{systemReadiness.blocked_count}</p>
            </div>
          </div>

          <div className="space-y-3">
            {systemReadiness.items.map((item) => (
              <div key={item.key} className="rounded-xl border border-slate-200 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${readinessStatusClass(item.status)}`}>
                    {readinessStatusLabel(item.status)}
                  </span>
                  <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                    {readinessScopeLabel(item.scope)}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{item.summary}</p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{item.detail}</p>
                {item.action && (
                  <p className="text-xs text-slate-500 mt-3">{item.action}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <PhoneMissed className="w-4 h-4 text-teal-600" />
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Channel readiness</h2>
              <p className="text-sm text-slate-500 mt-1">
                Web chat is live now. SMS can send when Twilio is configured, while the rest of the inbox stays ready for future channels without pretending they are connected.
              </p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {channelReadiness.map((channel: ChannelReadiness) => (
            <div key={channel.channel} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <ChannelBadge channel={channel.channel} withIcon />
                <ChannelConnectionStatusBadge status={channel.connection_status} />
              </div>
              <p className="text-sm font-medium text-slate-900">{channel.display_name}</p>
              <p className="text-xs text-slate-500 mt-1">{channel.provider}</p>
              {channel.contact_value && (
                <p className="text-xs text-slate-500 mt-2">Contact: {channel.contact_value}</p>
              )}
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">{channel.detail}</p>
              {channel.channel === "sms" && channel.connection_status === "connected" && (
                <p className="text-xs text-slate-500 mt-3">
                  Inbound webhook path: <span className="font-mono">/api/frontdesk/communications/twilio/inbound</span>
                </p>
              )}
              {channel.notes && (
                <p className="text-xs text-slate-500 mt-3">{channel.notes}</p>
              )}
              {channel.channel === "sms" && channel.connection_status === "connected" && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={channel.automation_enabled}
                      onChange={(event) => saveChannelAutomation(channel, event.target.checked)}
                      disabled={savingChannelId === channel.channel}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    Enable AI SMS auto-reply
                  </label>
                  <p className="text-xs text-slate-500 mt-2">
                    Incoming SMS can get a real assistant reply when the clinic is live and the thread is not under manual takeover.
                  </p>
                </div>
              )}
              {channel.channel === "missed_call" && channel.connection_status === "connected" && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={channel.automation_enabled}
                      onChange={(event) => saveChannelAutomation(channel, event.target.checked)}
                      disabled={savingChannelId === channel.channel}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    Enable automatic missed-call text-back
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Outbound SMS</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{outboundActivity?.outbound_sms_total ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Real delivery attempts logged through the SMS channel.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Replies</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{outboundActivity?.ai_replies_sent ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Assistant-generated SMS replies successfully sent to patients.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Human Review</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{outboundActivity?.human_review_required ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">SMS threads waiting for staff review before a reply goes out.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested Replies Sent</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{outboundActivity?.suggested_replies_sent ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">AI drafts approved or edited by staff and sent by SMS.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reminders Sent</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{outboundActivity?.reminders_sent ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Booked-request reminders successfully sent by SMS.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Missed-Call Texts</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{outboundActivity?.missed_call_texts_sent ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Recovery texts sent after missed calls.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Manual Takeovers</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{outboundActivity?.manual_takeover_threads ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">SMS threads currently held for staff instead of AI auto-reply.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Failed or Skipped</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {(outboundActivity?.failed_sends ?? 0) + (outboundActivity?.skipped_sends ?? 0)}
          </p>
          <p className="text-sm text-slate-500 mt-1">Review why sending was blocked or failed.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI Reply Failures</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{outboundActivity?.ai_reply_failures ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Assistant replies that could not be sent and still need staff review.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Blocked for Review</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{outboundActivity?.blocked_for_review ?? 0}</p>
          <p className="text-sm text-slate-500 mt-1">Risky or unsupported SMS messages held for staff review.</p>
        </div>
      </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-[auto_10rem] gap-4 mt-5 pt-5 border-t border-slate-100">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={followUpAutomationEnabled}
              onChange={(event) => setFollowUpAutomationEnabled(event.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Enable auto follow-up
          </label>
          <div>
            <p className="text-xs text-slate-500 mb-1.5">Delay before task creation</p>
            <input
              type="number"
              min={5}
              max={1440}
              value={followUpDelayMinutes}
              onChange={(event) => setFollowUpDelayMinutes(event.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Reminder delivery</h2>
            <p className="text-xs text-slate-500 mt-1">
              These reminders are scheduled from real booked requests and your reminder lead time. When SMS is connected, you can send due reminders from here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              {dueReminders.length} due
            </span>
            <button
              onClick={sendDueReminders}
              disabled={sendingReminderId === "batch" || dueReminders.length === 0}
              className="px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {sendingReminderId === "batch" ? "Sending..." : "Send due reminders"}
            </button>
          </div>
        </div>

        {dueReminders.length > 0 && (
          <div className="space-y-3 mb-5">
            {dueReminders.map((item) => (
              <div key={item.lead_id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.patient_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Appointment {formatDateTime(item.appointment_starts_at)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Reminder scheduled for {formatDateTime(item.reminder_scheduled_for)}
                    </p>
                    {item.blocked_reason && (
                      <p className="text-xs text-amber-700 mt-2">{item.blocked_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={item.channel} withIcon />
                    <button
                      onClick={() => sendReminder(item.lead_id)}
                      disabled={sendingReminderId === item.lead_id || !item.can_send}
                      className="px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {sendingReminderId === item.lead_id ? "Sending..." : "Send now"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {upcomingReminders.length === 0 ? (
          <EmptyState
            icon={<BellRing className="w-7 h-7 text-slate-400" />}
            title="No upcoming reminders"
            description="Confirm appointment timing on booked requests and enable reminder prep to build the next reminder schedule."
          />
        ) : (
          <div className="space-y-3">
            {upcomingReminders.map((item) => (
              <div key={item.lead_id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.patient_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Appointment {formatDateTime(item.appointment_starts_at)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Reminder scheduled for {formatDateTime(item.reminder_scheduled_for)}
                    </p>
                  </div>
                  <ChannelBadge channel={item.channel} withIcon />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recovery queue</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Log missed calls and callback requests now. When SMS is connected, recovery texts can be sent from the same queue.
                </p>
              </div>
            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              {communicationQueue.length} active
            </span>
          </div>

          {communicationQueue.length === 0 ? (
            <EmptyState
              icon={<PhoneMissed className="w-7 h-7 text-slate-400" />}
              title="No recovery items right now"
              description="Missed calls and callback requests will appear here once they are logged."
            />
          ) : (
            <div className="space-y-4">
              {communicationQueue.map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <ChannelBadge channel={event.channel} withIcon />
                        {event.channel === "missed_call" && (
                          <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                            Missed call recovery
                          </span>
                        )}
                        {event.operator_review_required && (
                          <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                            Review needed
                          </span>
                        )}
                        {event.manual_takeover ? (
                          <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                            Staff handling
                          </span>
                        ) : event.ai_auto_reply_enabled ? (
                          <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                            AI handling
                          </span>
                        ) : null}
                        {event.latest_inbound_summary && (
                          <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                            Replied
                          </span>
                        )}
                        <CommunicationEventStatusBadge status={event.status} />
                        <span className="text-xs text-slate-500">{event.customer_name}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {event.summary || "Recovery item logged"}
                      </p>
                      {event.content && (
                        <p className="text-sm text-slate-600 mt-1 leading-relaxed">{event.content}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                        {event.customer_phone && <span>{event.customer_phone}</span>}
                        {event.customer_email && <span>{event.customer_email}</span>}
                        {event.occurred_at && <span>{timeAgo(event.occurred_at)}</span>}
                      </div>
                      {event.latest_outbound_status && (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-slate-600">Latest text-back</span>
                            <CommunicationEventStatusBadge status={event.latest_outbound_status as CommunicationEvent["status"]} />
                          </div>
                          {event.latest_outbound_summary && (
                            <p className="text-sm text-slate-700 mt-2">{event.latest_outbound_summary}</p>
                          )}
                          {event.latest_outbound_reason && (
                            <p className="text-xs text-slate-500 mt-1">{event.latest_outbound_reason}</p>
                          )}
                        </div>
                      )}
                      {event.latest_inbound_summary && (
                        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-blue-700">Latest inbound SMS</span>
                            {event.latest_inbound_at && (
                              <span className="text-xs text-blue-700/80">{timeAgo(event.latest_inbound_at)}</span>
                            )}
                          </div>
                          <p className="text-sm text-blue-900 mt-2">{event.latest_inbound_summary}</p>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/inbox/event:${event.thread_key || event.id}`}
                        className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Open thread
                      </Link>
                      {event.channel === "missed_call" && (
                        <button
                          onClick={() => sendTextBack(event.id)}
                          disabled={sendingTextBackId === event.id}
                          className="px-3 py-2 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors disabled:opacity-50"
                        >
                          {sendingTextBackId === event.id ? "Sending..." : "Send text-back"}
                        </button>
                      )}
                      {event.status !== "queued" && (
                        <button
                          onClick={() => updateCommunicationEvent(event, "queued")}
                          disabled={savingCommunicationId === event.id}
                          className="px-3 py-2 text-sm font-medium text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                        >
                          Queue
                        </button>
                      )}
                      {event.status !== "attempted" && event.status !== "completed" && (
                        <button
                          onClick={() => updateCommunicationEvent(event, "attempted")}
                          disabled={savingCommunicationId === event.id}
                          className="px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                        >
                          Attempted
                        </button>
                      )}
                      {event.status !== "completed" && (
                        <button
                          onClick={() => updateCommunicationEvent(event, "completed")}
                          disabled={savingCommunicationId === event.id}
                          className="px-3 py-2 text-sm font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        >
                          Complete
                        </button>
                      )}
                      {event.status !== "dismissed" && (
                        <button
                          onClick={() => updateCommunicationEvent(event, "dismissed")}
                          disabled={savingCommunicationId === event.id}
                          className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-1">Log a recovery item</h2>
          <p className="text-xs text-slate-500 mb-4">
            This records the recovery workflow immediately and can trigger live text-back when SMS is connected.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Type
              </label>
              <select
                value={communicationForm.channel}
                onChange={(event) => setCommunicationForm((current) => ({ ...current, channel: event.target.value as "missed_call" | "callback_request" }))}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                <option value="missed_call">Missed call</option>
                <option value="callback_request">Callback request</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Customer name
              </label>
              <input
                type="text"
                value={communicationForm.customer_name}
                onChange={(event) => setCommunicationForm((current) => ({ ...current, customer_name: event.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="Patient name"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  value={communicationForm.customer_phone}
                  onChange={(event) => setCommunicationForm((current) => ({ ...current, customer_phone: event.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={communicationForm.customer_email}
                  onChange={(event) => setCommunicationForm((current) => ({ ...current, customer_email: event.target.value }))}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  placeholder="patient@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Summary
              </label>
              <input
                type="text"
                value={communicationForm.summary}
                onChange={(event) => setCommunicationForm((current) => ({ ...current, summary: event.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="Why this needs a call or text-back"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Notes
              </label>
              <textarea
                rows={3}
                value={communicationForm.content}
                onChange={(event) => setCommunicationForm((current) => ({ ...current, content: event.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                placeholder="Add context for the front desk team"
              />
            </div>

            <button
              type="button"
              onClick={createCommunicationEvent}
              disabled={savingCommunicationId === "new"}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {savingCommunicationId === "new" ? "Saving..." : "Log recovery item"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">SMS review queue</h2>
            <p className="text-xs text-slate-500 mt-1">
              Lower-confidence replies, blocked messages, and failed AI sends wait here for a team decision.
            </p>
          </div>
          <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {reviewQueue.length} waiting
          </span>
        </div>

        {reviewQueue.length === 0 ? (
          <EmptyState
            icon={<BellRing className="w-6 h-6 text-slate-400" />}
            title="No SMS reviews waiting"
            description="When Clinic AI drafts a reply for staff review, the thread will appear here."
          />
        ) : (
          <div className="space-y-3">
            {reviewQueue.map((event) => (
              <div key={event.id} className="rounded-xl border border-slate-200 px-4 py-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <ChannelBadge channel={event.channel} withIcon />
                      {event.manual_takeover ? (
                        <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                          Staff handling
                        </span>
                      ) : (
                        <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                          Review needed
                        </span>
                      )}
                      {event.ai_confidence && (
                        <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                          {event.ai_confidence} confidence
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-900">{event.customer_name}</p>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{event.content || event.summary}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      {event.auto_reply_reason || "Review this thread before sending a reply."}
                    </p>
                    {event.suggested_reply_text && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-xs font-semibold text-slate-600">AI draft</p>
                        <p className="text-sm text-slate-700 mt-2">{event.suggested_reply_text}</p>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/inbox/event:${event.thread_key || event.id}`}
                    className="px-3 py-2 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                  >
                    Review thread
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Reminder-ready bookings</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Confirm appointment timing, preview the reminder, and keep deposit requirements accurate before the patient arrives.
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
                            <option value="required">Required</option>
                            <option value="requested">Requested</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                            <option value="expired">Expired</option>
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
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Recent outbound SMS</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Live send results appear here when Twilio is connected. Skipped and failed attempts keep their real reason.
                </p>
              </div>
              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {recentOutboundMessages.length} logged
              </span>
            </div>

            {recentOutboundMessages.length === 0 ? (
              <EmptyState
                icon={<BellRing className="w-6 h-6 text-slate-400" />}
                title="No outbound SMS yet"
                description="Reminder sends, manual texts, and missed-call text-backs will appear here once they run."
              />
            ) : (
              <div className="space-y-3">
                {recentOutboundMessages.map((event) => (
                  <div key={event.id} className="rounded-xl border border-slate-200 px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <ChannelBadge channel={event.channel} withIcon />
                      <CommunicationEventStatusBadge status={event.status} />
                      <span className="text-xs text-slate-500">{event.customer_name}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900">{event.summary || "Outbound SMS"}</p>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{event.content}</p>
                    {(event.failure_reason || event.skipped_reason) && (
                      <p className="text-xs text-slate-500 mt-2">{event.failure_reason || event.skipped_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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
              <h2 className="text-sm font-semibold text-slate-900">Deposit tracking</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Required</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{operations.deposit_summary.required_count}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Requested</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{operations.deposit_summary.requested_count}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Paid</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{operations.deposit_summary.paid_count}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Waiting</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{operations.deposit_summary.waiting_count}</p>
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
