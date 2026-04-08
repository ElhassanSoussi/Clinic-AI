"use client";

import type { ReactNode } from "react";

interface SectionBlockProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly action?: ReactNode;
  readonly className?: string;
}

export function SectionBlock({ label, children, action, className = "" }: SectionBlockProps) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="workspace-section-label">{label}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
