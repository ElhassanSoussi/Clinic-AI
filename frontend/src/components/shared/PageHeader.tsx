"use client";

import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: Readonly<PageHeaderProps>) {
  return (
    <header className="mb-6 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="max-w-3xl text-2xl font-semibold tracking-tight text-[#0F172A]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#475569]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="mt-4 flex flex-wrap items-center gap-3 lg:mt-0">{actions}</div> : null}
    </header>
  );
}
