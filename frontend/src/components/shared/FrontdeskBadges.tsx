"use client";

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

const CHANNEL_CONFIG: Record<string, { label: string; className: string }> = {
  web_chat: {
    label: "Web Chat",
    className: "bg-teal-50 text-teal-700 border-teal-200",
  },
  manual: {
    label: "Manual",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export function FrontdeskStatusBadge({
  status,
}: Readonly<{
  status: keyof typeof STATUS_CONFIG;
}>) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[11px] font-semibold rounded-full border ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function ChannelBadge({
  channel,
}: Readonly<{
  channel: string;
}>) {
  const config = CHANNEL_CONFIG[channel] ?? {
    label: channel.replace(/_/g, " "),
    className: "bg-slate-100 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-full border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
