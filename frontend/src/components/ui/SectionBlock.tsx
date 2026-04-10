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
    <section className={`panel-surface rounded-[1.75rem] p-5 ${className}`.trim()}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-app-text">{label}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
