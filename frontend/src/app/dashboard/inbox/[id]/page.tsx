"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock3,
  Mail,
  MessageSquare,
  Phone,
  UserRound,
} from "lucide-react";

import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageHeader } from "@/components/shared/PageHeader";
import { ChannelBadge, CommunicationEventStatusBadge, FrontdeskStatusBadge } from "@/components/shared/FrontdeskBadges";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import type { ConversationDetail } from "@/types";

function smsSenderLabel(senderKind: string, direction: string): string {
  if (direction === "inbound") return "Patient";
  if (senderKind === "assistant") return "AI assistant";
  if (senderKind === "system") return "System";
  return "Team member";
}

function smsEventTitle(senderKind: string, eventType: string): string {
  if (eventType === "reminder") return "Appointment reminder";
  if (eventType === "text_back") return "Missed-call text-back";
  if (senderKind === "assistant") return "AI SMS reply";
  if (senderKind === "staff") return "Manual SMS reply";
  if (senderKind === "system") return "System SMS";
  return "SMS activity";
}

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

function formatAppointmentText(dateValue: string, timeValue: string): string {
  const combined = combineDateTime(dateValue, timeValue);
  if (!combined) return "";
  return new Date(combined).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function InboxThreadPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
  const router = useRouter();
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingAction, setSavingAction] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [reviewReplyBody, setReviewReplyBody] = useState("");
  const [convertName, setConvertName] = useState("");
  const [convertPhone, setConvertPhone] = useState("");
  const [convertEmail, setConvertEmail] = useState("");
  const [convertReason, setConvertReason] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingReason, setBookingReason] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const loadConversation = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.frontdesk.getConversation(id);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  const isEventThread = detail?.thread_type === "event" && !!detail.communication_event;
  const relatedEvents = detail?.related_events ?? [];
  const pendingReviewEvent = isEventThread
    ? [...relatedEvents].reverse().find(
        (event) =>
          event.channel === "sms" &&
          event.direction === "inbound" &&
          event.operator_review_required
      ) ?? null
    : null;
  const latestSmsInboundEvent = isEventThread
    ? [...relatedEvents].reverse().find(
        (event) => event.channel === "sms" && event.direction === "inbound"
      ) ?? null
    : null;

  useEffect(() => {
    setReviewReplyBody(pendingReviewEvent?.suggested_reply_text ?? "");
  }, [pendingReviewEvent?.id, pendingReviewEvent?.suggested_reply_text]);

  useEffect(() => {
    if (!detail) return;
    const nextLead = detail.lead;
    setConvertName(
      (nextLead?.patient_name && nextLead.patient_name !== "Website chat visitor"
        ? nextLead.patient_name
        : detail.conversation.customer_name && detail.conversation.customer_name !== "Visitor"
          ? detail.conversation.customer_name
          : "") || ""
    );
    setConvertPhone(nextLead?.patient_phone || detail.conversation.customer_phone || "");
    setConvertEmail(nextLead?.patient_email || detail.conversation.customer_email || "");
    setConvertReason(nextLead?.reason_for_visit || detail.conversation.summary || "");
    setBookingDate(toDateInputValue(nextLead?.appointment_starts_at));
    setBookingTime(toTimeInputValue(nextLead?.appointment_starts_at));
    setBookingReason(nextLead?.reason_for_visit || "");
    setBookingNote("");
    setInternalNote("");
  }, [detail]);

  if (loading) return <LoadingState message="Loading conversation..." />;
  if (error) return <ErrorState message={error} onRetry={loadConversation} />;
  if (!detail) {
    return <ErrorState title="Not found" message="This conversation could not be found." />;
  }

  const { conversation, lead, messages, communication_event } = detail;
  const communicationEvent = communication_event ?? null;
  const internalNotes = relatedEvents.filter(
    (event) => event.event_type === "note" && event.direction === "internal"
  );
  const bookingSummary =
    lead?.appointment_status === "confirmed" && lead.appointment_starts_at
      ? formatDateTime(lead.appointment_starts_at)
      : "";

  const createFollowUp = async () => {
    setSavingAction("follow_up");
    try {
      await api.frontdesk.createFollowUp({
        source_key: isEventThread
          ? `communication:${communicationEvent?.id ?? id}`
          : `thread:${conversation.id}`,
        task_type: conversation.unlinked ? "abandoned_conversation" : "follow_up_needed",
        priority:
          isEventThread && communicationEvent?.channel === "missed_call"
            ? "high"
            : conversation.derived_status === "needs_follow_up"
              ? "high"
              : "medium",
        title:
          isEventThread && communicationEvent?.channel === "missed_call"
            ? "Missed call recovery"
            : "Manual follow-up created from inbox",
        detail:
          communicationEvent?.summary ||
          conversation.summary ||
          conversation.last_message_preview,
        customer_key: conversation.customer_key ?? null,
        customer_name: conversation.customer_name,
        lead_id: lead?.id ?? null,
        conversation_id: detail.thread_type === "conversation" ? conversation.id : null,
      });
      if (isEventThread && communicationEvent && communicationEvent.status === "new") {
        await api.frontdesk.updateCommunicationEvent(communicationEvent.id, { status: "queued" });
      }
      await loadConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create follow-up");
    } finally {
      setSavingAction("");
    }
  };

  const convertToLead = async () => {
    setSavingAction("convert");
    try {
      await api.frontdesk.convertConversationToLead(id, {
        patient_name: convertName || undefined,
        patient_phone: convertPhone || undefined,
        patient_email: convertEmail || undefined,
        reason_for_visit: convertReason || undefined,
      });
      await loadConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert conversation to a lead");
    } finally {
      setSavingAction("");
    }
  };

  const sendSms = async () => {
    if (!conversation.customer_phone.trim() || !smsBody.trim()) return;
    setSavingAction("sms");
    try {
      await api.frontdesk.sendSms({
        customer_name: conversation.customer_name,
        customer_phone: conversation.customer_phone,
        customer_email: conversation.customer_email,
        body: smsBody,
        lead_id: lead?.id ?? null,
        conversation_id: detail.thread_type === "conversation" ? conversation.id : null,
        source_event_id:
          pendingReviewEvent?.id ??
          latestSmsInboundEvent?.id ??
          (isEventThread ? communicationEvent?.id : undefined),
        follow_up_task_id: communicationEvent?.follow_up_task_id ?? null,
      });
      setSmsBody("");
      await loadConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send SMS");
    } finally {
      setSavingAction("");
    }
  };

  const updateThreadControl = async (manualTakeover: boolean) => {
    setSavingAction(manualTakeover ? "takeover" : "resume_ai");
    try {
      await api.frontdesk.updateThreadControl(id, { manual_takeover: manualTakeover });
      await loadConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update thread control");
    } finally {
      setSavingAction("");
    }
  };

  const sendSuggestedReply = async () => {
    if (!pendingReviewEvent) return;
    const body = reviewReplyBody.trim();
    if (!body) return;
    setSavingAction("send_suggested");
    try {
      await api.frontdesk.sendSuggestedReply(
        pendingReviewEvent.id,
        body === pendingReviewEvent.suggested_reply_text ? {} : { body }
      );
      await loadConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send suggested reply");
    } finally {
      setSavingAction("");
    }
  };

  const discardSuggestedReply = async () => {
    if (!pendingReviewEvent) return;
    setSavingAction("discard_suggested");
    try {
      await api.frontdesk.discardSuggestedReply(pendingReviewEvent.id);
      await loadConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discard suggested reply");
    } finally {
      setSavingAction("");
    }
  };

  const updateThreadStatus = async (status: "contacted" | "closed") => {
    if (!lead) return;
    setSavingAction(status);
    try {
      await api.frontdesk.updateThreadWorkflow(id, { status });
      await loadConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update thread");
    } finally {
      setSavingAction("");
    }
  };

  const bookFromThread = async () => {
    if (!lead) return;
    const appointment_starts_at = combineDateTime(bookingDate, bookingTime);
    if (!appointment_starts_at) {
      setError("Add an appointment date and time before marking this request as booked.");
      return;
    }
    setSavingAction("book_thread");
    try {
      await api.frontdesk.updateThreadWorkflow(id, {
        status: "booked",
        appointment_starts_at,
        reason_for_visit: bookingReason || undefined,
        preferred_datetime_text: formatAppointmentText(bookingDate, bookingTime) || undefined,
        note: bookingNote || undefined,
      });
      setBookingNote("");
      await loadConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book request");
    } finally {
      setSavingAction("");
    }
  };

  const addInternalNote = async () => {
    if (!internalNote.trim()) return;
    setSavingAction("internal_note");
    try {
      await api.frontdesk.createThreadNote(id, { note: internalNote });
      setInternalNote("");
      await loadConversation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSavingAction("");
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/dashboard/inbox")}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm transition-colors hover:text-slate-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Inbox
      </button>

      <PageHeader
        eyebrow={
          <>
            <MessageSquare className="h-3.5 w-3.5" />
            Thread workspace
          </>
        }
        title={conversation.customer_name}
        description="Review the full conversation, understand thread state, and move the patient forward without leaving the workspace."
      />

      <div className="workspace-split">
        <div className="flex-1 min-w-0">
          <div className="app-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-6 sm:px-6">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  {conversation.customer_name}
                </h1>
                <ChannelBadge channel={conversation.channel} withIcon />
                {isEventThread ? (
                  <CommunicationEventStatusBadge status={communicationEvent?.status ?? "new"} />
                ) : (
                  <FrontdeskStatusBadge status={conversation.derived_status} />
                )}
              </div>
              <p className="text-sm text-slate-500">
                {isEventThread ? "Logged" : "Started"}{" "}
                {conversation.conversation_started_at ? formatDateTime(conversation.conversation_started_at) : "recently"}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="app-card-muted px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Thread state</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {isEventThread ? "Operational event thread" : "Live conversation thread"}
                  </p>
                </div>
                <div className="app-card-muted px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Latest source</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 capitalize">
                    {conversation.channel}
                  </p>
                </div>
                <div className="app-card-muted px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Lead link</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {lead ? "Request linked" : "Still unlinked"}
                  </p>
                </div>
                <div className="app-card-muted px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Booking state</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {bookingSummary || "Not booked yet"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                  lead
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {lead ? "Linked request" : "Unlinked thread"}
                </span>
                {lead && <LeadStatusBadge status={lead.status} />}
                {lead?.appointment_status && (
                  <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                    lead.appointment_status === "confirmed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : lead.appointment_status === "request_open"
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {lead.appointment_status === "confirmed"
                      ? "Booked"
                      : lead.appointment_status.replace(/_/g, " ")}
                  </span>
                )}
                {lead?.reminder_status && lead.reminder_status !== "not_ready" && (
                  <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                    Reminder {lead.reminder_status.replace(/_/g, " ")}
                  </span>
                )}
                {lead?.deposit_status && lead.deposit_status !== "not_required" && (
                  <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                    lead.deposit_status === "paid"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : lead.deposit_status === "requested" || lead.deposit_status === "required"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : lead.deposit_status === "waived"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}>
                    {lead.deposit_status === "requested"
                      ? "Deposit requested"
                      : lead.deposit_status === "required"
                        ? "Deposit required"
                        : lead.deposit_status === "paid"
                          ? "Deposit paid"
                          : lead.deposit_status === "expired"
                            ? "Deposit expired"
                            : lead.deposit_status === "failed"
                              ? "Deposit failed"
                              : "Deposit waived"}
                  </span>
                )}
                {conversation.derived_status === "needs_follow_up" && (
                  <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                    Follow-up needed
                  </span>
                )}
                {isEventThread && conversation.channel === "sms" && (
                  <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                    pendingReviewEvent
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : conversation.manual_takeover
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : conversation.ai_auto_reply_enabled
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}>
                    {pendingReviewEvent
                      ? "Human review needed"
                      : conversation.manual_takeover
                        ? "Staff handling"
                        : conversation.ai_auto_reply_enabled
                          ? "AI active"
                          : "AI off"}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              {isEventThread ? (
                <div className="space-y-4">
                  {relatedEvents.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock3 className="w-4 h-4 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-900">
                          {communicationEvent?.event_type === "missed_call"
                            ? "Missed-call recovery"
                            : "Callback request"}
                        </p>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {communicationEvent?.summary || "Communication event recorded."}
                      </p>
                      {communicationEvent?.content && (
                        <p className="text-sm text-slate-500 leading-relaxed mt-2">
                          {communicationEvent.content}
                        </p>
                      )}
                    </div>
                  ) : (
                    relatedEvents.map((event) => {
                      const isSmsMessage = event.channel === "sms";
                      const isInbound = event.direction === "inbound";
                      if (!isSmsMessage) {
                        return (
                          <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                              <ChannelBadge channel={event.channel} withIcon />
                              <CommunicationEventStatusBadge status={event.status} />
                            </div>
                            <p className="text-sm font-semibold text-slate-900">
                              {event.summary || "Communication event recorded."}
                            </p>
                            {event.content && (
                              <p className="text-sm text-slate-600 leading-relaxed mt-2">
                                {event.content}
                              </p>
                            )}
                            <p className="text-[11px] text-slate-400 mt-2">
                              {event.occurred_at ? formatDateTime(event.occurred_at) : ""}
                            </p>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={event.id}
                          className={`flex ${isInbound ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                              isInbound
                                ? "bg-teal-600 text-white rounded-br-sm"
                                : "bg-slate-100 text-slate-700 rounded-bl-sm"
                            }`}
                          >
                            <p
                              className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${
                                isInbound ? "text-white/70" : "text-slate-400"
                              }`}
                            >
                              {smsSenderLabel(event.sender_kind, event.direction)}
                            </p>
                            {!isInbound && event.summary && (
                              <p
                                className={`text-[11px] mb-2 ${
                                  isInbound ? "text-white/70" : "text-slate-500"
                                }`}
                              >
                                {event.summary}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap">{event.content || event.summary}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <p
                                className={`text-[11px] ${
                                  isInbound ? "text-white/70" : "text-slate-400"
                                }`}
                              >
                                {event.occurred_at ? formatDateTime(event.occurred_at) : ""}
                              </p>
                              {!isInbound && (
                                <CommunicationEventStatusBadge status={event.status} />
                              )}
                            </div>
                            {!isInbound && (event.failure_reason || event.skipped_reason) && (
                              <p className="text-[11px] text-slate-400 mt-2">
                                {event.failure_reason || event.skipped_reason}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                    <div className="app-card-muted border-dashed px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                      Delivery state
                    </p>
                    {communicationEvent?.latest_outbound_status ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CommunicationEventStatusBadge status={communicationEvent.latest_outbound_status as typeof communicationEvent.status} />
                          <span className="text-xs text-slate-500">
                            {communicationEvent.latest_outbound_summary || "Latest text-back recorded."}
                          </span>
                        </div>
                        {communicationEvent.latest_outbound_reason && (
                          <p className="text-xs text-slate-500">{communicationEvent.latest_outbound_reason}</p>
                        )}
                        {communicationEvent.latest_inbound_summary && (
                          <p className="text-xs text-slate-500">
                            Latest reply: {communicationEvent.latest_inbound_summary}
                          </p>
                        )}
                      </div>
                    ) : communicationEvent?.auto_reply_reason ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <CommunicationEventStatusBadge status={communicationEvent.status} />
                          <span className="text-xs text-slate-500">
                            {communicationEvent.auto_reply_status === "blocked"
                              ? "AI reply held for staff review"
                              : "Latest delivery result"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{communicationEvent.auto_reply_reason}</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <CommunicationEventStatusBadge status={communicationEvent?.status ?? "new"} />
                        <span className="text-xs text-slate-500">
                          Two-way SMS will continue here once a patient replies. Manual send is available below.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="app-card-muted border-dashed px-4 py-5 text-sm text-slate-500">
                  {conversation.summary
                    ? conversation.summary
                    : "No message transcript is stored for this conversation yet."}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                        message.role === "user"
                          ? "bg-teal-600 text-white rounded-br-sm"
                          : "bg-slate-100 text-slate-700 rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-[11px] mt-2 ${
                          message.role === "user" ? "text-white/70" : "text-slate-400"
                        }`}
                      >
                        {message.created_at ? formatDateTime(message.created_at) : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="workspace-side-rail">
          <div className="app-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Customer
            </h2>
            <div className="space-y-3 text-sm min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <UserRound className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Name</p>
                  <p className="font-medium text-slate-900">{conversation.customer_name}</p>
                </div>
              </div>

              {conversation.customer_phone && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="font-medium text-slate-900">{conversation.customer_phone}</p>
                  </div>
                </div>
              )}

              {conversation.customer_email && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="font-medium text-slate-900">{conversation.customer_email}</p>
                  </div>
                </div>
              )}
            </div>

            {conversation.customer_key && (
              <Link
                href={`/dashboard/customers/${conversation.customer_key}`}
                className="inline-flex items-center gap-2 mt-5 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
              >
                <UserRound className="w-4 h-4" />
                Open customer profile
              </Link>
            )}
          </div>

            {conversation.customer_phone && (
            <div className="app-card p-4 sm:p-5">
              {isEventThread && conversation.channel === "sms" && (
                <div className="mb-4 pb-4 border-b border-slate-100">
                  <h2 className="text-sm font-semibold text-slate-900 mb-2">
                    AI auto-reply
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {pendingReviewEvent ? (
                      <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                        Human review needed
                      </span>
                    ) : conversation.manual_takeover ? (
                      <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                        Manual takeover
                      </span>
                    ) : conversation.ai_auto_reply_enabled ? (
                      <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                        AI active
                      </span>
                    ) : (
                      <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                        AI off
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {pendingReviewEvent
                      ? "Clinic AI drafted a reply but is waiting for staff review before sending anything else on this thread."
                      : conversation.manual_takeover
                      ? "New inbound SMS will wait for a team reply until AI is re-enabled for this thread."
                      : conversation.ai_auto_reply_ready
                        ? "Clinic AI can reply automatically here while your team can still step in at any time."
                        : "SMS auto-reply is unavailable until clinic SMS automation is ready."}
                  </p>
                  <button
                    onClick={() => updateThreadControl(!conversation.manual_takeover)}
                    disabled={savingAction === "takeover" || savingAction === "resume_ai" || (!conversation.ai_auto_reply_ready && !conversation.manual_takeover)}
                    className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                      conversation.manual_takeover
                        ? "text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                        : "text-amber-700 border border-amber-200 hover:bg-amber-50"
                    }`}
                  >
                    {conversation.manual_takeover
                      ? savingAction === "resume_ai"
                        ? "Enabling..."
                        : "Re-enable AI replies"
                      : savingAction === "takeover"
                        ? "Updating..."
                        : "Take over manually"}
                  </button>
                </div>
              )}

              {pendingReviewEvent && (
                <div className="mb-4 pb-4 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                      Human review needed
                    </span>
                    {pendingReviewEvent.ai_confidence && (
                      <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                        {pendingReviewEvent.ai_confidence} confidence
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {pendingReviewEvent.auto_reply_reason || "Clinic AI drafted a reply for staff review before sending."}
                  </p>
                  <textarea
                    rows={4}
                    value={reviewReplyBody}
                    onChange={(event) => setReviewReplyBody(event.target.value)}
                    className="app-input min-h-[7rem] resize-none"
                    placeholder="Review the drafted reply before sending"
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={sendSuggestedReply}
                      disabled={savingAction === "send_suggested" || !reviewReplyBody.trim()}
                      className="px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {savingAction === "send_suggested"
                        ? "Sending..."
                        : reviewReplyBody.trim() === pendingReviewEvent.suggested_reply_text
                          ? "Send draft"
                          : "Send edited draft"}
                    </button>
                    <button
                      onClick={discardSuggestedReply}
                      disabled={savingAction === "discard_suggested"}
                      className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      {savingAction === "discard_suggested" ? "Discarding..." : "Discard"}
                    </button>
                  </div>
                </div>
              )}

              <h2 className="text-sm font-semibold text-slate-900 mb-3">
                {isEventThread ? "Reply by SMS" : "Send SMS"}
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                {isEventThread
                  ? "Continue the same SMS thread from here. Delivery status will update in the conversation."
                  : "Send a real outbound text to this patient. Delivery status will be logged below."}
              </p>
              <textarea
                rows={4}
                value={smsBody}
                onChange={(event) => setSmsBody(event.target.value)}
                className="app-input min-h-[7rem] resize-none"
                placeholder="Write your message"
              />
              <button
                onClick={sendSms}
                disabled={savingAction === "sms" || !smsBody.trim()}
                className="mt-3 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                {savingAction === "sms" ? "Sending..." : "Send SMS"}
              </button>
            </div>
          )}

          {!isEventThread && relatedEvents.length > 0 && (
            <div className="app-card p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                SMS activity
              </h2>
              <div className="space-y-3">
                {relatedEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-slate-200 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <ChannelBadge channel={event.channel} withIcon />
                      {event.sender_kind === "assistant" && (
                        <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                          AI
                        </span>
                      )}
                      {event.sender_kind === "staff" && (
                        <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                          Manual
                        </span>
                      )}
                      <CommunicationEventStatusBadge status={event.status} />
                    </div>
                    <p className="text-sm font-medium text-slate-900">
                      {smsEventTitle(event.sender_kind, event.event_type)}
                    </p>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{event.content}</p>
                    {(event.failure_reason || event.skipped_reason) && (
                      <p className="text-xs text-slate-500 mt-2">{event.failure_reason || event.skipped_reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="app-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Front desk actions
            </h2>
            {!lead ? (
              <div className="space-y-3 mb-5">
                <p className="text-sm text-slate-600">
                  Convert this thread into a request so your team can track booking progress and reminders.
                </p>
                <input
                  type="text"
                  value={convertName}
                  onChange={(event) => setConvertName(event.target.value)}
                  placeholder="Patient name"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <div className="grid grid-cols-1 gap-3">
                  <input
                    type="tel"
                    value={convertPhone}
                    onChange={(event) => setConvertPhone(event.target.value)}
                    placeholder="Phone number"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                  <input
                    type="email"
                    value={convertEmail}
                    onChange={(event) => setConvertEmail(event.target.value)}
                    placeholder="Email address"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <input
                  type="text"
                  value={convertReason}
                  onChange={(event) => setConvertReason(event.target.value)}
                  placeholder="Reason for visit"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={convertToLead}
                    disabled={savingAction !== ""}
                    className="px-3 py-2 text-sm font-medium text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    {savingAction === "convert" ? "Converting..." : "Convert to lead"}
                  </button>
                  <button
                    onClick={createFollowUp}
                    disabled={savingAction !== ""}
                    className="px-3 py-2 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors disabled:opacity-50"
                  >
                    {savingAction === "follow_up" ? "Saving..." : "Create follow-up"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 mb-5">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateThreadStatus("contacted")}
                    disabled={savingAction !== ""}
                    className="px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    {savingAction === "contacted" ? "Saving..." : "Mark contacted"}
                  </button>
                  <button
                    onClick={() => updateThreadStatus("closed")}
                    disabled={savingAction !== ""}
                    className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {savingAction === "closed" ? "Saving..." : "Mark closed"}
                  </button>
                  <button
                    onClick={createFollowUp}
                    disabled={savingAction !== ""}
                    className="px-3 py-2 text-sm font-medium text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors disabled:opacity-50"
                  >
                    {savingAction === "follow_up" ? "Saving..." : "Create follow-up"}
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Book from thread</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Confirm the appointment time here and the request will become reminder-ready when applicable.
                      </p>
                    </div>
                    {bookingSummary && (
                      <span className="inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                        {bookingSummary}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(event) => setBookingDate(event.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                    <input
                      type="time"
                      value={bookingTime}
                      onChange={(event) => setBookingTime(event.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <input
                    type="text"
                    value={bookingReason}
                    onChange={(event) => setBookingReason(event.target.value)}
                    placeholder="Confirm reason for visit"
                    className="w-full mt-3 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                  <textarea
                    rows={3}
                    value={bookingNote}
                    onChange={(event) => setBookingNote(event.target.value)}
                    placeholder="Internal booking note"
                    className="w-full mt-3 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                  />
                  <button
                    onClick={bookFromThread}
                    disabled={savingAction !== ""}
                    className="mt-3 px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                  >
                    {savingAction === "book_thread" ? "Booking..." : "Confirm booking"}
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Internal note</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Save a staff note to this thread. Notes stay internal and appear in the customer history.
                  </p>
                  <textarea
                    rows={3}
                    value={internalNote}
                    onChange={(event) => setInternalNote(event.target.value)}
                    placeholder="Add a short internal note"
                    className="w-full mt-3 px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
                  />
                  <button
                    onClick={addInternalNote}
                    disabled={savingAction !== "" || !internalNote.trim()}
                    className="mt-3 px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {savingAction === "internal_note" ? "Saving..." : "Save note"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {isEventThread ? (
                <CommunicationEventStatusBadge status={communicationEvent?.status ?? "new"} />
              ) : (
                <FrontdeskStatusBadge status={conversation.derived_status} />
              )}
              {lead && <LeadStatusBadge status={lead.status} />}
            </div>

            {lead ? (
              <div className="space-y-3 text-sm text-slate-600">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Reason for visit</p>
                  <p>{lead.reason_for_visit || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Preferred time</p>
                  <p>{lead.preferred_datetime_text || "Not provided"}</p>
                </div>
                {lead.appointment_status && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Booking state</p>
                    <p>{lead.appointment_status.replace(/_/g, " ")}</p>
                  </div>
                )}
                {lead.reminder_status && lead.reminder_status !== "not_ready" && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Reminder readiness</p>
                    <p>
                      {lead.reminder_status.replace(/_/g, " ")}
                      {lead.reminder_scheduled_for ? ` · ${formatDateTime(lead.reminder_scheduled_for)}` : ""}
                    </p>
                  </div>
                )}
                {lead.notes && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Internal notes</p>
                    <p>{lead.notes}</p>
                  </div>
                )}
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  Open request detail
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500 leading-relaxed">
                {isEventThread
                  ? "This recovery thread is not linked to a request yet. You can still send SMS manually and convert it into a request when the patient is ready."
                  : "This conversation has not created a linked request yet. If the patient stopped before sharing details, it may need manual follow-up."}
              </p>
            )}
          </div>

          {internalNotes.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">
                Internal notes
              </h2>
              <div className="space-y-3">
                {internalNotes.slice(0, 5).map((event) => (
                  <div key={event.id} className="rounded-xl border border-slate-200 px-4 py-3">
                    <p className="text-sm text-slate-700 leading-relaxed">{event.content || event.summary}</p>
                    <p className="text-[11px] text-slate-400 mt-2">
                      {event.occurred_at ? formatDateTime(event.occurred_at) : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
