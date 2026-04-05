"use client";

import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "teal" | "violet" | "slate" | "amber" | "emerald" | "rose" | "blue";
  detail?: string;
};

const TONE_STYLES: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  teal: "bg-teal-50 text-teal-600",
  violet: "bg-violet-50 text-violet-600",
  slate: "bg-slate-50 text-slate-500",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  blue: "bg-blue-50 text-blue-600",
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "slate",
  detail,
}: Readonly<MetricCardProps>) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">{value}</p>
          {detail ? <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{detail}</p> : null}
        </div>
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${TONE_STYLES[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}
