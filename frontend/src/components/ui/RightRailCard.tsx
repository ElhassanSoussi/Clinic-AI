"use client";

import type { ReactNode } from "react";

interface RightRailCardProps {
  readonly title?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function RightRailCard({ title, children, className = "" }: RightRailCardProps) {
  return (
    <div className={`rounded-lg border border-[#E2E8F0] bg-white px-4 py-4 shadow-[0_1px_2px_rgb(15_23_42/0.05)] ${className}`.trim()}>
      {title && (
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#64748B]">{title}</h4>
      )}
      {children}
    </div>
  );
}
