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
  teal: "bg-teal-50/90 text-teal-700 border-teal-100",
  violet: "bg-violet-50/90 text-violet-700 border-violet-100",
  slate: "bg-slate-100/90 text-slate-700 border-slate-200",
  amber: "bg-amber-50/90 text-amber-700 border-amber-100",
  emerald: "bg-emerald-50/90 text-emerald-700 border-emerald-100",
  rose: "bg-rose-50/90 text-rose-700 border-rose-100",
  blue: "bg-blue-50/90 text-blue-700 border-blue-100",
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "slate",
  detail,
}: Readonly<MetricCardProps>) {
  return (
    <div className="app-card-muted p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-slate-950">{value}</p>
          {detail ? <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p> : null}
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-[1.15rem] border ${TONE_STYLES[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
