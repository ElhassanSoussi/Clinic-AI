"use client";

import type { ReactNode } from "react";

interface RightRailCardProps {
  readonly title?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function RightRailCard({ title, children, className = "" }: RightRailCardProps) {
  return (
    <aside className={`panel-surface rounded-[1.75rem] p-5 ${className}`.trim()}>
      {title ? (
        <h2 className="mb-4 text-base font-bold tracking-[-0.03em] text-app-text">{title}</h2>
      ) : null}
      {children}
    </aside>
  );
}
