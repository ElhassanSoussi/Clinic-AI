"use client";

import type { ReactNode } from "react";

type OperationalCalloutProps = {
  /** Small caps label (e.g. “Operational focus”). */
  readonly title: string;
  /** Optional bold line under the label. */
  readonly headline?: string;
  readonly children: ReactNode;
  /** neutral = slate, attention = amber, information = sky */
  readonly tone?: "neutral" | "attention" | "information";
  readonly className?: string;
};

const toneClass: Record<NonNullable<OperationalCalloutProps["tone"]>, string> = {
  neutral: "border-[#E2E8F0] bg-[#F8FAFC]",
  attention: "border-amber-200 bg-amber-50/80",
  information: "border-sky-200 bg-sky-50/80",
};

export function OperationalCallout({
  title,
  headline,
  children,
  tone = "neutral",
  className = "",
}: OperationalCalloutProps) {
  return (
    <div
      className={`rounded-xl border px-4 py-3.5 sm:px-5 sm:py-4 min-w-0 ${toneClass[tone]} ${className}`.trim()}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#64748B]">{title}</p>
      {headline ? (
        <p className="mt-1.5 text-base font-semibold leading-snug text-[#0F172A]">{headline}</p>
      ) : null}
      <div className="mt-1.5 text-sm leading-relaxed text-[#475569]">{children}</div>
    </div>
  );
}
