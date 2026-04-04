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
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
