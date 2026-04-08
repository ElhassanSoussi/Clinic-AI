"use client";

import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Extra classes on the header wrapper */
  className?: string;
  /** Subtle separator under the title block for page→workspace transition */
  showDivider?: boolean;
};

/**
 * Standard page chrome for authenticated (and similar) routes.
 * Uses app-page-* tokens from globals.css for platform-wide hierarchy.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
  showDivider = false,
}: Readonly<PageHeaderProps>) {
  return (
    <header
      className={`app-page-header ${showDivider ? "border-b border-[var(--color-app-border)] pb-6" : ""} ${className}`.trim()}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="ds-eyebrow mb-1 inline-flex flex-wrap items-center gap-1.5">{eyebrow}</div>
          ) : null}
          <h1 className="app-page-title max-w-4xl break-words">{title}</h1>
          {description ? (
            <p className="app-page-description mt-3 break-words">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3 lg:shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
