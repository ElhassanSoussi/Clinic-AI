"use client";

import { Clock3 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import {
  ChannelBadge,
  CommunicationEventStatusBadge,
} from "@/components/shared/FrontdeskBadges";
import type { CommunicationEvent } from "@/types";

function smsSenderLabel(senderKind: string, direction: string): string {
  if (direction === "inbound") return "Patient";
  if (senderKind === "assistant") return "AI assistant";
  if (senderKind === "system") return "System";
  return "Team member";
}

function eventHeaderTitle(eventType?: string): string {
  return eventType === "missed_call" ? "Missed-call recovery" : "Callback request";
}

export function EventTimeline({
  relatedEvents,
  communicationEvent,
}: Readonly<{
  relatedEvents: CommunicationEvent[];
  communicationEvent: CommunicationEvent | null;
}>) {
  if (relatedEvents.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock3 className="w-4 h-4 text-slate-400" />
          <p className="text-sm font-semibold text-slate-900">
            {eventHeaderTitle(communicationEvent?.event_type)}
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
    );
  }

  return relatedEvents.map((event) => {
    const isSmsMessage = event.channel === "sms";
    const isInbound = event.direction === "inbound";
    if (!isSmsMessage) {
      return (
        <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
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
          className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${isInbound
              ? "bg-teal-600 text-white rounded-br-sm"
              : "bg-slate-100 text-slate-700 rounded-bl-sm"
            }`}
        >
          <p
            className={`text-[11px] font-semibold uppercase tracking-wide mb-2 ${isInbound ? "text-white/70" : "text-slate-400"
              }`}
          >
            {smsSenderLabel(event.sender_kind, event.direction)}
          </p>
          {!isInbound && event.summary && (
            <p
              className={`text-[11px] mb-2 ${isInbound ? "text-white/70" : "text-slate-500"
                }`}
            >
              {event.summary}
            </p>
          )}
          <p className="whitespace-pre-wrap">{event.content || event.summary}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <p
              className={`text-[11px] ${isInbound ? "text-white/70" : "text-slate-400"
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
  });
}

function deliveryStateCaption(autoReplyStatus?: string): string {
  return autoReplyStatus === "blocked" ? "AI reply held for staff review" : "Latest delivery result";
}

export function DeliveryStateCard({ communicationEvent }: Readonly<{ communicationEvent: CommunicationEvent | null }>) {
  return (
    <div className="rounded-2xl border border-dashed border-app-border/70 bg-app-surface-alt px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
        Delivery state
      </p>
      <DeliveryStateContent communicationEvent={communicationEvent} />
    </div>
  );
}

function DeliveryStateContent({ communicationEvent }: Readonly<{ communicationEvent: CommunicationEvent | null }>) {
  if (communicationEvent?.latest_outbound_status) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CommunicationEventStatusBadge status={communicationEvent.latest_outbound_status as CommunicationEvent["status"]} />
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
    );
  }
  if (communicationEvent?.auto_reply_reason) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CommunicationEventStatusBadge status={communicationEvent.status} />
          <span className="text-xs text-slate-500">
            {deliveryStateCaption(communicationEvent.auto_reply_status)}
          </span>
        </div>
        <p className="text-xs text-slate-500">{communicationEvent.auto_reply_reason}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CommunicationEventStatusBadge status={communicationEvent?.status ?? "new"} />
      <span className="text-xs text-slate-500">
        Two-way SMS will continue here once a patient replies. Manual send is available below.
      </span>
    </div>
  );
}
