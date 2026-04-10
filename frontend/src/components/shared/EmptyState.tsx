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
    <div className="panel-surface flex min-h-[16rem] flex-col items-center justify-center rounded-[2rem] px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-app-accent-wash text-app-accent-dark">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-app-text">{title}</h2>
      {description ? <p className="mt-3 max-w-xl text-sm leading-7 text-app-text-secondary">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
