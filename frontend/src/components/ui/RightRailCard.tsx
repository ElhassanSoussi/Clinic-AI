"use client";

import type { ReactNode } from "react";

interface RightRailCardProps {
  readonly title?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function RightRailCard({ title, children, className = "" }: RightRailCardProps) {
  return (
    <div className={`rounded-xl border border-slate-100 bg-white/90 px-4 py-3.5 shadow-sm ${className}`.trim()}>
      {title && (
        <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-300">{title}</h4>
      )}
      {children}
    </div>
  );
}
