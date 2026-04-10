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
    <header className={`panel-surface rounded-[1.9rem] px-6 py-6 ${className}`.trim()}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="panel-section-head mb-3">{eyebrow}</div>
          ) : null}
          <h1 className="text-[clamp(1.85rem,2.1vw,2.75rem)] font-bold tracking-[-0.055em] text-app-text">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-3xl text-sm leading-7 text-app-text-secondary">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
      </div>
      {showDivider ? <div className="mt-5 border-t border-app-border/70" /> : null}
    </header>
  );
}
