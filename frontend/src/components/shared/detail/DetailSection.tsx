"use client";

import type { ReactNode } from "react";

type DetailSectionProps = {
  readonly label: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly className?: string;
};

/** Grouped block with platform section label and readable support copy. */
export function DetailSection({
  label,
  description,
  children,
  className = "",
}: DetailSectionProps) {
  return (
    <section className={`min-w-0 ${className}`.trim()}>
      <h2 className="workspace-section-label mb-2">{label}</h2>
      {description ? <p className="ds-help-text mb-3 max-w-2xl">{description}</p> : null}
      {children}
    </section>
  );
}
