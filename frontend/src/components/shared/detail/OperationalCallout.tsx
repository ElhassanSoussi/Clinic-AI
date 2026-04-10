"use client";

import type { ReactNode } from "react";

type OperationalCalloutProps = {
  readonly title: string;
  readonly headline?: string;
  readonly children: ReactNode;
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
    <aside className={`rounded-[1.5rem] border p-4 ${toneClass[tone]} ${className}`.trim()}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-text-muted">{title}</p>
      {headline ? <p className="mt-2 text-base font-semibold text-app-text">{headline}</p> : null}
      <div className="mt-2 text-sm leading-7 text-app-text-secondary">{children}</div>
    </aside>
  );
}
