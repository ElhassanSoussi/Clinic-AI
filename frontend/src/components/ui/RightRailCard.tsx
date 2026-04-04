"use client";

import type { ReactNode } from "react";

interface RightRailCardProps {
  readonly title?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function RightRailCard({ title, children, className = "" }: RightRailCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white/90 p-5 shadow-sm ${className}`.trim()}>
      {title && (
        <h4 className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</h4>
      )}
      {children}
    </div>
  );
}
