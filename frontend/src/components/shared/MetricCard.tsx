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
    <div className="ds-card metric-card-shell px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--color-app-text-muted)]">{label}</p>
          <p className="mt-2.5 text-[1.95rem] font-bold tracking-[-0.065em] text-[var(--color-app-text)] sm:text-[2.2rem]">
            {displayValue}
          </p>
          {detail ? (
            <p className="ds-muted-text mt-2.5 max-w-[18rem] text-[0.9rem]">{detail}</p>
          ) : null}
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-white/70 shadow-[0_16px_28px_-16px_rgba(15,23,42,0.58)] ${TONE_STYLES[tone]}`}
        >
          <Icon className="h-[1.2rem] w-[1.2rem]" />
        </div>
      </div>
      <div className="mt-4 h-px w-full bg-[linear-gradient(90deg,rgba(148,163,184,0.08)_0%,rgba(148,163,184,0.45)_50%,rgba(148,163,184,0.08)_100%)]" />
    </div>
  );
}
