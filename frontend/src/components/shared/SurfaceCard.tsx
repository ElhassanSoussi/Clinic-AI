"use client";

import type { ReactNode } from "react";

type SurfaceCardProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({
  title,
  description,
  action,
  children,
  className = "",
}: Readonly<SurfaceCardProps>) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] ${className}`.trim()}>
      {(title || description || action) && (
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            {title ? <h2 className="text-lg font-semibold tracking-[-0.04em] text-foreground">{title}</h2> : null}
            {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap gap-3">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
