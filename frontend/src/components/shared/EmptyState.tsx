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
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#F8FAFC] text-[#CBD5E1]">
        {icon || <Inbox className="w-4 h-4" />}
      </div>
      <h3 className="text-sm font-medium text-[#0F172A]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#64748B]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
