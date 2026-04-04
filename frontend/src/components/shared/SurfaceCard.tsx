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
    <section className={`app-card app-gradient-border overflow-hidden ${className}`.trim()}>
      {(title || description || action) && (
        <div className="flex flex-col gap-4 border-b border-slate-100/80 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      )}
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}
