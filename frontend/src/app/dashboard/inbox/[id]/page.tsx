"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
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
import { ChannelBadge, CommunicationEventStatusBadge, FrontdeskStatusBadge, getChannelConfig } from "@/components/shared/FrontdeskBadges";
import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import type { CommunicationEvent, ConversationDetail } from "@/types";
import {
  toDateInputValue,
  toTimeInputValue,
  combineDateTime,
  formatBookingText as formatAppointmentText,
  humanizeSnakeCase,
} from "@/lib/format-helpers";
import { ActionErrorBanner } from "@/components/shared/ActionErrorBanner";
import { EventTimeline, DeliveryStateCard } from "@/components/inbox/EventTimeline";
import { MessageList } from "@/components/inbox/MessageList";
import { ThreadBadgeStrip } from "@/components/inbox/ThreadBadgeStrip";
import { WorkspaceBand } from "@/components/shared/WorkspaceBand";
import { DetailSection } from "@/components/shared/detail/DetailSection";
import { OperationalCallout } from "@/components/shared/detail/OperationalCallout";
import { DetailBackLink } from "@/components/shared/detail/DetailBackLink";
import { inboxNextStepHint } from "@/lib/operational-hints";

function smsEventTitle(senderKind: string, eventType: string): string {
  if (eventType === "reminder") return "Appointment reminder";
  if (eventType === "text_back") return "Missed-call text-back";
  if (senderKind === "assistant") return "AI SMS reply";
  if (senderKind === "staff") return "Manual SMS reply";
  if (senderKind === "system") return "System SMS";
  return "SMS activity";
}

function deriveConvertName(detail: ConversationDetail): string {
  const leadName = detail.lead?.patient_name;
  if (leadName && leadName !== "Website chat visitor") {
    return leadName;
  }

  const customerName = detail.conversation.customer_name;
  if (customerName && customerName !== "Visitor") {
    return customerName;
  }

  return "";
}

function threadFollowUpPriority(
  isEventThread: boolean,
  eventChannel: string | undefined,
  derivedStatus: string
): "high" | "medium" {
  if (isEventThread && eventChannel === "missed_call") {
    return "high";
  }
  if (derivedStatus === "needs_follow_up") {
    return "high";
  }
  return "medium";
}

function smsAutomationSummary(
  hasPendingReview: boolean,
  manualTakeover: boolean,
  aiAutoReplyReady: boolean
): string {
  if (hasPendingReview) {
    return "Clinic AI drafted a reply but is waiting for staff review before sending anything else on this thread.";
  }
  if (manualTakeover) {
    return "New inbound SMS will wait for a team reply until AI is re-enabled for this thread.";
  }
  if (aiAutoReplyReady) {
    return "Clinic AI can reply automatically here while your team can still step in at any time.";
  }
  return "SMS auto-reply is unavailable until clinic SMS automation is ready.";
}


interface RightRailActionsProps {
  readonly detail: ConversationDetail;
  readonly isEventThread: boolean;
  readonly pendingReviewEvent: CommunicationEvent | null;
  readonly relatedEvents: CommunicationEvent[];
  readonly savingAction: string;
  readonly smsBody: string;
  readonly onSmsBodyChange: (value: string) => void;
  readonly reviewReplyBody: string;
  readonly onReviewReplyBodyChange: (value: string) => void;
  readonly convertName: string;
  readonly onConvertNameChange: (value: string) => void;
  readonly convertPhone: string;
  readonly onConvertPhoneChange: (value: string) => void;
  readonly convertEmail: string;
  readonly onConvertEmailChange: (value: string) => void;
  readonly convertReason: string;
  readonly onConvertReasonChange: (value: string) => void;
  readonly bookingDate: string;
  readonly onBookingDateChange: (value: string) => void;
  readonly bookingTime: string;
  readonly onBookingTimeChange: (value: string) => void;
  readonly bookingReason: string;
  readonly onBookingReasonChange: (value: string) => void;
  readonly bookingNote: string;
  readonly onBookingNoteChange: (value: string) => void;
  readonly internalNote: string;
  readonly onInternalNoteChange: (value: string) => void;
  readonly onSendSms: () => void;
  readonly onSendSuggestedReply: () => void;
  readonly onDiscardSuggestedReply: () => void;
  readonly onUpdateThreadControl: (manualTakeover: boolean) => void;
  readonly onConvertToLead: () => void;
  readonly onCreateFollowUp: () => void;
  readonly onUpdateThreadStatus: (status: "contacted" | "closed") => void;
  readonly onBookFromThread: () => void;
  readonly onAddInternalNote: () => void;
}

function RightRailActions({
  detail,
  isEventThread,
  pendingReviewEvent,
  relatedEvents,
  savingAction,
  smsBody,
  onSmsBodyChange,
  reviewReplyBody,
  onReviewReplyBodyChange,
  convertName,
  onConvertNameChange,
  convertPhone,
  onConvertPhoneChange,
  convertEmail,
  onConvertEmailChange,
  convertReason,
  onConvertReasonChange,
  bookingDate,
  onBookingDateChange,
  bookingTime,
  onBookingTimeChange,
  bookingReason,
  onBookingReasonChange,
  bookingNote,
  onBookingNoteChange,
  internalNote,
  onInternalNoteChange,
  onSendSms,
  onSendSuggestedReply,
  onDiscardSuggestedReply,
  onUpdateThreadControl,
  onConvertToLead,
  onCreateFollowUp,
  onUpdateThreadStatus,
  onBookFromThread,
  onAddInternalNote,
}: RightRailActionsProps) {
  const { conversation, lead, communication_event } = detail;
  const communicationEvent = communication_event ?? null;
  const bookingSummary =
    lead?.appointment_status === "confirmed" && lead.appointment_starts_at
      ? formatDateTime(lead.appointment_starts_at)
      : "";

  return (
    <>
      {conversation.customer_phone && (
        <div className="bg-card rounded-3xl p-4 sm:p-5">
          {isEventThread && conversation.channel === "sms" && (
            <SmsAutoReplySection
              conversation={conversation}
              pendingReviewEvent={pendingReviewEvent}
              savingAction={savingAction}
              reviewReplyBody={reviewReplyBody}
              onReviewReplyBodyChange={onReviewReplyBodyChange}
              onUpdateThreadControl={onUpdateThreadControl}
              onSendSuggestedReply={onSendSuggestedReply}
              onDiscardSuggestedReply={onDiscardSuggestedReply}
            />
          )}

          <h2 className="text-sm font-semibold text-foreground mb-3">
            {isEventThread ? "Reply by SMS" : "Send SMS"}
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            {isEventThread
              ? "Continue the same SMS thread from here. Delivery status will update in the conversation."
              : "Send a real outbound text to this patient. Delivery status will be logged below."}
          </p>
          <textarea
            rows={4}
            value={smsBody}
            onChange={(event) => onSmsBodyChange(event.target.value)}
            className="app-textarea min-h-28 resize-none"
            placeholder="Write your message"
          />
          <button
            onClick={onSendSms}
            disabled={savingAction === "sms" || !smsBody.trim()}
            className="mt-3 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:hover:bg-primary transition-colors disabled:opacity-50"
          >
            {savingAction === "sms" ? "Sending..." : "Send SMS"}
          </button>
        </div>
      )}

      {!isEventThread && relatedEvents.length > 0 && (
        <div className="bg-card rounded-3xl p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            SMS activity
          </h2>
          <div className="space-y-3">
            {relatedEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-border px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <ChannelBadge channel={event.channel} withIcon />
                  {event.sender_kind === "assistant" && (
                    <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                      AI
                    </span>
                  )}
                  {event.sender_kind === "staff" && (
                    <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                      Manual
                    </span>
                  )}
                  <CommunicationEventStatusBadge status={event.status} />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {smsEventTitle(event.sender_kind, event.event_type)}
                </p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{event.content}</p>
                {(event.failure_reason || event.skipped_reason) && (
                  <p className="text-xs text-muted-foreground mt-2">{event.failure_reason || event.skipped_reason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <FrontDeskActionsSection
        lead={lead ?? null}
        conversation={conversation}
        communicationEvent={communicationEvent}
        isEventThread={isEventThread}
        savingAction={savingAction}
        bookingSummary={bookingSummary}
        convertName={convertName}
        onConvertNameChange={onConvertNameChange}
        convertPhone={convertPhone}
        onConvertPhoneChange={onConvertPhoneChange}
        convertEmail={convertEmail}
        onConvertEmailChange={onConvertEmailChange}
        convertReason={convertReason}
        onConvertReasonChange={onConvertReasonChange}
        bookingDate={bookingDate}
        onBookingDateChange={onBookingDateChange}
        bookingTime={bookingTime}
        onBookingTimeChange={onBookingTimeChange}
        bookingReason={bookingReason}
        onBookingReasonChange={onBookingReasonChange}
        bookingNote={bookingNote}
        onBookingNoteChange={onBookingNoteChange}
        internalNote={internalNote}
        onInternalNoteChange={onInternalNoteChange}
        onConvertToLead={onConvertToLead}
        onCreateFollowUp={onCreateFollowUp}
        onUpdateThreadStatus={onUpdateThreadStatus}
        onBookFromThread={onBookFromThread}
        onAddInternalNote={onAddInternalNote}
      />
    </>
  );
}

interface SmsAutoReplySectionProps {
  readonly conversation: ConversationDetail["conversation"];
  readonly pendingReviewEvent: CommunicationEvent | null;
  readonly savingAction: string;
  readonly reviewReplyBody: string;
  readonly onReviewReplyBodyChange: (value: string) => void;
  readonly onUpdateThreadControl: (manualTakeover: boolean) => void;
  readonly onSendSuggestedReply: () => void;
  readonly onDiscardSuggestedReply: () => void;
}

function SmsAutoReplySection({
  conversation,
  pendingReviewEvent,
  savingAction,
  reviewReplyBody,
  onReviewReplyBodyChange,
  onUpdateThreadControl,
  onSendSuggestedReply,
  onDiscardSuggestedReply,
}: SmsAutoReplySectionProps) {
  const sendButtonLabel = (() => {
    if (savingAction === "send_suggested") return "Sending...";
    if (reviewReplyBody.trim() === pendingReviewEvent?.suggested_reply_text) return "Send draft";
    return "Send edited draft";
  })();

  const takeoverButtonLabel = (() => {
    if (conversation.manual_takeover) {
      return savingAction === "resume_ai" ? "Enabling..." : "Re-enable AI replies";
    }
    return savingAction === "takeover" ? "Updating..." : "Take over manually";
  })();

  return (
    <>
      <div className="mb-4 pb-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground mb-2">
          AI auto-reply status
        </h2>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <AiReplyStatusBadge
            pendingReview={!!pendingReviewEvent}
            manualTakeover={conversation.manual_takeover}
            aiEnabled={conversation.ai_auto_reply_enabled}
          />
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          {smsAutomationSummary(
            Boolean(pendingReviewEvent),
            conversation.manual_takeover,
            conversation.ai_auto_reply_ready
          )}
        </p>
        <button
          onClick={() => onUpdateThreadControl(!conversation.manual_takeover)}
          disabled={savingAction === "takeover" || savingAction === "resume_ai" || (!conversation.ai_auto_reply_ready && !conversation.manual_takeover)}
          className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${conversation.manual_takeover
            ? "text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
            : "text-amber-700 border border-amber-200 hover:bg-amber-50"
            }`}
        >
          {takeoverButtonLabel}
        </button>
      </div>

      {pendingReviewEvent && (
        <div className="mb-4 pb-4 border-b border-border">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200">
              Human review needed
            </span>
            {pendingReviewEvent.ai_confidence && (
              <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border bg-card-alt text-foreground border-border">
                {pendingReviewEvent.ai_confidence} confidence
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {pendingReviewEvent.auto_reply_reason || "The assistant drafted a reply and is waiting for staff approval before sending."}
          </p>
          <textarea
            rows={4}
            value={reviewReplyBody}
            onChange={(event) => onReviewReplyBodyChange(event.target.value)}
            className="app-textarea min-h-28 resize-none"
            placeholder="Review the drafted reply before sending"
          />
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={onSendSuggestedReply}
              disabled={savingAction === "send_suggested" || !reviewReplyBody.trim()}
              className="px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:hover:bg-primary transition-colors disabled:opacity-50"
            >
              {sendButtonLabel}
            </button>
            <button
              onClick={onDiscardSuggestedReply}
              disabled={savingAction === "discard_suggested"}
              className="px-4 py-2.5 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-card-alt transition-colors disabled:opacity-50"
            >
              {savingAction === "discard_suggested" ? "Discarding..." : "Discard"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function AiReplyStatusBadge({ pendingReview, manualTakeover, aiEnabled }: Readonly<{ pendingReview: boolean; manualTakeover: boolean; aiEnabled: boolean }>) {
  if (pendingReview) {
    return <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border bg-blue-50 text-blue-700 border-blue-200">Human review needed</span>;
  }
  if (manualTakeover) {
    return <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border bg-amber-50 text-amber-700 border-amber-200">Manual takeover</span>;
  }
  if (aiEnabled) {
    return <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">AI active</span>;
  }
  return <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border bg-card-alt text-foreground border-border">AI off</span>;
}

function LeadDetailPanel({ lead }: Readonly<{ lead: NonNullable<ConversationDetail["lead"]> }>) {
  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Reason for visit</p>
        <p>{lead.reason_for_visit || "Not provided yet — the patient may not have shared this."}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Preferred time</p>
        <p>{lead.preferred_datetime_text || "No preference given — staff can suggest a slot."}</p>
      </div>
      {lead.appointment_status && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Booking state</p>
          <p>{humanizeSnakeCase(lead.appointment_status)}</p>
        </div>
      )}
      {lead.reminder_status && lead.reminder_status !== "not_ready" && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Reminder readiness</p>
          <p>
            {humanizeSnakeCase(lead.reminder_status)}
            {lead.reminder_scheduled_for ? ` · ${formatDateTime(lead.reminder_scheduled_for)}` : ""}
          </p>
        </div>
      )}
      {lead.notes && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Staff notes</p>
          <p>{lead.notes}</p>
        </div>
      )}
      <Link
        href={`/dashboard/leads/${lead.id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        Open full request detail
      </Link>
    </div>
  );
}

interface FrontDeskActionsSectionProps {
  readonly lead: ConversationDetail["lead"] | null;
  readonly conversation: ConversationDetail["conversation"];
  readonly communicationEvent: CommunicationEvent | null;
  readonly isEventThread: boolean;
  readonly savingAction: string;
  readonly bookingSummary: string;
  readonly convertName: string;
  readonly onConvertNameChange: (value: string) => void;
  readonly convertPhone: string;
  readonly onConvertPhoneChange: (value: string) => void;
  readonly convertEmail: string;
  readonly onConvertEmailChange: (value: string) => void;
  readonly convertReason: string;
  readonly onConvertReasonChange: (value: string) => void;
  readonly bookingDate: string;
  readonly onBookingDateChange: (value: string) => void;
  readonly bookingTime: string;
  readonly onBookingTimeChange: (value: string) => void;
  readonly bookingReason: string;
  readonly onBookingReasonChange: (value: string) => void;
  readonly bookingNote: string;
  readonly onBookingNoteChange: (value: string) => void;
  readonly internalNote: string;
  readonly onInternalNoteChange: (value: string) => void;
  readonly onConvertToLead: () => void;
  readonly onCreateFollowUp: () => void;
  readonly onUpdateThreadStatus: (status: "contacted" | "closed") => void;
  readonly onBookFromThread: () => void;
  readonly onAddInternalNote: () => void;
}

function FrontDeskActionsSection({
  lead,
  conversation,
  communicationEvent,
  isEventThread,
  savingAction,
  bookingSummary,
  convertName,
  onConvertNameChange,
  convertPhone,
  onConvertPhoneChange,
  convertEmail,
  onConvertEmailChange,
  convertReason,
  onConvertReasonChange,
  bookingDate,
  onBookingDateChange,
  bookingTime,
  onBookingTimeChange,
  bookingReason,
  onBookingReasonChange,
  bookingNote,
  onBookingNoteChange,
  internalNote,
  onInternalNoteChange,
  onConvertToLead,
  onCreateFollowUp,
  onUpdateThreadStatus,
  onBookFromThread,
  onAddInternalNote,
}: FrontDeskActionsSectionProps) {
  return (
    <div className="bg-card rounded-3xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">
        Actions
      </h2>
      {lead ? null : (
        <div className="space-y-3 mb-5">
          <p className="text-sm text-muted-foreground">
            Link this thread to a booking request so your team can track status, send reminders, and follow up from one place.
          </p>
          <label className="sr-only" htmlFor="convert-name">
            Patient name
          </label>
          <input
            id="convert-name"
            type="text"
            value={convertName}
            onChange={(event) => onConvertNameChange(event.target.value)}
            placeholder="Patient name"
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:border-primary focus:ring-2 focus:ring-accent"
          />
          <div className="grid grid-cols-1 gap-3">
            <label className="sr-only" htmlFor="convert-phone">
              Phone number
            </label>
            <input
              id="convert-phone"
              type="tel"
              value={convertPhone}
              onChange={(event) => onConvertPhoneChange(event.target.value)}
              placeholder="Phone number"
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:border-primary focus:ring-2 focus:ring-accent"
            />
            <label className="sr-only" htmlFor="convert-email">
              Email address
            </label>
            <input
              id="convert-email"
              type="email"
              value={convertEmail}
              onChange={(event) => onConvertEmailChange(event.target.value)}
              placeholder="Email address"
              className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:border-primary focus:ring-2 focus:ring-accent"
            />
          </div>
          <label className="sr-only" htmlFor="convert-reason">
            Reason for visit
          </label>
          <input
            id="convert-reason"
            type="text"
            value={convertReason}
            onChange={(event) => onConvertReasonChange(event.target.value)}
            placeholder="Reason for visit"
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:border-primary focus:ring-2 focus:ring-accent"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onConvertToLead}
              disabled={savingAction !== ""}
              className="px-3 py-2 text-sm font-medium text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              {savingAction === "convert" ? "Converting..." : "Convert to lead"}
            </button>
            <button
              onClick={onCreateFollowUp}
              disabled={savingAction !== ""}
              className="px-3 py-2 text-sm font-medium text-primary border border-teal-200 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              {savingAction === "follow_up" ? "Saving..." : "Create follow-up"}
            </button>
          </div>
        </div>
      )}
      {lead && (
        <div className="space-y-4 mb-5">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onUpdateThreadStatus("contacted")}
              disabled={savingAction !== ""}
              className="px-3 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {savingAction === "contacted" ? "Saving..." : "Mark contacted"}
            </button>
            <button
              onClick={() => onUpdateThreadStatus("closed")}
              disabled={savingAction !== ""}
              className="px-3 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-card-alt transition-colors disabled:opacity-50"
            >
              {savingAction === "closed" ? "Saving..." : "Mark closed"}
            </button>
            <button
              onClick={onCreateFollowUp}
              disabled={savingAction !== ""}
              className="px-3 py-2 text-sm font-medium text-primary border border-teal-200 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
            >
              {savingAction === "follow_up" ? "Saving..." : "Create follow-up"}
            </button>
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Book from thread</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Confirm the appointment time here and the request will become reminder-ready when applicable.
                </p>
              </div>
              {bookingSummary && (
                <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                  {bookingSummary}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="sr-only" htmlFor="booking-date">
                Appointment date
              </label>
              <input
                id="booking-date"
                type="date"
                value={bookingDate}
                onChange={(event) => onBookingDateChange(event.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:border-primary focus:ring-2 focus:ring-accent"
              />
              <label className="sr-only" htmlFor="booking-time">
                Appointment time
              </label>
              <input
                id="booking-time"
                type="time"
                value={bookingTime}
                onChange={(event) => onBookingTimeChange(event.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:border-primary focus:ring-2 focus:ring-accent"
              />
            </div>
            <label className="sr-only" htmlFor="booking-reason">
              Confirm reason for visit
            </label>
            <input
              id="booking-reason"
              type="text"
              value={bookingReason}
              onChange={(event) => onBookingReasonChange(event.target.value)}
              placeholder="Confirm reason for visit"
              className="w-full mt-3 px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:border-primary focus:ring-2 focus:ring-accent"
            />
            <label className="sr-only" htmlFor="booking-note">
              Internal booking note
            </label>
            <textarea
              id="booking-note"
              rows={3}
              value={bookingNote}
              onChange={(event) => onBookingNoteChange(event.target.value)}
              placeholder="Internal booking note"
              className="w-full mt-3 px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:border-primary focus:ring-2 focus:ring-accent resize-none"
            />
            <button
              onClick={onBookFromThread}
              disabled={savingAction !== ""}
              className="mt-3 px-4 py-2.5 text-sm font-medium text-white bg-primary rounded-lg hover:hover:bg-primary transition-colors disabled:opacity-50"
            >
              {savingAction === "book_thread" ? "Booking..." : "Confirm booking"}
            </button>
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold text-foreground">Internal note</p>
            <p className="text-xs text-muted-foreground mt-1">
              Save a staff-only note to this thread. Notes are visible to your team but never shown to patients.
            </p>
            <label className="sr-only" htmlFor="internal-note">
              Add a short internal note
            </label>
            <textarea
              id="internal-note"
              rows={3}
              value={internalNote}
              onChange={(event) => onInternalNoteChange(event.target.value)}
              placeholder="Add a short internal note"
              className="w-full mt-3 px-3 py-2.5 text-sm border border-border rounded-lg bg-card focus:border-primary focus:ring-2 focus:ring-accent resize-none"
            />
            <button
              onClick={onAddInternalNote}
              disabled={savingAction !== "" || !internalNote.trim()}
              className="mt-3 px-4 py-2.5 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-card-alt transition-colors disabled:opacity-50"
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
        <LeadDetailPanel lead={lead} />
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isEventThread
            ? "This recovery thread is not linked to a booking request yet. You can reply by SMS and convert it to a request when the patient is ready."
            : "This conversation has not created a linked request yet. If the patient stopped before sharing details, consider following up manually."}
        </p>
      )}
    </div>
  );
}

export default function InboxThreadPage({
  params,
}: Readonly<{
  params: Promise<{ id: string }>;
}>) {
  const { id } = use(params);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
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
    setLoadError("");
    try {
      const data = await api.frontdesk.getConversation(id);
      setDetail(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load conversation");
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
    setConvertName(deriveConvertName(detail));
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
  if (loadError) return <ErrorState variant="calm" message={loadError} onRetry={loadConversation} />;
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
  const eventChannel = communicationEvent?.channel;
  const followUpPriority = threadFollowUpPriority(
    isEventThread,
    eventChannel,
    conversation.derived_status
  );

  const nextStep = inboxNextStepHint({
    isEventThread,
    eventChannel,
    channel: conversation.channel ?? "manual",
    pendingReview: Boolean(pendingReviewEvent),
    manualTakeover: conversation.manual_takeover,
    aiAutoReplyEnabled: conversation.ai_auto_reply_enabled,
    aiAutoReplyReady: conversation.ai_auto_reply_ready,
    hasLead: Boolean(lead),
    derivedStatus: conversation.derived_status,
  });

  const calloutToneMap: Record<string, "attention" | "information" | "neutral"> = {
    needs_follow_up: "attention",
    booked: "information",
  };
  const calloutTone = pendingReviewEvent
    ? "attention" as const
    : calloutToneMap[conversation.derived_status] ?? "neutral";

  const createFollowUp = async () => {
    setSavingAction("follow_up");
    try {
      await api.frontdesk.createFollowUp({
        source_key: isEventThread
          ? `communication:${communicationEvent?.id ?? id}`
          : `thread:${conversation.id}`,
        task_type: conversation.unlinked ? "abandoned_conversation" : "follow_up_needed",
        priority: followUpPriority,
        title: isEventThread && eventChannel === "missed_call"
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
      if (communicationEvent?.status === "new" && isEventThread) {
        await api.frontdesk.updateCommunicationEvent(communicationEvent.id, { status: "queued" });
      }
      await loadConversation();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create follow-up");
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
      setActionError(err instanceof Error ? err.message : "Failed to convert conversation to a lead");
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
      setActionError(err instanceof Error ? err.message : "Failed to send SMS");
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
      setActionError(err instanceof Error ? err.message : "Failed to update thread control");
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
      setActionError(err instanceof Error ? err.message : "Failed to send suggested reply");
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
      setActionError(err instanceof Error ? err.message : "Failed to discard suggested reply");
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
      setActionError(err instanceof Error ? err.message : "Failed to update thread");
    } finally {
      setSavingAction("");
    }
  };

  const bookFromThread = async () => {
    if (!lead) return;
    const appointment_starts_at = combineDateTime(bookingDate, bookingTime);
    if (!appointment_starts_at) {
      setActionError("Add an appointment date and time before marking this request as booked.");
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
      setActionError(err instanceof Error ? err.message : "Failed to book request");
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
      setActionError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSavingAction("");
    }
  };

  const channelLabel = getChannelConfig(conversation.channel ?? "manual").label;

  return (
    <div className="workspace-grid space-y-6 min-w-0">
      <PageHeader
        eyebrow={
          <>
            <MessageSquare className="h-3.5 w-3.5" />
            Inbox
          </>
        }
        title={conversation.customer_name}
        description={`${channelLabel} · Last activity ${conversation.last_message_at ? formatDateTime(conversation.last_message_at) : "not recorded"}`}
        showDivider
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {lead ? (
              <Link
                href={`/dashboard/leads/${lead.id}`}
                className="inline-flex min-h-10 items-center rounded-lg border border-teal-200 bg-accent px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent"
              >
                Open request
              </Link>
            ) : null}
            {conversation.customer_key ? (
              <Link
                href={`/dashboard/customers/${conversation.customer_key}`}
                className="inline-flex min-h-10 items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Customer profile
              </Link>
            ) : null}
          </div>
        }
      />

      <ActionErrorBanner message={actionError} onDismiss={() => setActionError("")} />

      <WorkspaceBand>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,17.5rem)] lg:items-stretch">
          <OperationalCallout title="Operational focus" headline={nextStep.title} tone={calloutTone}>
            {nextStep.body}
          </OperationalCallout>
          <div className="flex flex-col justify-center rounded-xl border border-border bg-card/90 px-4 py-3.5 sm:px-5">
            <p className="panel-section-head mb-2">At a glance</p>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Channel</dt>
                <dd className="font-medium text-foreground text-right">{channelLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Inbox status</dt>
                <dd className="text-right">
                  {isEventThread ? (
                    <CommunicationEventStatusBadge status={communicationEvent?.status ?? "new"} />
                  ) : (
                    <FrontdeskStatusBadge status={conversation.derived_status} />
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Request</dt>
                <dd className="font-medium text-foreground text-right">{lead ? "Linked" : "Not linked"}</dd>
              </div>
              {conversation.channel === "sms" ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">SMS control</dt>
                  <dd className="text-right text-xs font-medium text-foreground">
                    {(() => {
                      if (pendingReviewEvent) return "Review before send";
                      if (conversation.manual_takeover) return "Staff takeover";
                      if (conversation.ai_auto_reply_enabled) return "AI can reply";
                      return "AI off";
                    })()}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      </WorkspaceBand>

      <div className="grid gap-6 xl:grid-cols-[13rem_1fr_15rem]">
        <aside className="space-y-3 order-3 xl:order-0">
          <DetailBackLink href="/dashboard/inbox">Back to Inbox</DetailBackLink>

          <div className="bg-card rounded-3xl p-4 sm:p-5">
            <h2 className="panel-section-head mb-3">Participant</h2>
            <div className="space-y-2.5 text-sm min-w-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-alt">
                  <UserRound className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium text-foreground">{conversation.customer_name}</p>
                </div>
              </div>

              {conversation.customer_phone && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-alt">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium text-foreground">{conversation.customer_phone}</p>
                  </div>
                </div>
              )}

              {conversation.customer_email && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card-alt">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground">{conversation.customer_email}</p>
                  </div>
                </div>
              )}
            </div>

            {conversation.customer_key && (
              <Link
                href={`/dashboard/customers/${conversation.customer_key}`}
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold text-primary hover:text-primary transition-colors"
              >
                <UserRound className="w-3.5 h-3.5" />
                Open customer profile
              </Link>
            )}
          </div>

          {internalNotes.length > 0 && (
            <div className="bg-card rounded-3xl p-5">
              <h2 className="panel-section-head mb-4">Internal notes</h2>
              <div className="space-y-3">
                {internalNotes.slice(0, 5).map((event) => (
                  <div key={event.id} className="rounded-xl border border-border px-4 py-3">
                    <p className="text-sm text-foreground leading-relaxed">{event.content || event.summary}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {event.occurred_at ? formatDateTime(event.occurred_at) : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <div className="order-1 min-w-0 flex-1 xl:order-0">
          <div className="bg-card rounded-3xl overflow-hidden">
            <div className="border-b border-border px-5 py-5 sm:px-6">
              <p className="panel-section-head mb-2">Conversation workspace</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold text-foreground">Thread overview</span>
                <ChannelBadge channel={conversation.channel ?? "manual"} withIcon />
                {isEventThread ? (
                  <CommunicationEventStatusBadge status={communicationEvent?.status ?? "new"} />
                ) : (
                  <FrontdeskStatusBadge status={conversation.derived_status} />
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isEventThread ? "Logged" : "Started"}{" "}
                {conversation.conversation_started_at ? formatDateTime(conversation.conversation_started_at) : "recently"}
                {conversation.summary ? ` · ${conversation.summary}` : ""}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-card-alt px-3.5 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Thread type</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {isEventThread ? "Operational event" : "Live conversation"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card-alt px-3.5 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Channel</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{channelLabel}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card-alt px-3.5 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Booking snapshot</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {bookingSummary || "Not booked on this thread"}
                  </p>
                </div>
              </div>
              <ThreadBadgeStrip
                lead={lead ?? null}
                conversation={conversation}
                isEventThread={isEventThread}
                pendingReviewEvent={pendingReviewEvent}
              />
            </div>

            <div className="space-y-6 px-5 py-5 sm:px-6">
              {isEventThread && (
                <DetailSection
                  label="Event trace"
                  description="Delivery, hand-offs, and related SMS activity for this operational thread."
                >
                  <div className="space-y-4">
                    <EventTimeline relatedEvents={relatedEvents} communicationEvent={communicationEvent} />
                    <DeliveryStateCard communicationEvent={communicationEvent} />
                  </div>
                </DetailSection>
              )}
              {!isEventThread && messages.length === 0 && (
                <DetailSection label="Transcript" description="No stored messages yet — summary from the session if available.">
                  <div className="rounded-2xl border border-dashed border-border/70 bg-card-alt px-4 py-4 text-sm text-muted-foreground">
                    {conversation.summary || "No message transcript is stored for this conversation yet."}
                  </div>
                </DetailSection>
              )}
              {!isEventThread && messages.length > 0 && (
                <DetailSection
                  label="Transcript"
                  description="Chronological messages for this conversation. Actions and SMS tooling stay in the right column."
                >
                  <div className="rounded-2xl border border-border/60 bg-card-alt px-4 py-4 space-y-3">
                    <MessageList messages={messages} />
                  </div>
                </DetailSection>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-3 order-2 xl:order-0">
          <p className="panel-section-head">Respond &amp; pipeline</p>
          <RightRailActions
            detail={detail}
            isEventThread={isEventThread}
            pendingReviewEvent={pendingReviewEvent}
            relatedEvents={relatedEvents}
            savingAction={savingAction}
            smsBody={smsBody}
            onSmsBodyChange={setSmsBody}
            reviewReplyBody={reviewReplyBody}
            onReviewReplyBodyChange={setReviewReplyBody}
            convertName={convertName}
            onConvertNameChange={setConvertName}
            convertPhone={convertPhone}
            onConvertPhoneChange={setConvertPhone}
            convertEmail={convertEmail}
            onConvertEmailChange={setConvertEmail}
            convertReason={convertReason}
            onConvertReasonChange={setConvertReason}
            bookingDate={bookingDate}
            onBookingDateChange={setBookingDate}
            bookingTime={bookingTime}
            onBookingTimeChange={setBookingTime}
            bookingReason={bookingReason}
            onBookingReasonChange={setBookingReason}
            bookingNote={bookingNote}
            onBookingNoteChange={setBookingNote}
            internalNote={internalNote}
            onInternalNoteChange={setInternalNote}
            onSendSms={sendSms}
            onSendSuggestedReply={sendSuggestedReply}
            onDiscardSuggestedReply={discardSuggestedReply}
            onUpdateThreadControl={updateThreadControl}
            onConvertToLead={convertToLead}
            onCreateFollowUp={createFollowUp}
            onUpdateThreadStatus={updateThreadStatus}
            onBookFromThread={bookFromThread}
            onAddInternalNote={addInternalNote}
          />
        </aside>
      </div>
    </div>
  );
}
