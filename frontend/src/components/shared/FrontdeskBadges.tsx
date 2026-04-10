"use client";

import {
  Headphones,
  MessageCircle,
  MessageSquareText,
  PhoneCall,
  PhoneMissed,
  Smartphone,
} from "lucide-react";
import type { ChannelType, CommunicationEvent, InboxConversation } from "@/types";

const STATUS_CONFIG = {
  open: {
    label: "Open",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  needs_follow_up: {
    label: "Needs Follow-Up",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  booked: {
    label: "Booked",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  handled: {
    label: "Handled",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
} as const;

const EVENT_STATUS_CONFIG: Record<CommunicationEvent["status"], { label: string; className: string }> = {
  new: {
    label: "New",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  queued: {
    label: "Queued",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  attempted: {
    label: "Attempted",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  sent: {
    label: "Sent",
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
  delivered: {
    label: "Delivered",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  skipped: {
    label: "Skipped",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  dismissed: {
    label: "Dismissed",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const CONNECTION_STATUS_CONFIG = {
  connected: {
    label: "Connected",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  ready_for_setup: {
    label: "Ready for Setup",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  not_connected: {
    label: "Not Connected",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
} as const;

const CHANNEL_CONFIG: Record<ChannelType, { label: string; className: string; icon: typeof MessageCircle }> = {
  web_chat: {
    label: "Web Chat",
    className: "bg-teal-50 text-teal-700 border-teal-200",
    icon: MessageCircle,
  },
  sms: {
    label: "SMS",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Smartphone,
  },
  whatsapp: {
    label: "WhatsApp",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: MessageSquareText,
  },
  missed_call: {
    label: "Missed Call",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: PhoneMissed,
  },
  callback_request: {
    label: "Callback Request",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: PhoneCall,
  },
  manual: {
    label: "Manual",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Headphones,
  },
};

export function getChannelConfig(channel: string) {
  const normalized = (channel || "manual") as ChannelType;
  return CHANNEL_CONFIG[normalized] ?? {
    label: channel.replace(/_/g, " ") || "Unknown",
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Headphones,
  };
}

export function getThreadStatusLabel(thread: Pick<InboxConversation, "thread_type" | "derived_status">) {
  return thread.thread_type === "event" ? "Recovery" : STATUS_CONFIG[thread.derived_status].label;
}

export function FrontdeskStatusBadge({
  status,
}: Readonly<{
  status: keyof typeof STATUS_CONFIG;
}>) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

export function CommunicationEventStatusBadge({
  status,
}: Readonly<{
  status: CommunicationEvent["status"];
}>) {
  const config = EVENT_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

export function ChannelConnectionStatusBadge({
  status,
}: Readonly<{
  status: keyof typeof CONNECTION_STATUS_CONFIG;
}>) {
  const config = CONNECTION_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

export function ChannelBadge({
  channel,
  withIcon = false,
}: Readonly<{
  channel: string;
  withIcon?: boolean;
}>) {
  const config = getChannelConfig(channel);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${config.className}`}>
      {withIcon ? <Icon className="h-3.5 w-3.5" /> : null}
      {config.label}
    </span>
  );
}
