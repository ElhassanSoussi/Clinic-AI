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
    <div className="flex flex-col gap-1 pb-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="max-w-3xl text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="mt-3 flex flex-wrap items-center gap-2 lg:mt-0">{actions}</div> : null}
    </div>
  );
}
