"use client";

import type { ReactNode } from "react";

interface RightRailCardProps {
  readonly title?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function RightRailCard({ title, children, className = "" }: RightRailCardProps) {
  return (
    <div className={`workspace-rail-card workspace-immersive-rail right-rail-shell px-4 py-4 sm:px-5 sm:py-5 ${className}`.trim()}>
      {title ? <h4 className="workspace-rail-title mb-3.5">{title}</h4> : null}
      {children}
    </div>
  );
}
