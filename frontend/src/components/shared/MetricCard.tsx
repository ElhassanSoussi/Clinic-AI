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
  teal: "bg-[#ccfbf1] text-[#0f766e]",
  violet: "bg-[#f1edff] text-[#6d5bd0]",
  slate: "bg-[#eef2f7] text-[#5b6b7b]",
  amber: "bg-amber-50 text-[#D97706]",
  emerald: "bg-green-50 text-[#16A34A]",
  rose: "bg-red-50 text-[#DC2626]",
  blue: "bg-blue-50 text-[#2563EB]",
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "slate",
  detail,
}: Readonly<MetricCardProps>) {
  let displayValue: string | number = value;
  if (typeof value === "number") {
    displayValue = Number.isFinite(value) ? value : "—";
  }
  return (
    <div className="panel-surface rounded-[1.6rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="panel-section-head">{label}</p>
          <p className="mt-3 text-[2rem] font-bold tracking-[-0.055em] text-app-text">{displayValue}</p>
          {detail ? <p className="mt-2 text-xs leading-5 text-app-text-muted">{detail}</p> : null}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${TONE_STYLES[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
