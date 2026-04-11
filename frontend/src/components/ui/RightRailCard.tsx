"use client";

import type { ReactNode } from "react";

interface RightRailCardProps {
  readonly title?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function RightRailCard({ title, children, className = "" }: RightRailCardProps) {
  return (
    <aside className={`rounded-[1.05rem] border border-border/90 bg-card p-5 shadow-[var(--shadow-soft)] ${className}`.trim()}>
      {title ? (
        <h2 className="mb-4 text-base font-bold tracking-[-0.03em] text-foreground">{title}</h2>
      ) : null}
      {children}
    </aside>
  );
}
