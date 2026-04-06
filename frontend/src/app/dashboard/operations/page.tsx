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
import { PageHeader } from "@/components/shared/PageHeader";
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

import {
  toDateTimeLocal,
  toIsoOrNull,
  appointmentStatusLabel,
  appointmentStatusClass,
} from "@/lib/format-helpers";
import { ActionErrorBanner } from "@/components/shared/ActionErrorBanner";

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

  const runAutoFollowUps = async () => {
    setSavingSettings(true);
    try {
      await api.frontdesk.runAutoFollowUps();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run auto follow-ups");
    } finally {
      setSavingSettings(false);
    }
  };

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
      setFollowUpAutomationEnabled(operationsData.follow_up_automation_enabled);
      setFollowUpDelayMinutes(String(operationsData.follow_up_delay_minutes));
      syncLeadDrafts(operationsData);

      try {
        setReminderPreview(await api.frontdesk.getReminderPreview());
      } catch {
        setReminderPreview([]);
      }
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
    <div className="space-y-4">
      <PageHeader
        eyebrow={
          <>
            <ShieldCheck className="h-3.5 w-3.5" />
            Operations board
          </>
        }
        title="Operational visibility"
        description="Reminders, recovery queues, SMS review, waitlist items, and action-required bookings. See what is blocked and what is moving."
      />

      <ActionErrorBanner message={error} onDismiss={() => setError("")} />

      {/* System readiness */}
      {systemReadiness && (
        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            <div>
              <h2 className="text-[13px] font-semibold text-slate-900">System readiness</h2>
              <p className="mt-0.5 text-[12px] text-slate-500">
                This shows which integrations and protected capabilities are ready, partial, missing, or blocked right now.
              </p>
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Configured</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{systemReadiness.configured_count}</p>
            </div>
            <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Partial</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{systemReadiness.partial_count}</p>
            </div>
            <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Missing</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{systemReadiness.missing_count}</p>
            </div>
            <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Blocked</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{systemReadiness.blocked_count}</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {systemReadiness.items.map((item) => (
              <div key={item.key} className="rounded-lg border border-slate-200/60 p-3">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-slate-900">{item.label}</p>
                  <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${readinessStatusClass(item.status)}`}>
                    {readinessStatusLabel(item.status)}
                  </span>
                  <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {readinessScopeLabel(item.scope)}
                  </span>
                </div>
                <p className="text-[12px] text-slate-700">{item.summary}</p>
                <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{item.detail}</p>
                {item.action && (
                  <p className="mt-2.5 text-[10px] text-slate-500">{item.action}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channel readiness */}
      <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <PhoneMissed className="h-4 w-4 text-teal-600" />
          <div>
            <h2 className="text-[13px] font-semibold text-slate-900">Channel readiness</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Web chat is live now. SMS can send when Twilio is configured, while the rest of the inbox stays ready for future channels without pretending they are connected.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {channelReadiness.map((channel: ChannelReadiness) => (
            <div key={channel.channel} className="rounded-lg border border-slate-200/60 p-3">
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <ChannelBadge channel={channel.channel} withIcon />
                <ChannelConnectionStatusBadge status={channel.connection_status} />
              </div>
              <p className="text-[13px] font-medium text-slate-900">{channel.display_name}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{channel.provider}</p>
              {channel.contact_value && (
                <p className="mt-1.5 text-[10px] text-slate-500">Contact: {channel.contact_value}</p>
              )}
              <p className="mt-2.5 text-[12px] leading-relaxed text-slate-600">{channel.detail}</p>
              {channel.channel === "sms" && channel.connection_status === "connected" && (
                <p className="mt-2.5 text-[10px] text-slate-500">
                  Inbound webhook path: <span className="font-mono">/api/frontdesk/communications/twilio/inbound</span>
                </p>
              )}
              {channel.notes && (
                <p className="mt-2.5 text-[10px] text-slate-500">{channel.notes}</p>
              )}
              {channel.channel === "sms" && channel.connection_status === "connected" && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <label className="inline-flex items-center gap-2 text-[12px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={channel.automation_enabled}
                      onChange={(event) => saveChannelAutomation(channel, event.target.checked)}
                      disabled={savingChannelId === channel.channel}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Enable AI SMS auto-reply</span>
                  </label>
                  <p className="mt-1.5 text-[10px] text-slate-500">
                    Incoming SMS can get a real assistant reply when the clinic is live and the thread is not under manual takeover.
                  </p>
                </div>
              )}
              {channel.channel === "missed_call" && channel.connection_status === "connected" && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <label className="inline-flex items-center gap-2 text-[12px] text-slate-700">
                    <input
                      type="checkbox"
                      checked={channel.automation_enabled}
                      onChange={(event) => saveChannelAutomation(channel, event.target.checked)}
                      disabled={savingChannelId === channel.channel}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Enable automatic missed-call text-back</span>
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Outbound activity metrics */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Outbound SMS</p>
          <p className="mt-1.5 text-lg font-bold text-slate-900">{outboundActivity?.outbound_sms_total ?? 0}</p>
          <p className="mt-1 text-[10px] text-slate-500">Real delivery attempts logged through the SMS channel.</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">AI Replies</p>
          <p className="mt-1.5 text-lg font-bold text-slate-900">{outboundActivity?.ai_replies_sent ?? 0}</p>
          <p className="mt-1 text-[10px] text-slate-500">Assistant-generated SMS replies successfully sent to patients.</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Human Review</p>
          <p className="mt-1.5 text-lg font-bold text-slate-900">{outboundActivity?.human_review_required ?? 0}</p>
          <p className="mt-1 text-[10px] text-slate-500">SMS threads waiting for staff review before a reply goes out.</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Suggested Sent</p>
          <p className="mt-1.5 text-lg font-bold text-slate-900">{outboundActivity?.suggested_replies_sent ?? 0}</p>
          <p className="mt-1 text-[10px] text-slate-500">AI drafts approved or edited by staff and sent by SMS.</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Reminders Sent</p>
          <p className="mt-1.5 text-lg font-bold text-slate-900">{outboundActivity?.reminders_sent ?? 0}</p>
          <p className="mt-1 text-[10px] text-slate-500">Booked-request reminders successfully sent by SMS.</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Missed-Call Texts</p>
          <p className="mt-1.5 text-lg font-bold text-slate-900">{outboundActivity?.missed_call_texts_sent ?? 0}</p>
          <p className="mt-1 text-[10px] text-slate-500">Recovery texts sent after missed calls.</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Manual Takeovers</p>
          <p className="mt-1.5 text-lg font-bold text-slate-900">{outboundActivity?.manual_takeover_threads ?? 0}</p>
          <p className="mt-1 text-[10px] text-slate-500">SMS threads currently held for staff instead of AI auto-reply.</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Failed or Skipped</p>
          <p className="mt-1.5 text-lg font-bold text-slate-900">
            {(outboundActivity?.failed_sends ?? 0) + (outboundActivity?.skipped_sends ?? 0)}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">Review why sending was blocked or failed.</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">AI Reply Failures</p>
          <p className="mt-1.5 text-lg font-bold text-slate-900">{outboundActivity?.ai_reply_failures ?? 0}</p>
          <p className="mt-1 text-[10px] text-slate-500">Assistant replies that could not be sent and still need staff review.</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Blocked for Review</p>
          <p className="mt-1.5 text-lg font-bold text-slate-900">{outboundActivity?.blocked_for_review ?? 0}</p>
          <p className="mt-1 text-[10px] text-slate-500">Risky or unsupported SMS messages held for staff review.</p>
        </div>
      </div>

      {/* Reminder settings */}
      <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-teal-600" />
              <h2 className="text-[13px] font-semibold text-slate-900">Reminder settings</h2>
            </div>
            <p className="text-[12px] text-slate-500">
              Reminder delivery is not automated yet. These settings prepare confirmed bookings and generate a real preview schedule for the next delivery pass.
            </p>
          </div>

          <div className="grid grid-cols-1 items-center gap-2.5 sm:grid-cols-[auto_9rem_auto]">
            <label className="inline-flex items-center gap-2 text-[12px] text-slate-700">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(event) => setReminderEnabled(event.target.checked)}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>Enable reminder prep</span>
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={reminderLeadHours}
              onChange={(event) => setReminderLeadHours(event.target.value)}
              placeholder="Lead hours"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
            <button
              onClick={saveReminderSettings}
              disabled={savingSettings}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              {savingSettings ? "Saving..." : "Save settings"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 lg:grid-cols-[auto_10rem]">
          <label className="inline-flex items-center gap-2 text-[12px] text-slate-700">
            <input
              type="checkbox"
              checked={followUpAutomationEnabled}
              onChange={(event) => setFollowUpAutomationEnabled(event.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>Enable auto follow-up</span>
          </label>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Delay before task creation</p>
            <input
              type="number"
              min={5}
              max={1440}
              value={followUpDelayMinutes}
              onChange={(event) => setFollowUpDelayMinutes(event.target.value)}
              placeholder="Minutes"
              className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
            />
          </div>
          {followUpAutomationEnabled && (
            <button
              onClick={runAutoFollowUps}
              disabled={savingSettings}
              className="mt-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-[12px] font-semibold text-teal-700 transition-colors hover:bg-teal-100 disabled:opacity-50"
            >
              {savingSettings ? "Running..." : "Run follow-ups now"}
            </button>
          )}
        </div>
      </div>

      {/* Reminder delivery */}
      <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-semibold text-slate-900">Reminder delivery</h2>
            <p className="mt-0.5 text-[10px] text-slate-500">
              These reminders are scheduled from real booked requests and your reminder lead time. When SMS is connected, you can send due reminders from here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              {dueReminders.length} due
            </span>
            <button
              onClick={sendDueReminders}
              disabled={sendingReminderId === "batch" || dueReminders.length === 0}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              {sendingReminderId === "batch" ? "Sending..." : "Send due reminders"}
            </button>
          </div>
        </div>

        {dueReminders.length > 0 && (
          <div className="mb-4 space-y-2.5">
            {dueReminders.map((item) => (
              <div key={item.lead_id} className="rounded-lg border border-slate-200/60 p-3">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">{item.patient_name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Appointment {formatDateTime(item.appointment_starts_at)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Reminder scheduled for {formatDateTime(item.reminder_scheduled_for)}
                    </p>
                    {item.blocked_reason && (
                      <p className="mt-1.5 text-[10px] text-amber-700">{item.blocked_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <ChannelBadge channel={item.channel} withIcon />
                    <button
                      onClick={() => sendReminder(item.lead_id)}
                      disabled={sendingReminderId === item.lead_id || !item.can_send}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
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
            icon={<BellRing className="h-7 w-7 text-slate-400" />}
            title="No upcoming reminders"
            description="Reminders will appear here once booked appointments have confirmed timing and reminder prep is enabled."
          />
        ) : (
          <div className="space-y-2.5">
            {upcomingReminders.map((item) => (
              <div key={item.lead_id} className="rounded-lg border border-slate-200/60 p-3">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">{item.patient_name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      Appointment {formatDateTime(item.appointment_starts_at)}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
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

      {/* Recovery queue + Log form */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-semibold text-slate-900">Recovery queue</h2>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Log missed calls and callback requests now. When SMS is connected, recovery texts can be sent from the same queue.
              </p>
            </div>
            <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              {communicationQueue.length} active
            </span>
          </div>

          {communicationQueue.length === 0 ? (
            <EmptyState
              icon={<PhoneMissed className="h-7 w-7 text-slate-400" />}
              title="No recovery items"
              description="Missed calls and callback requests will appear here as they are logged."
            />
          ) : (
            <div className="space-y-3">
              {communicationQueue.map((event) => (
                <div key={event.id} className="rounded-lg border border-slate-200/60 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        <ChannelBadge channel={event.channel} withIcon />
                        {event.channel === "missed_call" && (
                          <span className="inline-flex rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                            Missed call recovery
                          </span>
                        )}
                        {event.operator_review_required && (
                          <span className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            Review needed
                          </span>
                        )}
                        {event.manual_takeover && (
                          <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            Staff handling
                          </span>
                        )}
                        {!event.manual_takeover && event.ai_auto_reply_enabled && (
                          <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            AI handling
                          </span>
                        )}
                        {event.latest_inbound_summary && (
                          <span className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            Replied
                          </span>
                        )}
                        <CommunicationEventStatusBadge status={event.status} />
                        <span className="text-[10px] text-slate-500">{event.customer_name}</span>
                      </div>
                      <p className="text-[13px] font-medium text-slate-900">
                        {event.summary || "Recovery item logged"}
                      </p>
                      {event.content && (
                        <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">{event.content}</p>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-[10px] text-slate-500">
                        {event.customer_phone && <span>{event.customer_phone}</span>}
                        {event.customer_email && <span>{event.customer_email}</span>}
                        {event.occurred_at && <span>{timeAgo(event.occurred_at)}</span>}
                      </div>
                      {event.latest_outbound_status && (
                        <div className="mt-2.5 rounded-lg border border-slate-200/60 bg-slate-50/60 px-2.5 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-600">Latest text-back</span>
                            <CommunicationEventStatusBadge status={event.latest_outbound_status as CommunicationEvent["status"]} />
                          </div>
                          {event.latest_outbound_summary && (
                            <p className="mt-1.5 text-[12px] text-slate-700">{event.latest_outbound_summary}</p>
                          )}
                          {event.latest_outbound_reason && (
                            <p className="mt-0.5 text-[10px] text-slate-500">{event.latest_outbound_reason}</p>
                          )}
                        </div>
                      )}
                      {event.latest_inbound_summary && (
                        <div className="mt-2.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-semibold text-blue-700">Latest inbound SMS</span>
                            {event.latest_inbound_at && (
                              <span className="text-[10px] text-blue-700/80">{timeAgo(event.latest_inbound_at)}</span>
                            )}
                          </div>
                          <p className="mt-1.5 text-[12px] text-blue-900">{event.latest_inbound_summary}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <Link
                        href={`/dashboard/inbox/event:${event.thread_key || event.id}`}
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Open thread
                      </Link>
                      {event.channel === "missed_call" && (
                        <button
                          onClick={() => sendTextBack(event.id)}
                          disabled={sendingTextBackId === event.id}
                          className="rounded-lg border border-teal-200 px-2.5 py-1.5 text-[12px] font-semibold text-teal-700 transition-colors hover:bg-teal-50 disabled:opacity-50"
                        >
                          {sendingTextBackId === event.id ? "Sending..." : "Send text-back"}
                        </button>
                      )}
                      {event.status !== "queued" && (
                        <button
                          onClick={() => updateCommunicationEvent(event, "queued")}
                          disabled={savingCommunicationId === event.id}
                          className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
                        >
                          Queue
                        </button>
                      )}
                      {event.status !== "attempted" && event.status !== "completed" && (
                        <button
                          onClick={() => updateCommunicationEvent(event, "attempted")}
                          disabled={savingCommunicationId === event.id}
                          className="rounded-lg border border-blue-200 px-2.5 py-1.5 text-[12px] font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
                        >
                          Attempted
                        </button>
                      )}
                      {event.status !== "completed" && (
                        <button
                          onClick={() => updateCommunicationEvent(event, "completed")}
                          disabled={savingCommunicationId === event.id}
                          className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[12px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Complete
                        </button>
                      )}
                      {event.status !== "dismissed" && (
                        <button
                          onClick={() => updateCommunicationEvent(event, "dismissed")}
                          disabled={savingCommunicationId === event.id}
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
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

        <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
          <h2 className="text-[13px] font-bold text-slate-900">Log a recovery item</h2>
          <p className="mt-0.5 text-[10px] text-slate-400">
            This records the recovery workflow immediately and can trigger live text-back when SMS is connected.
          </p>

          <div className="mt-3 space-y-2.5">
            <div>
              <label htmlFor="comm-type" className="mb-1 block text-[11px] font-semibold text-slate-500">Type</label>
              <select
                id="comm-type"
                value={communicationForm.channel}
                onChange={(event) => setCommunicationForm((current) => ({ ...current, channel: event.target.value as "missed_call" | "callback_request" }))}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
              >
                <option value="missed_call">Missed call</option>
                <option value="callback_request">Callback request</option>
              </select>
            </div>

            <div>
              <label htmlFor="comm-name" className="mb-1 block text-[11px] font-semibold text-slate-500">Customer name</label>
              <input
                id="comm-name"
                type="text"
                value={communicationForm.customer_name}
                onChange={(event) => setCommunicationForm((current) => ({ ...current, customer_name: event.target.value }))}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                placeholder="Patient name"
              />
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label htmlFor="comm-phone" className="mb-1 block text-[11px] font-semibold text-slate-500">Phone</label>
                <input
                  id="comm-phone"
                  type="tel"
                  value={communicationForm.customer_phone}
                  onChange={(event) => setCommunicationForm((current) => ({ ...current, customer_phone: event.target.value }))}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label htmlFor="comm-email" className="mb-1 block text-[11px] font-semibold text-slate-500">Email</label>
                <input
                  id="comm-email"
                  type="email"
                  value={communicationForm.customer_email}
                  onChange={(event) => setCommunicationForm((current) => ({ ...current, customer_email: event.target.value }))}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                  placeholder="patient@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="comm-summary" className="mb-1 block text-[11px] font-semibold text-slate-500">Summary</label>
              <input
                id="comm-summary"
                type="text"
                value={communicationForm.summary}
                onChange={(event) => setCommunicationForm((current) => ({ ...current, summary: event.target.value }))}
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                placeholder="Why this needs a call or text-back"
              />
            </div>

            <div>
              <label htmlFor="comm-notes" className="mb-1 block text-[11px] font-semibold text-slate-500">Notes</label>
              <textarea
                id="comm-notes"
                rows={3}
                value={communicationForm.content}
                onChange={(event) => setCommunicationForm((current) => ({ ...current, content: event.target.value }))}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                placeholder="Add context for the front desk team"
              />
            </div>

            <button
              type="button"
              onClick={createCommunicationEvent}
              disabled={savingCommunicationId === "new"}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {savingCommunicationId === "new" ? "Saving..." : "Log recovery item"}
            </button>
          </div>
        </div>
      </div>

      {/* SMS review queue */}
      <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-semibold text-slate-900">SMS review queue</h2>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Lower-confidence replies, blocked messages, and failed AI sends wait here for a team decision.
            </p>
          </div>
          <span className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            {reviewQueue.length} waiting
          </span>
        </div>

        {reviewQueue.length === 0 ? (
          <EmptyState
            icon={<BellRing className="h-6 w-6 text-slate-400" />}
            title="No SMS reviews pending"
            description="When the assistant drafts a reply that needs staff approval, the thread will appear here."
          />
        ) : (
          <div className="space-y-2.5">
            {reviewQueue.map((event) => (
              <div key={event.id} className="rounded-lg border border-slate-200/60 p-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <ChannelBadge channel={event.channel} withIcon />
                      {event.manual_takeover ? (
                        <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Staff handling
                        </span>
                      ) : (
                        <span className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          Review needed
                        </span>
                      )}
                      {event.ai_confidence && (
                        <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {event.ai_confidence} confidence
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] font-semibold text-slate-900">{event.customer_name}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">{event.content || event.summary}</p>
                    <p className="mt-1.5 text-[10px] text-slate-500">
                      {event.auto_reply_reason || "Review this thread before sending a reply."}
                    </p>
                    {event.suggested_reply_text && (
                      <div className="mt-2.5 rounded-lg border border-slate-200/60 bg-slate-50/60 px-2.5 py-2.5">
                        <p className="text-[10px] font-semibold text-slate-600">AI draft</p>
                        <p className="mt-1.5 text-[12px] text-slate-700">{event.suggested_reply_text}</p>
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/inbox/event:${event.thread_key || event.id}`}
                    className="rounded-lg border border-teal-200 px-2.5 py-1.5 text-[12px] font-semibold text-teal-700 transition-colors hover:bg-teal-50"
                  >
                    Review thread
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom two-column: Bookings + Waitlist | Outbound + Action + Deposits */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          {/* Reminder-ready bookings */}
          <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-semibold text-slate-900">Reminder-ready bookings</h2>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Confirm appointment timing, preview the reminder, and keep deposit requirements accurate before the patient arrives.
                </p>
              </div>
              <span className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                {reminderCandidates.length} bookings
              </span>
            </div>

            {reminderCandidates.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-7 w-7 text-slate-400" />}
                title="No booked requests yet"
                description="Booked appointments will appear here so you can manage reminders, timing, and deposit tracking."
              />
            ) : (
              <div className="space-y-3">
                {reminderCandidates.map((lead) => {
                  const draft = leadDrafts[lead.lead_id] ?? draftFromLead(lead);

                  return (
                    <div key={lead.lead_id} className="rounded-lg border border-slate-200/60 p-3">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <p className="text-[13px] font-semibold text-slate-900">{lead.patient_name}</p>
                            <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${appointmentStatusClass(lead.appointment_status)}`}>
                              {appointmentStatusLabel(lead.appointment_status)}
                            </span>
                          </div>
                          <p className="text-[12px] text-slate-600">{lead.reason_for_visit || "Booked request"}</p>
                          <p className="mt-1.5 text-[10px] text-slate-500">
                            Last updated {lead.updated_at ? timeAgo(lead.updated_at) : "recently"}
                          </p>
                        </div>

                        <div className="shrink-0 text-[10px] text-slate-500">
                          {lead.reminder_scheduled_for
                            ? `Reminder target: ${formatDateTime(lead.reminder_scheduled_for)}`
                            : "No reminder schedule yet"}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                        <div>
                          <label htmlFor={`appt-time-${lead.lead_id}`} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                            Appointment time
                          </label>
                          <input
                            id={`appt-time-${lead.lead_id}`}
                            type="datetime-local"
                            value={draft.appointmentStartsAt}
                            onChange={(event) => updateLeadDraft(lead.lead_id, { appointmentStartsAt: event.target.value })}
                            title="Appointment date and time"
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
                          />
                        </div>

                        <div>
                          <label htmlFor={`booking-state-${lead.lead_id}`} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                            Booking state
                          </label>
                          <select
                            id={`booking-state-${lead.lead_id}`}
                            value={draft.appointmentStatus}
                            onChange={(event) =>
                              updateLeadDraft(lead.lead_id, {
                                appointmentStatus: event.target.value as LeadDraft["appointmentStatus"],
                              })
                            }
                            title="Booking state"
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
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

                      <div className="mt-3 grid items-end gap-2.5 md:grid-cols-[auto_10rem_10rem]">
                        <label className="inline-flex items-center gap-2 text-[12px] text-slate-700">
                          <input
                            type="checkbox"
                            checked={draft.depositRequired}
                            onChange={(event) =>
                              updateLeadDraft(lead.lead_id, { depositRequired: event.target.checked })
                            }
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span>Require deposit later</span>
                        </label>

                        <div>
                          <label htmlFor={`deposit-amt-${lead.lead_id}`} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                            Deposit amount
                          </label>
                          <input
                            id={`deposit-amt-${lead.lead_id}`}
                            type="number"
                            min={0}
                            step={100}
                            value={draft.depositAmountCents}
                            onChange={(event) =>
                              updateLeadDraft(lead.lead_id, { depositAmountCents: event.target.value })
                            }
                            disabled={!draft.depositRequired}
                            placeholder="e.g. 5000"
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
                          />
                        </div>

                        <div>
                          <label htmlFor={`deposit-state-${lead.lead_id}`} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                            Deposit state
                          </label>
                          <select
                            id={`deposit-state-${lead.lead_id}`}
                            value={draft.depositRequired ? draft.depositStatus : "not_required"}
                            onChange={(event) =>
                              updateLeadDraft(lead.lead_id, {
                                depositStatus: event.target.value as LeadDraft["depositStatus"],
                              })
                            }
                            disabled={!draft.depositRequired}
                            title="Deposit state"
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100 disabled:bg-slate-50"
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

                      <div className="mt-3 rounded-lg border border-slate-200/60 bg-slate-50/60 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                          Reminder preview
                        </p>
                        <p className="mt-1 text-[12px] leading-relaxed text-slate-700">
                          {lead.reminder_preview
                            ? lead.reminder_preview
                            : "Set a confirmed appointment time to generate a reminder preview."}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <button
                          onClick={() => saveLeadOperations(lead.lead_id)}
                          disabled={savingLeadId === lead.lead_id}
                          className="rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
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

          {/* Waitlist */}
          <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-semibold text-slate-900">Waitlist</h2>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Capture patients you want to circle back to when availability opens up.
                </p>
              </div>
              <div className="flex gap-1.5 text-[12px]">
                <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                  {waitlistSummary.waiting} waiting
                </span>
                <span className="inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                  {waitlistSummary.contacted} contacted
                </span>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              <input
                type="text"
                value={waitlistForm.patient_name}
                onChange={(event) => setWaitlistForm((current) => ({ ...current, patient_name: event.target.value }))}
                placeholder="Patient name"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
              <input
                type="text"
                value={waitlistForm.patient_phone}
                onChange={(event) => setWaitlistForm((current) => ({ ...current, patient_phone: event.target.value }))}
                placeholder="Phone"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
              <input
                type="email"
                value={waitlistForm.patient_email}
                onChange={(event) => setWaitlistForm((current) => ({ ...current, patient_email: event.target.value }))}
                placeholder="Email"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
              <input
                type="text"
                value={waitlistForm.service_requested}
                onChange={(event) => setWaitlistForm((current) => ({ ...current, service_requested: event.target.value }))}
                placeholder="Requested service"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
              <input
                type="text"
                value={waitlistForm.preferred_times}
                onChange={(event) => setWaitlistForm((current) => ({ ...current, preferred_times: event.target.value }))}
                placeholder="Preferred times"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100 md:col-span-2"
              />
              <textarea
                value={waitlistForm.notes}
                onChange={(event) => setWaitlistForm((current) => ({ ...current, notes: event.target.value }))}
                rows={3}
                placeholder="Notes"
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] placeholder:text-slate-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-100 md:col-span-2"
              />
            </div>

            <button
              onClick={createWaitlistEntry}
              disabled={savingWaitlistId === "new" || !waitlistForm.patient_name.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
            >
              {savingWaitlistId === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add to waitlist
            </button>

            <div className="mt-4 space-y-2.5">
              {waitlistEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 px-4 py-5 text-center text-[12px] text-slate-500">
                  No waitlist entries yet. Use the form above to add patients waiting for an opening.
                </div>
              ) : (
                waitlistEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-200/60 p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="text-[13px] font-semibold text-slate-900">{entry.patient_name}</p>
                          <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            {entry.status}
                          </span>
                        </div>
                        <p className="text-[12px] text-slate-600">
                          {entry.service_requested || "General waitlist request"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {entry.preferred_times || "No preferred times saved"}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-1.5">
                        {(["contacted", "booked", "closed"] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => updateWaitlistEntry(entry, status)}
                            disabled={savingWaitlistId === entry.id || entry.status === status}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
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

        <div className="space-y-4">
          {/* Recent outbound SMS */}
          <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[13px] font-semibold text-slate-900">Recent outbound SMS</h2>
                <p className="mt-0.5 text-[10px] text-slate-500">
                  Live send results appear here when Twilio is connected. Skipped and failed attempts keep their real reason.
                </p>
              </div>
              <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                {recentOutboundMessages.length} logged
              </span>
            </div>

            {recentOutboundMessages.length === 0 ? (
              <EmptyState
                icon={<BellRing className="h-6 w-6 text-slate-400" />}
                title="No outbound SMS yet"
                description="Reminder sends, manual texts, and missed-call text-backs will appear here once they run."
              />
            ) : (
              <div className="space-y-2.5">
                {recentOutboundMessages.map((event) => (
                  <div key={event.id} className="rounded-lg border border-slate-200/60 p-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <ChannelBadge channel={event.channel} withIcon />
                      <CommunicationEventStatusBadge status={event.status} />
                      <span className="text-[10px] text-slate-500">{event.customer_name}</span>
                    </div>
                    <p className="text-[13px] font-medium text-slate-900">{event.summary || "Outbound SMS"}</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">{event.content}</p>
                    {(event.failure_reason || event.skipped_reason) && (
                      <p className="mt-1.5 text-[10px] text-slate-500">{event.failure_reason || event.skipped_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action required */}
          <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-600" />
              <h2 className="text-[13px] font-semibold text-slate-900">Action required</h2>
            </div>

            {actionRequiredRequests.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-6 w-6 text-slate-400" />}
                title="No cancel or reschedule requests"
                description="Booked appointments flagged for cancellation, rescheduling, or no-show handling will appear here."
              />
            ) : (
              <div className="space-y-3">
                {actionRequiredRequests.map((lead) => (
                  <div key={lead.lead_id} className="rounded-lg border border-slate-200/60 p-3">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold text-slate-900">{lead.patient_name}</p>
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${appointmentStatusClass(lead.appointment_status)}`}>
                        {appointmentStatusLabel(lead.appointment_status)}
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-600">{lead.reason_for_visit || "Booked request"}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button
                        onClick={() =>
                          api.frontdesk
                            .updateLeadOperations(lead.lead_id, { appointment_status: "confirmed" })
                            .then(loadData)
                            .catch((err) =>
                              setError(err instanceof Error ? err.message : "Failed to update request")
                            )
                        }
                        className="rounded-lg border border-teal-200 px-2.5 py-1.5 text-[12px] font-semibold text-teal-700 transition-colors hover:bg-teal-50"
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
                        className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-[12px] font-semibold text-rose-700 transition-colors hover:bg-rose-50"
                      >
                        Mark cancelled
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deposit tracking */}
          <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-violet-600" />
              <h2 className="text-[13px] font-semibold text-slate-900">Deposit tracking</h2>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Required</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{operations.deposit_summary.required_count}</p>
              </div>
              <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Requested</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{operations.deposit_summary.requested_count}</p>
              </div>
              <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Paid</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{operations.deposit_summary.paid_count}</p>
              </div>
              <div className="rounded-lg border border-slate-200/60 bg-slate-50/60 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Waiting</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{operations.deposit_summary.waiting_count}</p>
              </div>
            </div>
            <p className="text-[12px] leading-relaxed text-slate-600">
              {operations.deposit_summary.note}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
