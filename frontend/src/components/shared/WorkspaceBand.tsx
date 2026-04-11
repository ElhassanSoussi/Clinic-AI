"use client";

import type { ReactNode } from "react";

type WorkspaceBandProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

export function WorkspaceBand({ children, className = "" }: WorkspaceBandProps) {
  return (
    <div className={`bg-card rounded-[1.9rem] p-5 ${className}`.trim()}>
      {children}
    </div>
  );
}
