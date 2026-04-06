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
    <section className={`overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm ${className}`.trim()}>
      {(title || description || action) && (
        <div className="flex flex-col gap-1.5 border-b border-slate-200/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-[13px] font-semibold text-slate-900">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      )}
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}
