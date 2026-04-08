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
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-app-border-strong)] bg-gradient-to-b from-[var(--color-app-canvas)] to-[var(--color-app-elevated)] px-6 py-12 text-center shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] sm:py-16">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-app-border)] bg-[var(--color-app-surface)] text-[var(--color-app-primary-hover)] shadow-[var(--ds-shadow-md)]">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="ds-section-title max-w-md">{title}</h3>
      {description ? (
        <p className="ds-help-text mt-3 max-w-md">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
