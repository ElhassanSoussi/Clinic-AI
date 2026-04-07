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
    <section className={`overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgb(15_23_42/0.05)] ${className}`.trim()}>
      {(title || description || action) && (
        <div className="flex flex-col gap-1 border-b border-[#E2E8F0] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-medium text-[#0F172A]">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{description}</p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </div>
      )}
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}
