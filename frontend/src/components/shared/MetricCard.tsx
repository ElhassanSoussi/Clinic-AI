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
  const displayValue =
    typeof value === "number" ? (Number.isFinite(value) ? value : "—") : value;
  return (
    <div className="ds-card px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-[var(--color-app-text-muted)]">{label}</p>
          <p className="mt-2 text-[1.8rem] font-bold tracking-[-0.05em] text-[var(--color-app-text)] sm:text-[2rem]">
            {displayValue}
          </p>
          {detail ? (
            <p className="ds-muted-text mt-2 max-w-[16rem]">{detail}</p>
          ) : null}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 shadow-[0_10px_24px_-14px_rgba(15,23,42,0.55)] ${TONE_STYLES[tone]}`}
        >
          <Icon className="h-[1.125rem] w-[1.125rem]" />
        </div>
      </div>
    </div>
  );
}
