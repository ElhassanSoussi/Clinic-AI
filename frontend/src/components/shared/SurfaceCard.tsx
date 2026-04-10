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
    <section className={`panel-surface overflow-hidden rounded-[1.9rem] p-6 ${className}`.trim()}>
      {(title || description || action) && (
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            {title ? <h2 className="text-lg font-bold tracking-[-0.04em] text-app-text">{title}</h2> : null}
            {description ? <p className="mt-1.5 text-sm leading-6 text-app-text-muted">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 flex-wrap gap-3">{action}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}
