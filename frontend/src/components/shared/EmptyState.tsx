"use client";

import { Inbox } from "lucide-react";

interface EmptyStateProps {
  readonly icon?: React.ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-app-border)] bg-[var(--color-app-canvas)] px-6 py-12 text-center sm:py-14">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)] text-[var(--color-app-text-muted)] shadow-sm">
        {icon || <Inbox className="h-5 w-5" />}
      </div>
      <h3 className="text-base font-semibold text-[var(--color-app-text)]">{title}</h3>
      {description ? (
        <p className="ds-help-text mt-3 max-w-md">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
