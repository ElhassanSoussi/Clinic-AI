"use client";

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-xl border border-border/90 bg-card px-6 py-10 text-center shadow-[var(--shadow-soft)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-primary">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-foreground">{title}</h2>
      {description ? <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
