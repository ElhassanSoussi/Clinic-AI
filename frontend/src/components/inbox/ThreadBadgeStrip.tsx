"use client";

import { LeadStatusBadge } from "@/components/shared/LeadStatusBadge";
import {
  humanizeSnakeCase,
  appointmentStatusClass,
  depositStatusClass,
  depositStatusLabel,
} from "@/lib/format-helpers";
import type { CommunicationEvent, ConversationDetail } from "@/types";

function appointmentBadgeLabel(status: string): string {
  return status === "confirmed" ? "Booked" : humanizeSnakeCase(status);
}

function smsAiStateClass(
  hasPendingReview: boolean,
  manualTakeover: boolean,
  aiAutoReplyEnabled: boolean
): string {
  if (hasPendingReview) return "bg-blue-50 text-blue-700 border-blue-200";
  if (manualTakeover) return "bg-amber-50 text-amber-700 border-amber-200";
  if (aiAutoReplyEnabled) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function smsAiStateLabel(
  hasPendingReview: boolean,
  manualTakeover: boolean,
  aiAutoReplyEnabled: boolean
): string {
  if (hasPendingReview) return "Human review needed";
  if (manualTakeover) return "Staff handling";
  if (aiAutoReplyEnabled) return "AI active";
  return "AI off";
}

export function ThreadBadgeStrip({ lead, conversation, pendingReviewEvent }: Readonly<{
  lead: ConversationDetail["lead"] | null;
  conversation: ConversationDetail["conversation"];
  /** Kept for call-site consistency; SMS/AI badges use `conversation.channel`. */
  isEventThread?: boolean;
  pendingReviewEvent: CommunicationEvent | null;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${lead
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
        {lead ? "Linked request" : "Unlinked thread"}
      </span>
      {lead && <LeadStatusBadge status={lead.status} />}
      {lead?.appointment_status && (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${appointmentStatusClass(lead.appointment_status)}`}>
          {appointmentBadgeLabel(lead.appointment_status)}
        </span>
      )}
      {lead?.reminder_status && lead.reminder_status !== "not_ready" && (
        <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          Reminder {humanizeSnakeCase(lead.reminder_status)}
        </span>
      )}
      {lead?.deposit_status && lead.deposit_status !== "not_required" && (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${depositStatusClass(lead.deposit_status)}`}>
          {depositStatusLabel(lead.deposit_status)}
        </span>
      )}
      {conversation.derived_status === "needs_follow_up" && (
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          Follow-up needed
        </span>
      )}
      {conversation.channel === "sms" && (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${smsAiStateClass(Boolean(pendingReviewEvent), conversation.manual_takeover, conversation.ai_auto_reply_enabled)}`}>
          {smsAiStateLabel(Boolean(pendingReviewEvent), conversation.manual_takeover, conversation.ai_auto_reply_enabled)}
        </span>
      )}
    </div>
  );
}
