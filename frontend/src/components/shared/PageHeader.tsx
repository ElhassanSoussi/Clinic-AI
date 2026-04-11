"use client";

import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  showDivider?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
  showDivider = false,
}: Readonly<PageHeaderProps>) {
  return (
    <header className={`rounded-xl border border-border/90 bg-card px-6 py-5 shadow-[var(--shadow-soft)] ${className}`.trim()}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="panel-section-head mb-3">{eyebrow}</div>
          ) : null}
          <h1 className="text-[clamp(1.75rem,2vw,2.45rem)] font-bold tracking-[-0.045em] text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
      {showDivider ? <div className="mt-5 border-t border-border/70" /> : null}
    </header>
  );
}
