"use client";

import type { ReactNode } from "react";

type DetailSectionProps = {
  readonly label: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly className?: string;
};

/** Grouped block with dashboard-consistent section label (no extra card by default). */
export function DetailSection({
  label,
  description,
  children,
  className = "",
}: DetailSectionProps) {
  return (
    <section className={`min-w-0 ${className}`.trim()}>
      <h2 className="workspace-rail-title mb-2">{label}</h2>
      {description ? (
        <p className="mb-3 text-xs leading-relaxed text-[#64748B]">{description}</p>
      ) : null}
      {children}
    </section>
  );
}
