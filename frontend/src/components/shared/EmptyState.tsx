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
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-300">
        {icon || <Inbox className="w-4 h-4" />}
      </div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {description && (
        <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-slate-500">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
