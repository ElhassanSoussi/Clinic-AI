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
  teal: "bg-[#CCFBF1] text-[#0F766E]",
  violet: "bg-[#F1F5F9] text-[#64748B]",
  slate: "bg-[#F8FAFC] text-[#64748B]",
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
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-4 py-4 shadow-[0_1px_2px_rgb(15_23_42/0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#64748B]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[#0F172A]">{value}</p>
          {detail ? <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{detail}</p> : null}
        </div>
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${TONE_STYLES[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}
