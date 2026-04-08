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
  slate: "bg-[#F4F6F9] text-[#64748B]",
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
    <div className="ds-card px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-medium text-[var(--color-app-text-muted)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-app-text)]">{value}</p>
          {detail ? (
            <p className="ds-muted-text mt-1.5 max-w-[16rem]">{detail}</p>
          ) : null}
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_STYLES[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
