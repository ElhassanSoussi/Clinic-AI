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
      className={`min-w-0 rounded-xl border px-4 py-4 sm:px-5 sm:py-5 ${toneClass[tone]} ${className}`.trim()}
    >
      <p className="workspace-section-label">{title}</p>
      {headline ? (
        <p className="mt-2 text-base font-semibold leading-snug text-[var(--color-app-text)]">{headline}</p>
      ) : null}
      <div className="ds-help-text mt-2">{children}</div>
    </div>
  );
}
