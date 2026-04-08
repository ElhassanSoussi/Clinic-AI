"use client";

import type { ReactNode } from "react";

type SurfaceCardProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Primary grouped panel for dashboard/settings-style content.
 * Matches app-card radius, border, and shadow from the design system.
 */
export function SurfaceCard({
  title,
  description,
  action,
  children,
  className = "",
}: Readonly<SurfaceCardProps>) {
  return (
    <section className={`ds-card overflow-hidden ${className}`.trim()}>
      {(title || description || action) && (
        <div className="ds-card-header flex flex-col gap-1 border-b border-[var(--color-app-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="ds-section-title">{title}</h2>
            ) : null}
            {description ? (
              <p className="ds-help-text mt-1 max-w-2xl">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      )}
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}
