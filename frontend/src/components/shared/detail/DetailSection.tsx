"use client";

import type { ReactNode } from "react";

type DetailSectionProps = {
  readonly label: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly className?: string;
};

export function DetailSection({
  label,
  description,
  children,
  className = "",
}: DetailSectionProps) {
  return (
    <section className={`panel-surface rounded-[1.75rem] p-5 ${className}`.trim()}>
      <div className="mb-4">
        <h2 className="text-lg font-bold tracking-[-0.03em] text-app-text">{label}</h2>
        {description ? <p className="mt-2 text-sm leading-7 text-app-text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
