"use client";

import type { ReactNode } from "react";

type WorkspaceBandProps = {
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * Primary summary / context strip: uses the same surface treatment as the main
 * workspace frame so overview pages read as one system.
 */
export function WorkspaceBand({ children, className = "" }: WorkspaceBandProps) {
  return <div className={`workspace-main-frame px-5 py-5 sm:px-6 sm:py-6 min-w-0 ${className}`.trim()}>{children}</div>;
}
