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
    <div className="app-page-header lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="app-page-kicker mb-4">{eyebrow}</div> : null}
        <h1 className="max-w-4xl text-[2.1rem] font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.6rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[1rem]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3 lg:justify-end">{actions}</div> : null}
    </div>
  );
}
