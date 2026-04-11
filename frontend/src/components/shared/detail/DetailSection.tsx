"use client";

import type { ReactNode } from "react";

type DetailSectionProps = {
  label: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function DetailSection({
  label,
  description,
  action,
  children,
}: Readonly<DetailSectionProps>) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-[-0.04em] text-foreground">{label}</h3>
          {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-3">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
